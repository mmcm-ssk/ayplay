PT2Reader = function(buffer, fileName) {
    var data = new Uint8Array(buffer);
    function u16(off) { return data[off] | (data[off + 1] << 8); }
    function i8(off) { var v = data[off]; return v >= 0x80 ? v - 0x100 : v; }

    var PT2_TONES = [
        0x0ef8,0x0e10,0x0d60,0x0c80,0x0bd8,0x0b28,0x0a88,0x09f0,0x0960,0x08e0,0x0858,0x07e0,
        0x077c,0x0708,0x06b0,0x0640,0x05ec,0x0594,0x0544,0x04f8,0x04b0,0x0470,0x042c,0x03fd,
        0x03be,0x0384,0x0358,0x0320,0x02f6,0x02ca,0x02a2,0x027c,0x0258,0x0238,0x0216,0x01f8,
        0x01df,0x01c2,0x01ac,0x0190,0x017b,0x0165,0x0151,0x013e,0x012c,0x011c,0x010a,0x00fc,
        0x00ef,0x00e1,0x00d6,0x00c8,0x00bd,0x00b2,0x00a8,0x009f,0x0096,0x008e,0x0085,0x007e,
        0x0077,0x0070,0x006b,0x0064,0x005e,0x0059,0x0054,0x004f,0x004b,0x0047,0x0042,0x003f,
        0x003b,0x0038,0x0035,0x0032,0x002f,0x002c,0x002a,0x0027,0x0025,0x0023,0x0021,0x001f,
        0x001d,0x001c,0x001a,0x0019,0x0017,0x0016,0x0015,0x0013,0x0012,0x0011,0x0010,0x000f
    ];

    var CLOCK = 1750000;
    var FRAME_RATE = 50;
    var LIMITER = 0x7FFFFFFF;
    var MAX_CMDS = 256;

    var tempo = Math.max(data[0], 2);
    var musLen = data[1];
    var loopPos = data[2];

    var samPtrs = new Uint16Array(32);
    for (var i = 0; i < 32; i++) samPtrs[i] = u16(3 + i * 2);

    var ornPtrs = new Uint16Array(16);
    for (var i = 0; i < 16; i++) ornPtrs[i] = u16(67 + i * 2);

    var patPtr = u16(99);

    var trackName = '';
    for (var i = 101; i < 131 && data[i] >= 0x20; i++) trackName += String.fromCharCode(data[i]);
    trackName = trackName.trim();

    var positions = [];
    for (var i = 131; i < data.length; i++) {
        if (data[i] === 0xFF) break;
        if (data[i] < 32) positions.push(data[i]);
    }
    var numPositions = positions.length || 1;

    function parseSample(idx) {
        if (!samPtrs[idx]) return { lines: [{level:0,noise:0,toneMask:true,noiseMask:true,vibrato:0}], size: 1, loop: 0 };
        var off = samPtrs[idx];
        if (off + 2 >= data.length) return { lines: [{level:0,noise:0,toneMask:true,noiseMask:true,vibrato:0}], size: 1, loop: 0 };
        var size = data[off];
        var loop = data[off + 1];
        var lines = [];
        for (var j = 0; j < size; j++) {
            var loff = off + 2 + j * 3;
            if (loff + 2 >= data.length) break;
            var b0 = data[loff], b1 = data[loff + 1], b2 = data[loff + 2];
            var vibrato = ((b1 & 0x0F) << 8) | b2;
            if (!(b0 & 4)) vibrato = -vibrato;
            lines.push({
                level: (b1 >> 4) & 0x0F,
                noise: (b0 >> 3) & 0x1F,
                toneMask: !!(b0 & 2),
                noiseMask: !!(b0 & 1),
                vibrato: vibrato
            });
        }
        if (!lines.length) lines.push({level:0,noise:0,toneMask:true,noiseMask:true,vibrato:0});
        return { lines: lines, size: lines.length, loop: lines.length > 1 ? Math.min(loop, lines.length - 1) : 0 };
    }

    function parseOrnament(idx) {
        if (!ornPtrs[idx]) return { lines: [0], size: 1, loop: 0 };
        var off = ornPtrs[idx];
        if (off + 2 >= data.length) return { lines: [0], size: 1, loop: 0 };
        var size = data[off];
        var loop = data[off + 1];
        var lines = [];
        for (var j = 0; j < size; j++) {
            var loff = off + 2 + j;
            if (loff >= data.length) break;
            lines.push(i8(loff));
        }
        if (!lines.length) lines.push(0);
        return { lines: lines, size: lines.length, loop: lines.length > 1 ? Math.min(loop, lines.length - 1) : 0 };
    }

    var samples = [];
    for (var i = 0; i < 32; i++) samples[i] = parseSample(i);

    var ornaments = [];
    for (var i = 0; i < 16; i++) ornaments[i] = parseOrnament(i);

    function makeChannel() {
        return {
            enabled: false,
            envelope: false,
            note: 0,
            sampleNum: 0,
            posInSample: 0,
            ornamentNum: 0,
            posInOrnament: 0,
            volume: 15,
            noiseAdd: 0,
            sliding: 0,
            slidingTarget: LIMITER,
            glissade: 0,
            period: 0,
            skipCounter: 0,
            cmdOffset: 0,
            nextCmdOffset: 0
        };
    }

    var loopFrameAt = 0;
    var hasLooped = false;

    var inst = {
        delay: tempo,
        delayCounter: 1,
        currentPosition: 0,
        noiseBase: 0,
        globalTick: 0,
        looped: false,
        envType: 0,
        envFreq: 0,
        envChanged: false,
        channels: [makeChannel(), makeChannel(), makeChannel()],
        ay: new Array(14)
    };

    for (var i = 0; i < 14; i++) inst.ay[i] = 0;

    function processCommand(chan) {
        if (chan.cmdOffset >= data.length) return false;
        var cmd = data[chan.cmdOffset++];

        if (cmd === 0) return true;

        if (cmd >= 0xE1) {
            chan.sampleNum = cmd - 0xE0;
            chan.posInSample = 0;
            chan.enabled = true;
            return true;
        }
        if (cmd === 0xE0) {
            chan.enabled = false;
            chan.sliding = 0;
            chan.glissade = 0;
            chan.slidingTarget = LIMITER;
            chan.posInSample = 0;
            chan.posInOrnament = 0;
            return false;
        }
        if (cmd >= 0x80) {
            chan.note = cmd - 0x80;
            chan.enabled = true;
            chan.sliding = 0;
            chan.glissade = 0;
            chan.slidingTarget = LIMITER;
            chan.posInSample = 0;
            chan.posInOrnament = 0;
            return false;
        }
        if (cmd === 0x7F) {
            chan.envelope = false;
            return true;
        }
        if (cmd >= 0x71) {
            inst.envType = (cmd - 0x70) & 0x0F;
            inst.envFreq = u16(chan.cmdOffset);
            chan.cmdOffset += 2;
            chan.envelope = true;
            inst.envChanged = true;
            return true;
        }
        if (cmd === 0x70) {
            return false;
        }
        if (cmd >= 0x60 && cmd <= 0x6E) {
            chan.ornamentNum = cmd - 0x60;
            chan.posInOrnament = 0;
            return true;
        }
        if (cmd >= 0x20 && cmd <= 0x5F) {
            chan.period = cmd - 0x20;
            return true;
        }
        if (cmd >= 0x10 && cmd <= 0x1F) {
            chan.volume = cmd - 0x10;
            return true;
        }
        if (cmd === 0x0F) {
            var newTempo = data[chan.cmdOffset++];
            if (newTempo >= 2) inst.delay = newTempo;
            return true;
        }
        if (cmd === 0x0E) {
            chan.glissade = i8(chan.cmdOffset++);
            chan.slidingTarget = LIMITER;
            return true;
        }
        if (cmd === 0x0D) {
            chan.sliding = 0;
            chan.glissade = i8(chan.cmdOffset++);
            chan.slidingTarget = u16(chan.cmdOffset);
            chan.cmdOffset += 2;
            return true;
        }
        if (cmd === 0x0C) {
            chan.glissade = 0;
            return true;
        }
        if (cmd >= 0x01 && cmd <= 0x0B) {
            chan.noiseAdd = i8(chan.cmdOffset++);
            return true;
        }
        return true;
    }

    function advanceChannel(chan) {
        chan.cmdOffset = chan.nextCmdOffset;
        var cmdCount = 0;
        while (processCommand(chan)) {
            if (++cmdCount >= MAX_CMDS) break;
        }
        chan.nextCmdOffset = chan.cmdOffset;
    }

    function isPatternDone() {
        for (var c = 0; c < 3; c++) {
            var chan = inst.channels[c];
            if (chan.skipCounter > 0) continue;
            if (chan.nextCmdOffset >= data.length) return true;
            if (c === 0 && data[chan.nextCmdOffset] === 0x00) return true;
        }
        return false;
    }

    function renderChannels() {
        var mixer = 0;

        for (var c = 0; c < 3; c++) {
            var chan = inst.channels[c];
            if (!chan.enabled) {
                inst.ay[8 + c] = 0;
                mixer |= (1 << c) | (1 << (c + 3));
                continue;
            }

            var sam = samples[chan.sampleNum] || samples[0];
            var samLine = sam.lines[chan.posInSample] || sam.lines[0];
            var orn = ornaments[chan.ornamentNum] || ornaments[0];
            var ornVal = orn.lines[chan.posInOrnament] || 0;

            var noteVal = chan.note + ornVal;
            if (noteVal < 0) noteVal = 0;
            if (noteVal > 95) noteVal = 95;

            var tone = PT2_TONES[noteVal] + chan.sliding + samLine.vibrato;
            tone = tone & 0xFFF;
            if (tone < 1) tone = 1;

            var vol = ((chan.volume * 17 + (chan.volume > 7 ? 1 : 0)) * samLine.level) >> 8;
            if (chan.envelope) vol |= 0x10;

            inst.ay[c * 2] = tone & 0xFF;
            inst.ay[c * 2 + 1] = (tone >> 8) & 0x0F;
            inst.ay[8 + c] = vol & 0x1F;

            if (samLine.toneMask) mixer |= (1 << c);
            if (samLine.noiseMask) mixer |= (1 << (c + 3));

            if (!samLine.noiseMask) {
                inst.noiseBase = (samLine.noise + chan.noiseAdd) & 0x1F;
            }

            if (chan.slidingTarget !== LIMITER) {
                var targetTone = PT2_TONES[chan.slidingTarget] || 0;
                var currentTone = PT2_TONES[chan.note] || 0;
                var absRange = targetTone - currentTone;
                var realRange = absRange - (chan.sliding + chan.glissade);
                if ((chan.glissade > 0 && realRange <= 0) || (chan.glissade < 0 && realRange >= 0)) {
                    chan.note = chan.slidingTarget;
                    chan.slidingTarget = LIMITER;
                    chan.sliding = chan.glissade = 0;
                }
            }
            chan.sliding += chan.glissade;

            chan.posInSample++;
            if (chan.posInSample >= sam.size) chan.posInSample = sam.loop;
            chan.posInOrnament++;
            if (chan.posInOrnament >= orn.size) chan.posInOrnament = orn.loop;
        }

        inst.ay[6] = inst.noiseBase & 0x1F;
        inst.ay[7] = mixer;
        inst.ay[11] = inst.envFreq & 0xFF;
        inst.ay[12] = (inst.envFreq >> 8) & 0xFF;
        if (inst.envChanged) {
            inst.ay[13] = inst.envType & 0x0F;
            inst.envChanged = false;
        }
    }

    function renderTick() {
        inst.ay[13] = 0xFF;
        inst.delayCounter--;

        if (inst.delayCounter > 0) {
            renderChannels();
            return;
        }

        inst.delayCounter = inst.delay;

        if (isPatternDone()) {
            inst.currentPosition++;
            if (inst.currentPosition >= numPositions) {
                renderChannels();
                return;
            }
            initPosition(inst.currentPosition);
            for (var c = 0; c < 3; c++) {
                var chan = inst.channels[c];
                advanceChannel(chan);
                chan.skipCounter = chan.period;
            }
            renderChannels();
            return;
        }

        for (var c = 0; c < 3; c++) {
            var chan = inst.channels[c];
            if (chan.skipCounter > 0) {
                chan.skipCounter--;
                continue;
            }
            advanceChannel(chan);
            chan.skipCounter = chan.period;
        }

        renderChannels();
    }

    function initState() {
        inst.delay = tempo;
        inst.delayCounter = 1;
        inst.currentPosition = 0;
        inst.noiseBase = 0;
        inst.globalTick = 0;
        inst.looped = false;
        inst.envType = 0;
        inst.envFreq = 0;
        inst.envChanged = false;
        hasLooped = false;
        loopFrameAt = 0;

        for (var i = 0; i < 14; i++) inst.ay[i] = 0;

        for (var c = 0; c < 3; c++) {
            var chan = inst.channels[c];
            chan.enabled = false;
            chan.envelope = false;
            chan.note = 0;
            chan.sampleNum = 0;
            chan.posInSample = 0;
            chan.ornamentNum = 0;
            chan.posInOrnament = 0;
            chan.volume = 15;
            chan.noiseAdd = 0;
            chan.sliding = 0;
            chan.slidingTarget = LIMITER;
            chan.glissade = 0;
            chan.period = 0;
            chan.skipCounter = 0;

            var patIdx = positions[0] || 0;
            var patOff = patPtr + patIdx * 6;
            chan.cmdOffset = u16(patOff + c * 2);
            chan.nextCmdOffset = chan.cmdOffset;
        }
    }

    function initPosition(pos) {
        for (var c = 0; c < 3; c++) {
            var chan = inst.channels[c];
            chan.period = 0;
            chan.skipCounter = 0;
            if (pos < numPositions && positions[pos] !== undefined) {
                var patIdx = positions[pos];
                var patOff = patPtr + patIdx * 6;
                chan.cmdOffset = u16(patOff + c * 2);
                chan.nextCmdOffset = chan.cmdOffset;
            }
        }
    }

    var estimatedFrames = numPositions > 0 ? numPositions * 64 * tempo : 50 * 15;
    if (estimatedFrames < 50) estimatedFrames = 50;
    if (estimatedFrames > 500000) estimatedFrames = 500000;

    initState();

    this.getFrameCount = function() { return estimatedFrames; };
    this.getLoopFrame = function() { return loopFrameAt; };
    this.getFrameRate = function() { return FRAME_RATE; };
    this.getClockRate = function() { return CLOCK; };
    this.getTrackFileName = function() { return fileName || ''; };
    this.getTrackName = function() { return trackName; };
    this.getAuthorName = function() { return ''; };
    this.getTurbo = function() { return false; };
    this.getNumPositions = function() { return numPositions; };
    this.getLoopPos = function() { return loopPos; };
    this.getDelay = function() { return tempo; };
    this.reset = function() { initState(); };

    this.computeLoopFrame = function() {
        var savedFrames = estimatedFrames;
        if (savedFrames > 100000) savedFrames = 100000;
        initState();
        for (var i = 0; i < savedFrames; i++) {
            var r = this.getNextFrame();
            if (r[3]) {
                var lf = i + 1;
                initState();
                return lf;
            }
        }
        initState();
        return 0;
    };

    this.setProgress = function(k) {
        if (k < 0) k = 0; if (k > 1) k = 1;
        var saved = Math.floor(k * estimatedFrames);
        if (Math.abs(inst.globalTick - saved) <= 1) return;
        initState();
        for (var i = 0; i < saved; i++) {
            this.getNextFrame();
            if (inst.looped) {
                inst.looped = false;
                inst.currentPosition = loopPos < numPositions ? loopPos : 0;
                initPosition(inst.currentPosition);
            }
        }
    };

    this.getNextFrame = function() {
        if (inst.currentPosition >= numPositions && !inst.looped) {
            inst.looped = true;
            if (!hasLooped) {
                hasLooped = true;
                loopFrameAt = inst.globalTick;
            }
            inst.currentPosition = loopPos < numPositions ? loopPos : 0;
            inst.noiseBase = 0;
            initPosition(inst.currentPosition);
            for (var c = 0; c < 3; c++) {
                var chan = inst.channels[c];
                advanceChannel(chan);
                chan.skipCounter = chan.period;
            }
        }
        renderTick();
        var done = inst.looped;
        if (done) inst.looped = false;
        var regs = inst.ay.slice();
        inst.globalTick++;
        return [regs, [], [], done];
    };
};
if (typeof module !== 'undefined' && module.exports) { module.exports = {PT2: PT2Reader}; }
