TFCReader = function(buffer, fileName) {
    var data = new Uint8Array(buffer);
    var size = data.length;

    if (size < 40) { this.error = 'Not a TFC stream'; return; }
    var sign = '';
    for (var si = 0; si < 6; si++) sign += String.fromCharCode(data[si]);
    if (sign !== 'TFMcom') { this.error = 'Not a TFMcom stream'; return; }

    var intFreq = data[9];
    var offsets = [];
    for (var oi = 0; oi < 6; oi++) offsets.push(data[10 + oi * 2] | (data[11 + oi * 2] << 8));

    function readCString(off) {
        var s = '';
        while (off < size && data[off] !== 0) s += String.fromCharCode(data[off++]);
        return { str: s, end: off + 1 };
    }
    var st = readCString(34);
    var at = readCString(st.end);
    readCString(at.end);
    var trackName = st.str;
    var authorName = at.str;

    function ChannelData() {
        this.Offsets = [];
        this.Regs = [];
        this.Vals = [];
        this.Loop = 0;
    }
    ChannelData.prototype.AddFrame = function() { this.Offsets.push(this.Regs.length); };
    ChannelData.prototype.AddFrames = function(count) {
        var old = this.Offsets.length;
        this.Offsets.length = old + count - 1;
        for (var i = old; i < old + count - 1; i++) this.Offsets[i] = this.Regs.length;
    };
    ChannelData.prototype.AddRegister = function(reg, val) { this.Regs.push(reg); this.Vals.push(val); };
    ChannelData.prototype.SetLoop = function() { this.Loop = this.Offsets.length; };
    ChannelData.prototype.GetSize = function() { return this.Offsets.length; };
    ChannelData.prototype.Get = function(row) {
        var sz = this.Offsets.length;
        var r = row;
        if (row >= sz) {
            r = this.Loop + (row - sz) % (sz - this.Loop);
        }
        var start = this.Offsets[r];
        var end = r !== sz - 1 ? this.Offsets[r + 1] : this.Regs.length;
        var out = [];
        for (var i = start; i < end; i++) out.push([this.Regs[i], this.Vals[i]]);
        return out;
    };

    function Builder() {
        this.channels = [];
        for (var i = 0; i < 6; i++) this.channels.push(new ChannelData());
        this.channel = 0;
        this.frequency = [0, 0, 0, 0, 0, 0];
    }
    Builder.prototype.StartChannel = function(idx) { this.channel = idx; };
    Builder.prototype.StartFrame = function() { this.channels[this.channel].AddFrame(); };
    Builder.prototype.SetSkip = function(count) { this.channels[this.channel].AddFrames(count); };
    Builder.prototype.SetLoop = function() { this.channels[this.channel].SetLoop(); };
    Builder.prototype.SetSlide = function(slide) {
        var ch = this.channel;
        var oldFreq = this.frequency[ch];
        this.SetFreq((oldFreq & 0xff00) | ((oldFreq + slide) & 0xff));
    };
    Builder.prototype.SetKeyOff = function() {
        var key = this.channel < 3 ? this.channel : this.channel + 1;
        this.SetRegister(0x28, key);
    };
    Builder.prototype.SetFreq = function(freq) {
        var ch = this.channel;
        this.frequency[ch] = freq;
        var chan = ch % 3;
        this.SetRegister(0xa4 + chan, freq >> 8);
        this.SetRegister(0xa0 + chan, freq & 0xff);
    };
    Builder.prototype.SetRegister = function(idx, val) { this.channels[this.channel].AddRegister(idx, val); };
    Builder.prototype.SetKeyOn = function() {
        var key = this.channel < 3 ? this.channel : this.channel + 1;
        this.SetRegister(0x28, 0xf0 | key);
    };

    function fromBE(hi, lo) { var v = (hi << 8) | lo; return (v << 16) >> 16; }

    function Parser(data, len) {
        this.d = data;
        this.len = len;
    }
    Parser.prototype.Get = function(off) {
        if (off < 0 || off >= this.len) throw new Error('OOB ' + off);
        return this.d[off];
    };
    Parser.prototype.Get16 = function(off) { return (this.Get(off) << 8) | this.Get(off + 1); };
    Parser.prototype.ParseFrameControl = function(cursor, builder, ctx) {
        if (ctx.RepeatFrames && !--ctx.RepeatFrames) {
            cursor = ctx.RetAddr;
            ctx.RetAddr = 0;
        }
        for (;;) {
            var cmd = this.Get(cursor++);
            if (cmd === 0x7f) return 0;
            if (cmd === 0x7e) { builder.SetLoop(); continue; }
            if (cmd === 0xd0) {
                if (ctx.RepeatFrames !== 0) throw new Error('repeat active');
                if (ctx.RetAddr !== 0) throw new Error('retaddr active');
                ctx.RepeatFrames = this.Get(cursor++);
                var offset = fromBE(this.Get(cursor), this.Get(cursor + 1));
                ctx.RetAddr = cursor += 2;
                return this.Advance(cursor, offset);
            }
            return cursor - 1;
        }
    };
    Parser.prototype.Advance = function(cursor, offset) {
        if (offset >= 0) return cursor + offset;
        var back = -offset;
        if (cursor < back) throw new Error('underflow');
        return cursor - back;
    };
    Parser.prototype.ParseFrameCommands = function(cursor, builder) {
        var cmd = this.Get(cursor++);
        if (cmd === 0xbf) {
            var offset = fromBE(this.Get(cursor), this.Get(cursor + 1));
            cursor += 2;
            this.ParseFrameData(this.Advance(cursor, offset), builder);
        } else if (cmd === 0xff) {
            var offset = -256 + this.Get(cursor++);
            this.ParseFrameData(this.Advance(cursor, offset), builder);
        } else if (cmd >= 0xe0) {
            builder.SetSkip(256 - cmd);
        } else if (cmd >= 0xc0) {
            builder.SetSlide(cmd + 0x30);
        } else {
            cursor = this.ParseFrameData(cursor - 1, builder);
        }
        return cursor;
    };
    Parser.prototype.ParseFrameData = function(cursor, builder) {
        var dta = this.Get(cursor++);
        if (dta & 0xc0) builder.SetKeyOff();
        if (dta & 0x01) {
            var freq = (this.Get(cursor) << 8) | this.Get(cursor + 1);
            cursor += 2;
            builder.SetFreq(freq);
        }
        var regs = (dta & 0x3e) >> 1;
        for (var i = 0; i < regs; i++) {
            var reg = this.Get(cursor++);
            var val = this.Get(cursor++);
            builder.SetRegister(reg, val);
        }
        if (dta & 0x80) builder.SetKeyOn();
        return cursor;
    };

    var builder = new Builder();
    var parser = new Parser(data, size);
    var error = null;
    try {
        for (var chan = 0; chan < 6; chan++) {
            builder.StartChannel(chan);
            var ctx = { RetAddr: 0, RepeatFrames: 0 };
            var cursor = offsets[chan];
            var guard = 0;
            while (cursor !== 0) {
                if (++guard > (1 << 20)) { throw new Error('guard chan ' + chan); }
                cursor = parser.ParseFrameControl(cursor, builder, ctx);
                if (cursor) {
                    builder.StartFrame();
                    cursor = parser.ParseFrameCommands(cursor, builder);
                }
            }
        }
    } catch (e) {
        error = 'TFC parse error: ' + e.message;
    }
    if (error) { this.error = error; return; }

    var chans = builder.channels;
    var frameCount = 0;
    var loopFrame = 0;
    for (var ci = 0; ci < 6; ci++) {
        var sz = chans[ci].GetSize();
        if (sz > frameCount) frameCount = sz;
        if (ci === 0) loopFrame = chans[ci].Loop;
    }

    var frame = 0;

    this.getFrameCount = function() { return frameCount; };
    this.getFrameRate = function() { return intFreq; };
    this.getClockRate = function() { return 3500000; };
    this.getNumChips = function() { return 2; };
    this.getTurbo = function() { return true; };
    this.getNumPositions = function() { return 0; };
    this.getLoopPos = function() { return -1; };
    this.getDelay = function() { return 0; };
    this.getLoopFrame = function() { return loopFrame; };
    this.computeLoopFrame = function() { return loopFrame; };
    this.getChipType = function() { return 'opn'; };
    this.getTrackFileName = function() { return fileName || ''; };
    this.getTrackName = function() { return trackName; };
    this.getAuthorName = function() { return authorName; };

    this.getNextFrame = function() {
        var c0 = [];
        var c1 = [];
        var f = frame;
        if (f < frameCount) {
            var r;
            var j;
            for (var ch = 0; ch < 3; ch++) {
                r = chans[ch].Get(f);
                for (j = 0; j < r.length; j++) c0.push(r[j]);
            }
            for (var ch2 = 3; ch2 < 6; ch2++) {
                r = chans[ch2].Get(f);
                for (j = 0; j < r.length; j++) c1.push(r[j]);
            }
            frame++;
        }
        return [c0, c1, [], f >= frameCount];
    };

    this.setProgress = function(k) {
        frame = Math.max(0, Math.min(frameCount, Math.round(k * frameCount)));
    };

    this.reset = function() {
        frame = 0;
    };
};
if (typeof module !== 'undefined' && module.exports) { module.exports = {TFC: TFCReader}; }
