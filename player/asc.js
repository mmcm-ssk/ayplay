ASCReader = function(buffer, fileName) {
    var data = new Uint8Array(buffer);

    function u16(off) { return data[off] | (data[off + 1] << 8); }
    function i8(off)  { var v = data[off]; return v >= 0x80 ? v - 0x100 : v; }
    function i8v(v)   { v &= 0xFF; return v >= 0x80 ? v - 0x100 : v; }
    function s16(x)   { x &= 0xFFFF; return x >= 0x8000 ? x - 0x10000 : x; }
    function itrunc(x) { return x >= 0 ? Math.floor(x) : Math.ceil(x); }

    var delay        = data[0];
    var loopPos      = data[1];
    var patternsPtr  = u16(2);
    var samplesPtr   = u16(4);
    var ornamentsPtr = u16(6);
    var numPositions = data[8];
    if (!numPositions || numPositions > 255) numPositions = 1;

    var CLOCK = 1773400;
    var FRAME_RATE = 50;

    var trackName = '', authorName = '';
    if (patternsPtr - numPositions === 72) {
        for (var i = patternsPtr - 44; i < patternsPtr - 24 && data[i]; i++) trackName += String.fromCharCode(data[i]);
        for (var i = patternsPtr - 20; i < patternsPtr && data[i]; i++) authorName += String.fromCharCode(data[i]);
    }
    trackName = trackName.trim();
    authorName = authorName.trim();

    var ASM_Table = [
        0xedc,0xe07,0xd3e,0xc80,0xbcc,0xb22,0xa82,0x9ec,0x95c,0x8d6,0x858,0x7e0,0x76e,0x704,0x69f,
        0x640,0x5e6,0x591,0x541,0x4f6,0x4ae,0x46b,0x42c,0x3f0,0x3b7,0x382,0x34f,0x320,0x2f3,0x2c8,
        0x2a1,0x27b,0x257,0x236,0x216,0x1f8,0x1dc,0x1c1,0x1a8,0x190,0x179,0x164,0x150,0x13d,0x12c,
        0x11b,0x10b,0x0fc,0x0ee,0x0e0,0x0d4,0x0c8,0x0bd,0x0b2,0x0a8,0x09f,0x096,0x08d,0x085,0x07e,0x077,0x070,0x06a,
        0x064,0x05e,0x059,0x054,0x050,0x04b,0x047,0x043,0x03f,0x03c,0x038,0x035,0x032,0x02f,0x02d,0x02a,0x028,0x026,0x024,
        0x022,0x020,0x01e,0x01c
    ];

    function chanState() {
        return {
            Initial_Point_In_Sample: 0, Point_In_Sample: 0, Loop_Point_In_Sample: 0,
            Initial_Point_In_Ornament: 0, Point_In_Ornament: 0, Loop_Point_In_Ornament: 0,
            Address_In_Pattern: 0, Ton: 0, Ton_Deviation: 0,
            Note: 0, Addition_To_Note: 0, Number_Of_Notes_To_Skip: 0,
            Initial_Noise: 0, Current_Noise: 0, Volume: 0,
            Ton_Sliding_Counter: 0, Amplitude: 0, Amplitude_Delay: 0, Amplitude_Delay_Counter: 0,
            Current_Ton_Sliding: 0, Substruction_for_Ton_Sliding: 0,
            Note_Skip_Counter: 0, Addition_To_Amplitude: 0,
            Envelope_Enabled: false, Sound_Enabled: false, Sample_Finished: false,
            Break_Sample_Loop: false
        };
    }

    var st = {
        Delay: delay, DelayCounter: 1, CurrentPosition: 0,
        globalTickCounter: 0, looped: false,
        envPeriod: 0, envType: 0, envShapeTrigger: false, noise: 0,
        ay: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };
    var chan = [chanState(), chanState(), chanState()];

    function initState() {
        st.Delay = delay;
        st.DelayCounter = 1;
        st.CurrentPosition = 0;
        st.globalTickCounter = 0;
        st.looped = false;
        st.envPeriod = 0;
        st.envType = 0;
        st.envShapeTrigger = false;
        st.noise = 0;
        for (var c = 0; c < 3; c++) {
            var ch = chan[c];
            ch.Initial_Point_In_Sample = 0;
            ch.Point_In_Sample = 0;
            ch.Loop_Point_In_Sample = 0;
            ch.Initial_Point_In_Ornament = 0;
            ch.Point_In_Ornament = 0;
            ch.Loop_Point_In_Ornament = 0;
            ch.Ton = 0;
            ch.Ton_Deviation = 0;
            ch.Note = 0;
            ch.Addition_To_Note = 0;
            ch.Number_Of_Notes_To_Skip = 0;
            ch.Initial_Noise = 0;
            ch.Current_Noise = 0;
            ch.Volume = 0;
            ch.Ton_Sliding_Counter = 0;
            ch.Amplitude = 0;
            ch.Amplitude_Delay = 0;
            ch.Amplitude_Delay_Counter = 0;
            ch.Current_Ton_Sliding = 0;
            ch.Substruction_for_Ton_Sliding = 0;
            ch.Note_Skip_Counter = 0;
            ch.Addition_To_Amplitude = 0;
            ch.Envelope_Enabled = false;
            ch.Sound_Enabled = false;
            ch.Sample_Finished = false;
            ch.Break_Sample_Loop = false;
            ch.Address_In_Pattern = (u16(patternsPtr + 6 * data[9] + c * 2) + patternsPtr) & 0xFFFF;
        }
    }

    function patternInterpreter(ch) {
        var initSampleDisabled = false;
        var initOrnamentDisabled = false;
        ch.Ton_Sliding_Counter = 0;
        ch.Amplitude_Delay_Counter = 0;
        for (;;) {
            var op = data[ch.Address_In_Pattern];
            if (op <= 0x55) {
                ch.Note = op;
                ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
                ch.Current_Noise = ch.Initial_Noise;
                if (i8v(ch.Ton_Sliding_Counter) <= 0) ch.Current_Ton_Sliding = 0;
                if (!initSampleDisabled) {
                    ch.Addition_To_Amplitude = 0;
                    ch.Ton_Deviation = 0;
                    ch.Point_In_Sample = ch.Initial_Point_In_Sample;
                    ch.Sound_Enabled = true;
                    ch.Sample_Finished = false;
                    ch.Break_Sample_Loop = false;
                }
                if (!initOrnamentDisabled) {
                    ch.Point_In_Ornament = ch.Initial_Point_In_Ornament;
                    ch.Addition_To_Note = 0;
                }
                if (ch.Envelope_Enabled) {
                    st.envPeriod = data[ch.Address_In_Pattern];
                    ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
                }
                break;
            } else if (op >= 0x56 && op <= 0x5d) {
                ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
                break;
            } else if (op === 0x5e) {
                ch.Break_Sample_Loop = true;
                ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
                break;
            } else if (op === 0x5f) {
                ch.Sound_Enabled = false;
                ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
                break;
            } else if (op >= 0x60 && op <= 0x9f) {
                ch.Number_Of_Notes_To_Skip = op - 0x60;
            } else if (op >= 0xa0 && op <= 0xbf) {
                ch.Initial_Point_In_Sample = (u16(samplesPtr + (op - 0xa0) * 2) + samplesPtr) & 0xFFFF;
            } else if (op >= 0xc0 && op <= 0xdf) {
                ch.Initial_Point_In_Ornament = (u16(ornamentsPtr + (op - 0xc0) * 2) + ornamentsPtr) & 0xFFFF;
            } else if (op === 0xe0) {
                ch.Volume = 15;
                ch.Envelope_Enabled = true;
            } else if (op >= 0xe1 && op <= 0xef) {
                ch.Volume = op - 0xe0;
                ch.Envelope_Enabled = false;
            } else if (op === 0xf0) {
                ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
                ch.Initial_Noise = data[ch.Address_In_Pattern];
            } else if (op === 0xf1) {
                initSampleDisabled = true;
            } else if (op === 0xf2) {
                initOrnamentDisabled = true;
            } else if (op === 0xf3) {
                initSampleDisabled = true;
                initOrnamentDisabled = true;
            } else if (op === 0xf4) {
                ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
                st.Delay = data[ch.Address_In_Pattern];
            } else if (op === 0xf5) {
                ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
                ch.Substruction_for_Ton_Sliding = -i8(ch.Address_In_Pattern) * 16;
                ch.Ton_Sliding_Counter = 255;
            } else if (op === 0xf6) {
                ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
                ch.Substruction_for_Ton_Sliding = i8(ch.Address_In_Pattern) * 16;
                ch.Ton_Sliding_Counter = 255;
            } else if (op === 0xf7) {
                ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
                initSampleDisabled = true;
                var delta = s16(itrunc(ch.Current_Ton_Sliding / 16));
                if (data[ch.Address_In_Pattern + 1] < 0x56)
                    delta = s16(ASM_Table[ch.Note] + itrunc(ch.Current_Ton_Sliding / 16) - ASM_Table[data[ch.Address_In_Pattern + 1]]);
                delta = s16(delta << 4);
                var d = i8(ch.Address_In_Pattern);
                if (d === 0) d = 1;
                ch.Substruction_for_Ton_Sliding = -itrunc(delta / d);
                ch.Current_Ton_Sliding = s16(delta - delta % d);
                ch.Ton_Sliding_Counter = d & 0xFF;
            } else if (op === 0xf8) {
                st.envType = 8;
                st.envShapeTrigger = true;
            } else if (op === 0xf9) {
                ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
                var delta2 = s16(itrunc(ch.Current_Ton_Sliding / 16));
                if (data[ch.Address_In_Pattern + 1] < 0x56)
                    delta2 = s16(ASM_Table[ch.Note] - ASM_Table[data[ch.Address_In_Pattern + 1]]);
                delta2 = s16(delta2 << 4);
                var d2 = i8(ch.Address_In_Pattern);
                if (d2 === 0) d2 = 1;
                ch.Substruction_for_Ton_Sliding = -itrunc(delta2 / d2);
                ch.Current_Ton_Sliding = s16(delta2 - delta2 % d2);
                ch.Ton_Sliding_Counter = d2 & 0xFF;
            } else if (op === 0xfa) {
                st.envType = 10;
                st.envShapeTrigger = true;
            } else if (op === 0xfb) {
                ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
                if ((data[ch.Address_In_Pattern] & 32) === 0) {
                    ch.Amplitude_Delay = (data[ch.Address_In_Pattern] << 3) & 0xFF;
                } else {
                    ch.Amplitude_Delay = (((data[ch.Address_In_Pattern] << 3) ^ 0xf8) + 9) & 0xFF;
                }
                ch.Amplitude_Delay_Counter = ch.Amplitude_Delay;
            } else if (op === 0xfc) {
                st.envType = 12;
                st.envShapeTrigger = true;
            } else if (op === 0xfe) {
                st.envType = 14;
                st.envShapeTrigger = true;
            }
            ch.Address_In_Pattern = (ch.Address_In_Pattern + 1) & 0xFFFF;
        }
        ch.Note_Skip_Counter = ch.Number_Of_Notes_To_Skip;
    }

    var TempMixer = 0;

    function getRegisters(ch) {
        if (ch.Sample_Finished || !ch.Sound_Enabled) {
            ch.Amplitude = 0;
        } else {
            if (ch.Amplitude_Delay_Counter !== 0) {
                if (ch.Amplitude_Delay_Counter >= 16) {
                    ch.Amplitude_Delay_Counter = (ch.Amplitude_Delay_Counter - 8) & 0xFF;
                    if (ch.Addition_To_Amplitude < -15) ch.Addition_To_Amplitude++;
                    else if (ch.Addition_To_Amplitude > 15) ch.Addition_To_Amplitude--;
                } else {
                    if (ch.Amplitude_Delay_Counter & 1) {
                        if (ch.Addition_To_Amplitude > -15) ch.Addition_To_Amplitude--;
                    } else if (ch.Addition_To_Amplitude < 15) ch.Addition_To_Amplitude++;
                    ch.Amplitude_Delay_Counter = ch.Amplitude_Delay;
                }
            }
            var ps = ch.Point_In_Sample;
            var b0 = data[ps];
            var b1 = data[ps + 1];
            var b2 = data[ps + 2];
            if (b0 & 0x80) ch.Loop_Point_In_Sample = ch.Point_In_Sample;
            if ((b0 & 0x60) === 0x20) ch.Sample_Finished = true;
            ch.Ton_Deviation = (ch.Ton_Deviation + i8(ps + 1)) & 0xFFFF;
            TempMixer = (((b2 & 9) << 3) | TempMixer) & 0xFF;
            var envOK = ((b2 & 6) === 2);
            if ((b2 & 6) === 4) {
                if (ch.Addition_To_Amplitude > -15) ch.Addition_To_Amplitude--;
            }
            if ((b2 & 6) === 6) {
                if (ch.Addition_To_Amplitude < 15) ch.Addition_To_Amplitude++;
            }
            var amp = ch.Addition_To_Amplitude + (b2 >> 4);
            if (amp < 0) amp = 0;
            else if (amp > 15) amp = 15;
            amp = (amp * (ch.Volume + 1)) >> 4;
            var slid = i8v(b0 << 3);
            slid = itrunc(slid / 8);
            if (envOK && (TempMixer & 0x40)) {
                st.envPeriod = (st.envPeriod + slid) & 0xFF;
            } else {
                ch.Current_Noise = (ch.Current_Noise + slid) & 0xFF;
            }
            ch.Point_In_Sample = (ch.Point_In_Sample + 3) & 0xFFFF;
            if (data[(ch.Point_In_Sample - 3) & 0xFFFF] & 0x40) {
                if (!ch.Break_Sample_Loop) {
                    ch.Point_In_Sample = ch.Loop_Point_In_Sample;
                } else if (data[(ch.Point_In_Sample - 3) & 0xFFFF] & 0x20) {
                    ch.Sample_Finished = true;
                }
            }
            var po = ch.Point_In_Ornament;
            var ob0 = data[po];
            if (ob0 & 0x80) ch.Loop_Point_In_Ornament = po;
            ch.Addition_To_Note = (ch.Addition_To_Note + data[po + 1]) & 0xFF;
            ch.Current_Noise = (ch.Current_Noise + ((ob0 & 0x10) ? (-16 + (ob0 & 0x0F)) : ob0)) & 0xFF;
            ch.Point_In_Ornament = (ch.Point_In_Ornament + 2) & 0xFFFF;
            if (data[(ch.Point_In_Ornament - 2) & 0xFFFF] & 0x40) {
                ch.Point_In_Ornament = ch.Loop_Point_In_Ornament;
            }
            if (!(TempMixer & 0x40)) {
                st.noise = (((ch.Current_Ton_Sliding >> 8) & 0xFF) + ch.Current_Noise) & 0x1F;
            }
            var j = (ch.Note + ch.Addition_To_Note) & 0xFF;
            j = i8v(j);
            if (j < 0) j = 0;
            else if (j > 0x55) j = 0x55;
            ch.Ton = (ASM_Table[j] + ch.Ton_Deviation + itrunc(ch.Current_Ton_Sliding / 16)) & 0xFFF;
            if (ch.Ton_Sliding_Counter !== 0) {
                if (i8v(ch.Ton_Sliding_Counter) > 0) ch.Ton_Sliding_Counter = (ch.Ton_Sliding_Counter - 1) & 0xFF;
                ch.Current_Ton_Sliding = s16(ch.Current_Ton_Sliding + ch.Substruction_for_Ton_Sliding);
            }
            if (ch.Envelope_Enabled && envOK) amp = amp | 0x10;
            ch.Amplitude = amp;
        }
        TempMixer = (TempMixer >> 1) & 0xFF;
    }

    function playTick() {
        st.DelayCounter = (st.DelayCounter - 1) & 0xFF;
        if (st.DelayCounter === 0) {
            var chA = chan[0];
            chA.Note_Skip_Counter--;
            if (chA.Note_Skip_Counter < 0) {
                if (data[chA.Address_In_Pattern] === 255) {
                    st.CurrentPosition++;
                    if (st.CurrentPosition >= numPositions) {
                        st.CurrentPosition = loopPos;
                        st.looped = true;
                    }
                    var pat = data[9 + st.CurrentPosition];
                    for (var c = 0; c < 3; c++) {
                        chan[c].Address_In_Pattern = (u16(patternsPtr + 6 * pat + c * 2) + patternsPtr) & 0xFFFF;
                    }
                    chA.Initial_Noise = 0;
                    chan[1].Initial_Noise = 0;
                    chan[2].Initial_Noise = 0;
                }
                patternInterpreter(chA);
            }
            for (var c2 = 1; c2 < 3; c2++) {
                chan[c2].Note_Skip_Counter--;
                if (chan[c2].Note_Skip_Counter < 0) {
                    patternInterpreter(chan[c2]);
                }
            }
            st.DelayCounter = st.Delay;
        }

        TempMixer = 0;
        getRegisters(chan[0]);
        getRegisters(chan[1]);
        getRegisters(chan[2]);

        var ay = st.ay;
        ay[0] = chan[0].Ton & 0xFF;
        ay[1] = (chan[0].Ton >> 8) & 0xFF;
        ay[2] = chan[1].Ton & 0xFF;
        ay[3] = (chan[1].Ton >> 8) & 0xFF;
        ay[4] = chan[2].Ton & 0xFF;
        ay[5] = (chan[2].Ton >> 8) & 0xFF;
        ay[6] = st.noise;
        ay[7] = TempMixer;
        ay[8] = chan[0].Amplitude;
        ay[9] = chan[1].Amplitude;
        ay[10] = chan[2].Amplitude;
        ay[11] = st.envPeriod;
        ay[12] = 0;
        ay[13] = st.envShapeTrigger ? st.envType : 0xFF;
        st.envShapeTrigger = false;

        st.globalTickCounter++;
        return ay.slice();
    }

    var MAX_FRAMES = 360000;
    var estimatedFrames = numPositions > 0 ? numPositions * 64 * delay : 50;
    if (estimatedFrames < 50) estimatedFrames = 50;
    if (estimatedFrames > MAX_FRAMES) estimatedFrames = MAX_FRAMES;

    var loopFrameAt = 0;
    var hasLooped = false;

    this.getFrameCount = function() { return estimatedFrames; };
    this.getLoopFrame  = function() { return loopFrameAt; };
    this.reset = function() { initState(); };
    this.computeLoopFrame = function() {
        initState();
        for (var i = 0; i < estimatedFrames; i++) {
            this.getNextFrame();
            if (st.looped) {
                var lf = i + 1;
                initState();
                return lf;
            }
        }
        initState();
        return 0;
    };
    this.getNumPositions = function() { return numPositions; };
    this.getLoopPos = function() { return loopPos; };
    this.getDelay = function() { return delay; };
    this.getClockRate  = function() { return CLOCK; };
    this.getFrameRate  = function() { return FRAME_RATE; };
    this.getTrackFileName = function() { return fileName || ''; };
    this.getTrackName  = function() { return trackName; };
    this.getAuthorName = function() { return authorName; };
    this.getTurbo      = function() { return false; };
    this.getNumChips   = function() { return 1; };
    this.getProgress   = function() {
        var k = st.globalTickCounter / estimatedFrames;
        if (k < 0) k = 0; if (k > 1) k = 1;
        return k;
    };

    this.setProgress = function(k) {
        if (k < 0) k = 0; if (k > 1) k = 1;
        var saved = Math.floor(k * estimatedFrames);
        if (Math.abs(st.globalTickCounter - saved) <= 1) return;
        initState();
        for (var i = 0; i < saved; i++) {
            this.getNextFrame();
            if (st.looped) {
                st.looped = false;
                st.CurrentPosition = loopPos;
            }
        }
    };

    this.getNextFrame = function() {
        var regs = playTick();
        var done = st.looped;
        if (done) {
            st.looped = false;
            if (!hasLooped) {
                hasLooped = true;
                loopFrameAt = st.globalTickCounter;
            }
        }
        return [regs, [], [], done];
    };

    initState();
};
if (typeof module !== 'undefined' && module.exports) { module.exports = {ASC: ASCReader}; }
