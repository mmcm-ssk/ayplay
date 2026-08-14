var VT2Player = (function() {

var PT3_Vol = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
    [0,0,0,0,1,1,1,1,1,1,1,1,2,2,2,2],
    [0,0,0,1,1,1,1,1,2,2,2,2,2,3,3,3],
    [0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4],
    [0,0,1,1,1,2,2,2,3,3,3,4,4,4,5,5],
    [0,0,1,1,2,2,2,3,3,4,4,4,5,5,6,6],
    [0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7],
    [0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8],
    [0,1,1,2,2,3,4,4,5,5,6,7,7,8,8,9],
    [0,1,1,2,3,3,4,5,5,6,7,7,8,9,9,10],
    [0,1,1,2,3,4,4,5,6,7,7,8,9,10,10,11],
    [0,1,2,2,3,4,5,6,6,7,8,9,10,10,11,12],
    [0,1,2,3,3,4,5,6,7,8,9,10,10,11,12,13],
    [0,1,2,3,4,5,6,7,7,8,9,10,11,12,13,14],
    [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
];

var NOTE_TABLES = {
    0: [0xC22,0xB73,0xACF,0xA33,0x9A1,0x917,0x894,0x819,0x7A4,0x737,0x6CF,0x66D,0x611,0x5BA,0x567,0x51A,0x4D0,0x48B,0x44A,0x40C,0x3D2,0x39B,0x367,0x337,0x308,0x2DD,0x2B4,0x28D,0x268,0x246,0x225,0x206,0x1E9,0x1CE,0x1B4,0x19B,0x184,0x16E,0x15A,0x146,0x134,0x123,0x112,0x103,0x0F5,0x0E7,0x0DA,0x0CE,0x0C2,0x0B7,0x0AD,0x0A3,0x09A,0x091,0x089,0x082,0x07A,0x073,0x06D,0x067,0x061,0x05C,0x056,0x052,0x04D,0x049,0x045,0x041,0x03D,0x03A,0x036,0x033,0x031,0x02E,0x02B,0x029,0x027,0x024,0x022,0x020,0x01F,0x01D,0x01B,0x01A,0x018,0x017,0x016,0x014,0x013,0x012,0x011,0x010,0x00F,0x00E,0x00D,0x00C],
    1: [0xEF8,0xE10,0xD60,0xC80,0xBD8,0xB28,0xA88,0x9F0,0x960,0x8E0,0x858,0x7E0,0x77C,0x708,0x6B0,0x640,0x5EC,0x594,0x544,0x4F8,0x4B0,0x470,0x42C,0x3FD,0x3BE,0x384,0x358,0x320,0x2F6,0x2CA,0x2A2,0x27C,0x258,0x238,0x216,0x1F8,0x1DF,0x1C2,0x1AC,0x190,0x17B,0x165,0x151,0x13E,0x12C,0x11C,0x10A,0x0FC,0x0EF,0x0E1,0x0D6,0x0C8,0x0BD,0x0B2,0x0A8,0x09F,0x096,0x08E,0x085,0x07E,0x077,0x070,0x06B,0x064,0x05E,0x059,0x054,0x04F,0x04B,0x047,0x042,0x03F,0x03B,0x038,0x035,0x032,0x02F,0x02C,0x02A,0x027,0x025,0x023,0x021,0x01F,0x01D,0x01C,0x01A,0x019,0x017,0x016,0x015,0x013,0x012,0x011,0x010,0x00F],
    2: [0xD10,0xC55,0xBA4,0xAFC,0xA5F,0x9CA,0x93D,0x8B8,0x83B,0x7C5,0x755,0x6EC,0x688,0x62A,0x5D2,0x57E,0x52F,0x4E5,0x49E,0x45C,0x41D,0x3E2,0x3AB,0x376,0x344,0x315,0x2E9,0x2BF,0x298,0x272,0x24F,0x22E,0x20F,0x1F1,0x1D5,0x1BB,0x1A2,0x18B,0x174,0x160,0x14C,0x139,0x128,0x117,0x107,0x0F9,0x0EB,0x0DD,0x0D1,0x0C5,0x0BA,0x0B0,0x0A6,0x09D,0x094,0x08C,0x084,0x07C,0x075,0x06F,0x069,0x063,0x05D,0x058,0x053,0x04E,0x04A,0x046,0x042,0x03E,0x03B,0x037,0x034,0x031,0x02F,0x02C,0x029,0x027,0x025,0x023,0x021,0x01F,0x01D,0x01C,0x01A,0x019,0x017,0x016,0x015,0x014,0x012,0x011,0x010,0x00F,0x00D],
    3: [0xCDA,0xC22,0xB73,0xACF,0xA33,0x9A1,0x917,0x894,0x819,0x7A4,0x737,0x6CF,0x66D,0x611,0x5BA,0x567,0x51A,0x4D0,0x48B,0x44A,0x40C,0x3D2,0x39B,0x367,0x337,0x308,0x2DD,0x2B4,0x28D,0x268,0x246,0x225,0x206,0x1E9,0x1CE,0x1B4,0x19B,0x184,0x16E,0x15A,0x146,0x134,0x123,0x112,0x103,0x0F5,0x0E7,0x0DA,0x0CE,0x0C2,0x0B7,0x0AD,0x0A3,0x09A,0x091,0x089,0x082,0x07A,0x073,0x06D,0x067,0x061,0x05C,0x056,0x052,0x04D,0x049,0x045,0x041,0x03D,0x03A,0x036,0x033,0x031,0x02E,0x02B,0x029,0x027,0x024,0x022,0x020,0x01F,0x01D,0x01B,0x01A,0x018,0x017,0x016,0x014,0x013,0x012,0x011,0x010,0x00F,0x00E,0x00D],
    4: [0xB40,0xA8C,0xA00,0x960,0x900,0x870,0x7E9,0x780,0x708,0x6C0,0x654,0x600,0x5A0,0x546,0x500,0x4B0,0x480,0x438,0x3F5,0x3C0,0x384,0x360,0x32A,0x300,0x2D0,0x2A3,0x280,0x258,0x240,0x21C,0x1FA,0x1E0,0x1C2,0x1B0,0x195,0x180,0x168,0x152,0x140,0x12C,0x120,0x10E,0xFD,0xF0,0xE1,0xD8,0xCB,0xC0,0xB4,0xA9,0xA0,0x96,0x90,0x87,0x7F,0x78,0x71,0x6C,0x65,0x60,0x5A,0x54,0x50,0x4B,0x48,0x44,0x3F,0x3C,0x38,0x36,0x33,0x30,0x2D,0x2A,0x28,0x26,0x24,0x22,0x20,0x1E,0x1C,0x1B,0x19,0x18,0x17,0x15,0x14,0x13,0x12,0x11,0x10,0x0F,0x0E,0x0E,0x0D,0x0C]
};
NOTE_TABLES[-1] = NOTE_TABLES[3];

var ENV_SHAPES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

function VT2Player(buffer, fileName) {
    var text = new TextDecoder('utf-8').decode(buffer);
    var lines = text.split(/\r?\n/);
    var pos = 0;
    function nextLine() { return pos < lines.length ? lines[pos++].trim() : null; }
    function peekLine() { return pos < lines.length ? lines[pos].trim() : null; }

    var modules = [];

    function createMod() {
        return {
            VortexModule_Header: true, FeaturesLevel: 1,
            Title: '', Author: '', ShowInfo: false,
            Ton_Table: 0, ChipFreq: 1773400, IntFreq: 50,
            Initial_Delay: 6, Positions: [], Loop: 0,
            Ornaments: [], Samples: [], Patterns: []
        };
    }

    function parseAll() {
        while (peekLine() !== null) {
            if (peekLine().toUpperCase() !== '[MODULE]') { pos++; continue; }
            var mod = createMod();
            for (var i = 0; i <= 31; i++) mod.Ornaments[i] = { Loop: 0, Length: 1, Items: [0] };
            for (var i = 0; i <= 31; i++) mod.Samples[i] = null;
            for (var i = 0; i <= 255; i++) mod.Patterns[i] = null;
            var s = nextLine();
            if (!s || s.toUpperCase() !== '[MODULE]') return;
            readModuleHeader(mod);
            while (peekLine() !== null) {
                s = peekLine().toUpperCase();
                if (s.indexOf('[ORNAMENT') === 0) {
                    var n = parseInt(s.substring(9));
                    pos++;
                    readOrnament(mod, n);
                } else if (s.indexOf('[SAMPLE') === 0) {
                    var n = parseInt(s.substring(7));
                    pos++;
                    readSample(mod, n);
                } else if (s.indexOf('[PATTERN') === 0) {
                    var n = parseInt(s.substring(8));
                    pos++;
                    readPattern(mod, n);
                } else if (s.indexOf('[MODULE') === 0) {
                    break;
                } else {
                    pos++;
                }
            }
            modules.push(mod);
        }
    }

    function readModuleHeader(mod) {
        while ((s = nextLine()) !== null) {
            if (s.charAt(0) === '[') { pos--; return; }
            var eq = s.indexOf('=');
            if (eq < 1) continue;
            var key = s.substring(0, eq).trim().toUpperCase();
            var val = s.substring(eq + 1).trim();
            if (key === 'VORTEXTRACKERII') mod.VortexModule_Header = (val !== '0');
            else if (key === 'VERSION') {
                var v = parseFloat(val);
                if (v >= 3.8) mod.FeaturesLevel = 3;
                else if (v >= 3.7) mod.FeaturesLevel = 2;
                else if (v >= 3.6) mod.FeaturesLevel = 1;
                else mod.FeaturesLevel = 0;
            } else if (key === 'TITLE') mod.Title = val;
            else if (key === 'AUTHOR') mod.Author = val;
            else if (key === 'SHOWINFO') mod.ShowInfo = (val === '1');
            else if (key === 'NOTETABLE') mod.Ton_Table = parseInt(val) || 0;
            else if (key === 'CUSTOMNOTETABLE' && val !== '') {
                var customTbl = [];
                var vals = val.split(',');
                for (var ti = 0; ti < vals.length && ti < 96; ti++) {
                    var tv = parseInt(vals[ti].trim());
                    customTbl.push(isNaN(tv) ? 0 : tv);
                }
                mod.CustomNoteTable = customTbl;
            }
            else if (key === 'CHIPFREQ') mod.ChipFreq = parseInt(val) || 1773400;
            else if (key === 'INTFREQ') {
                var f = parseInt(val) || 50;
                if (f > 10000) f = Math.round(f / 1000);
                if (f < 1) f = 50;
                mod.IntFreq = f;
            }
            else if (key === 'SPEED') mod.Initial_Delay = parseInt(val) || 6;
            else if (key === 'PLAYORDER' && val !== '') {
                val.split(',').forEach(function(item) {
                    item = item.trim().toUpperCase();
                    var loop = false;
                    if (item.charAt(0) === 'L') { loop = true; item = item.substring(1).trim(); }
                    var p = parseInt(item);
                    if (!isNaN(p)) {
                        if (loop) mod.Loop = mod.Positions.length;
                        mod.Positions.push(p);
                    }
                });
            }
        }
    }

    function readOrnament(mod, n) {
        var s = nextLine();
        if (!s) return;
        var items = [], loop = 0;
        var parts = s.split(',');
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i].trim().toUpperCase();
            if (p.charAt(0) === 'L') {
                loop = items.length;
                p = p.substring(1).trim();
            }
            if (p !== '') items.push(parseInt(p) || 0);
        }
        mod.Ornaments[n] = { Loop: loop, Length: items.length, Items: items };
    }

    function readSample(mod, n) {
        var items = [];
        var loopPos = 0;
        while ((s = peekLine()) !== null && s !== '' && /^[T.NE.]{3}\s/.test(s)) {
            pos++;
            var m = /^([T.])([N.])([E.])\s+([+-])([0-9A-F]{3})([_^])\s+([+-])([0-9A-F]{2})([_^])\s+([0-9A-F])([_\-\+])\s*(L?)/i.exec(s);
            if (!m) break;
            var item = {
                Mixer_Ton: m[1] === 'T' || m[1] === 't',
                Mixer_Noise: m[2] === 'N' || m[2] === 'n',
                Envelope_Enabled: m[3] === 'E' || m[3] === 'e',
                Add_to_Ton: parseInt(m[5], 16),
                Ton_Accumulation: m[6] === '^',
                Add_to_Envelope_or_Noise: parseInt(m[8], 16),
                Envelope_or_Noise_Accumulation: m[9] === '^',
                Amplitude: parseInt(m[10], 16),
                Amplitude_Sliding: m[11] !== '_',
                Amplitude_Slide_Up: m[11] === '+'
            };
            if (m[4] === '-') item.Add_to_Ton = -item.Add_to_Ton;
            if (m[7] === '-') item.Add_to_Envelope_or_Noise = -item.Add_to_Envelope_or_Noise;
            items.push(item);
            if (m[12] === 'L' || m[12] === 'l') loopPos = items.length - 1;
        }
        mod.Samples[n] = { Loop: loopPos, Length: items.length, Items: items, Enabled: items.length > 0 };
    }

    var NOTES = ['C-','C#','D-','D#','E-','F-','F#','G-','G#','A-','A#','B-'];
    function parseNote(s) {
        if (s === '---') return -1;
        if (s === 'R--') return -2;
        var note = s.substring(0, 2);
        var oct = parseInt(s.substring(2));
        var idx = NOTES.indexOf(note);
        if (idx < 0 || isNaN(oct)) return -1;
        return idx + (oct - 1) * 12;
    }

    var vt2_prevNoise = 0;

    function readPattern(mod, n) {
        var pat = { Length: 0, Items: [] };
        vt2_prevNoise = 0;
        while ((s = peekLine()) !== null) {
            if (s === '' || s.charAt(0) === '[') break;
            pos++;
            var parts = s.split('|');
            var envFreq = 0;
            var noise = vt2_prevNoise;
            if (parts.length >= 1 && parts[0].length >= 4) {
                var nibs = [0, 0, 0, 0];
                for (var ni = 0; ni < 4; ni++) {
                    var c = parts[0].charAt(ni);
                    var v = parseInt(c, 16);
                    if (!isNaN(v)) nibs[ni] = v;
                }
                envFreq = (nibs[0] << 12) | (nibs[1] << 8) | (nibs[2] << 4) | nibs[3];
            }
            var noiseExplicit = false;
            if (parts.length >= 2) {
                var p1 = parts[1];
                if (p1.length >= 1) {
                    var n0 = parseInt(p1.charAt(0), 16);
                    if (!isNaN(n0)) { noise = (noise & 0x0F) | (n0 << 4); noiseExplicit = true; }
                }
                if (p1.length >= 2) {
                    var n1 = parseInt(p1.charAt(1), 16);
                    if (!isNaN(n1)) { noise = (noise & 0xF0) | n1; noiseExplicit = true; }
                }
                vt2_prevNoise = noise;
            }
            var chs = [];
            for (var c = 0; c < 3; c++) {
                var chStr = parts.length > 2 + c ? parts[2 + c].trim() : '';
                var ch = { Note: -1, Sample: 0, Envelope: 0, Ornament: 0,
                    Volume: 0, CmdNum: 0, CmdDelay: 0, CmdParam: 0 };
                var chParts = chStr.split(/\s+/);
                if (chParts.length >= 1) {
                    var tok0 = chParts[0];
                    if (tok0.length >= 3) {
                        ch.Note = parseNote(tok0.substring(0, 3));
                    }
                    var bandStr = tok0.length > 3 ? tok0.substring(3) : '';
                    if (chParts.length >= 2) bandStr = chParts[1];
                    if (chParts.length >= 3) {
                        var tok2 = chParts[2];
                        if (tok2.length >= 1) ch.CmdNum = parseInt(tok2.charAt(0), 16) || 0;
                        if (tok2.length >= 2) ch.CmdDelay = parseInt(tok2.charAt(1), 16) || 0;
                        if (tok2.length >= 4) {
                            var ph = parseInt(tok2.charAt(2), 16);
                            var pl = parseInt(tok2.charAt(3), 16);
                            ch.CmdParam = ((isNaN(ph) ? 0 : ph) << 4) | (isNaN(pl) ? 0 : pl);
                        }
                    }
                    function parseVT2Sample(ch) {
                        var n = ch.charCodeAt(0);
                        if (n >= 48 && n <= 57) return n - 48;
                        if (n >= 65 && n <= 70) return n - 55;
                        if (n >= 71 && n <= 86) return n - 55;
                        return NaN;
                    }
                    for (var bi = 0; bi < bandStr.length && bi < 4; bi++) {
                        var bc = bandStr.charAt(bi);
                        if (bc === '.') {
                            if (bi === 2) ch.Ornament = 0;
                            continue;
                        }
                        if (bi === 0) {
                            var bv = parseVT2Sample(bc);
                            if (!isNaN(bv)) ch.Sample = bv;
                        } else {
                            var bv = parseInt(bc, 16);
                            if (!isNaN(bv)) {
                                if (bi === 1) ch.Envelope = bv;
                                else if (bi === 2) ch.Ornament = bv;
                                else if (bi === 3) ch.Volume = bv;
                            }
                        }
                    }
                }
                chs.push(ch);
            }
            pat.Items.push({ Envelope: envFreq, Noise: noise, NoiseExplicit: noiseExplicit, Channel: chs });
            pat.Length++;
        }
        mod.Patterns[n] = pat;
    }

    parseAll();

    if (modules.length === 0 || !modules[0].Positions || modules[0].Positions.length === 0) {
        this.getNextFrame = function() { return [[0,0,0,0,0,0,0,0xFF,0,0,0,0,0,0], [], [], false]; };
        this.getFrameRate = function() { return 50; };
        this.getClockRate = function() { return 1773400; };
        this.getTurbo = function() { return 0; };
        this.getNumChips = function() { return 0; };
        this.getFrameCount = function() { return 1; };
        this.getLoopFrame = function() { return 0; };
        this.getNumPositions = function() { return 1; };
        this.getLoopPos = function() { return 0; };
        this.getDelay = function() { return 6; };
        this.getTrackFileName = function() { return fileName || ''; };
        this.getTrackName = function() { return ''; };
        this.getAuthorName = function() { return ''; };
        return;
    }

    var isTurbo = modules.length >= 2;

    function initChipState(mod) {
        var nt = (mod.Ton_Table === 5 && mod.CustomNoteTable) ? mod.CustomNoteTable : NOTE_TABLES[mod.Ton_Table];
        if (!nt) nt = NOTE_TABLES[-1];
        return {
            module: mod,
            NOTETABLE: nt,
            features: mod.FeaturesLevel,
            numPos: mod.Positions.length,
            loopPos: mod.Loop,
            p: [
                { SamplePosition: 0, SamplePrevPosition: 0, OrnamentPosition: 0, SoundEnabled: false, Slide_To_Note: 0, Note: 0, Ton_Slide_Delay: 0, Ton_Slide_Count: 0, Ton_Slide_Step: 0, Ton_Slide_Delta: 0, Ton_Slide_Type: 0, Current_Ton_Sliding: 0, OnOff_Delay: 0, OffOn_Delay: 0, Current_OnOff: 0, Ton: 0, Ton_Accumulator: 0, Amplitude: 0, Current_Amplitude_Sliding: 0, Current_Envelope_Sliding: 0, Current_Noise_Sliding: 0, TempMixer: 0 },
                { SamplePosition: 0, SamplePrevPosition: 0, OrnamentPosition: 0, SoundEnabled: false, Slide_To_Note: 0, Note: 0, Ton_Slide_Delay: 0, Ton_Slide_Count: 0, Ton_Slide_Step: 0, Ton_Slide_Delta: 0, Ton_Slide_Type: 0, Current_Ton_Sliding: 0, OnOff_Delay: 0, OffOn_Delay: 0, Current_OnOff: 0, Ton: 0, Ton_Accumulator: 0, Amplitude: 0, Current_Amplitude_Sliding: 0, Current_Envelope_Sliding: 0, Current_Noise_Sliding: 0, TempMixer: 0 },
                { SamplePosition: 0, SamplePrevPosition: 0, OrnamentPosition: 0, SoundEnabled: false, Slide_To_Note: 0, Note: 0, Ton_Slide_Delay: 0, Ton_Slide_Count: 0, Ton_Slide_Step: 0, Ton_Slide_Delta: 0, Ton_Slide_Type: 0, Current_Ton_Sliding: 0, OnOff_Delay: 0, OffOn_Delay: 0, Current_OnOff: 0, Ton: 0, Ton_Accumulator: 0, Amplitude: 0, Current_Amplitude_Sliding: 0, Current_Envelope_Sliding: 0, Current_Noise_Sliding: 0, TempMixer: 0 }
            ],
            isCh: [
                { Global_Ton: true, Global_Noise: true, Global_Envelope: true, EnvelopeEnabled: false, Ornament: 0, Sample: 1, Volume: 15 },
                { Global_Ton: true, Global_Noise: true, Global_Envelope: true, EnvelopeEnabled: false, Ornament: 0, Sample: 1, Volume: 15 },
                { Global_Ton: true, Global_Noise: true, Global_Envelope: true, EnvelopeEnabled: false, Ornament: 0, Sample: 1, Volume: 15 }
            ],
            env: {
                Base: 0, CurSlide: 0, CurDelay: 0, EnvDelay: 0, SlideAdd: 0,
                AddToEnv: 0, AddToNoise: 0, PT3Noise: 0, NoiseExplicit: false, LastNoise: 0,
                EnvOrnament: 0, EnvOrnamentPosition: 0,
                CurrentPattern: -1, CurrentLine: 0, CurrentPosition: 0,
                Delay: mod.Initial_Delay, DelayCounter: 1,
                EnvType: 0xFF
            }
        };
    }

    var chips = modules.map(initChipState);

    function getNoteFreq(nt, note) {
        if (note < 0) note = 0;
        if (note > 95) note = 95;
        return nt[note];
    }

    function getNoteByEnvelope(nt, e) {
        var best = 0xFFFF, nearest = 0;
        for (var i = 0; i < nt.length; i++) {
            var n = Math.round(nt[i] / 16);
            if (n === e) return i;
            var d = Math.abs(e - n);
            if (d < best) { best = d; nearest = i; }
        }
        return nearest;
    }

    function patternInterpreter(chip, chNum, prevNote) {
        var chIdx = chNum;
        if (chip.env.CurrentPattern === -1) chIdx = 1;
        var pat = chip.module.Patterns[chip.env.CurrentPattern];
        if (!pat || chip.env.CurrentLine >= pat.Length) return;
        var line = pat.Items[chip.env.CurrentLine];
        var chan = line.Channel[chNum];
        var cp = chip.p[chIdx];

        if (chan.Note === -2) {
            cp.SoundEnabled = false;
            cp.Current_Envelope_Sliding = 0;
            cp.Ton_Slide_Count = 0;
            cp.SamplePosition = 0;
            cp.OrnamentPosition = 0;
            cp.Current_Noise_Sliding = 0;
            cp.Current_Amplitude_Sliding = 0;
            cp.Current_OnOff = 0;
            cp.Current_Ton_Sliding = 0;
            cp.Ton_Accumulator = 0;
        } else if (chan.Note !== -1) {
            cp.SoundEnabled = true;
            cp.Note = chan.Note;
            cp.Current_Envelope_Sliding = 0;
            cp.Ton_Slide_Count = 0;
            cp.SamplePosition = 0;
            cp.OrnamentPosition = 0;
            cp.Current_Noise_Sliding = 0;
            cp.Current_Amplitude_Sliding = 0;
            cp.Current_OnOff = 0;
            cp.Current_Ton_Sliding = 0;
            cp.Ton_Accumulator = 0;
        }

        if (chan.Note !== -1 && chan.Sample !== 0)
            chip.isCh[chIdx].Sample = chan.Sample;

        if (chan.Envelope > 0 && chan.Envelope <= 14) {
            chip.isCh[chIdx].EnvelopeEnabled = true;
            chip.env.Base = line.Envelope;
            chip.env.EnvType = ENV_SHAPES[chan.Envelope];
            chip.isCh[chIdx].Ornament = chan.Ornament;
            cp.OrnamentPosition = 0;
            chip.env.CurSlide = 0;
            chip.env.CurDelay = 0;
        } else if (chan.Envelope === 15) {
            chip.isCh[chIdx].EnvelopeEnabled = false;
            chip.isCh[chIdx].Ornament = chan.Ornament;
            cp.OrnamentPosition = 0;
        } else if (chan.Ornament !== 0) {
            chip.isCh[chIdx].Ornament = chan.Ornament;
            cp.OrnamentPosition = 0;
        }

        if (chan.Volume > 0) chip.isCh[chIdx].Volume = chan.Volume;

        switch (chan.CmdNum) {
            case 1:
                cp.Ton_Slide_Delay = chan.CmdDelay;
                if (chan.CmdDelay === 0 && chip.features >= 2) cp.Ton_Slide_Delay = 1;
                cp.Ton_Slide_Count = cp.Ton_Slide_Delay;
                cp.Ton_Slide_Step = chan.CmdParam;
                cp.Ton_Slide_Type = 0;
                cp.Current_OnOff = 0;
                break;
            case 2:
                cp.Ton_Slide_Delay = chan.CmdDelay;
                if (chan.CmdDelay === 0 && chip.features >= 2) cp.Ton_Slide_Delay = 1;
                cp.Ton_Slide_Count = cp.Ton_Slide_Delay;
                cp.Ton_Slide_Step = -chan.CmdParam;
                cp.Ton_Slide_Type = 0;
                cp.Current_OnOff = 0;
                break;
            case 3:
                if (chan.Note >= 0 || (chan.Note !== -2 && chip.features >= 1)) {
                    var ts = cp.Current_Ton_Sliding;
                    cp.Ton_Slide_Delay = chan.CmdDelay;
                    cp.Ton_Slide_Count = cp.Ton_Slide_Delay;
                    cp.Ton_Slide_Step = chan.CmdParam;
                    cp.Ton_Slide_Delta = getNoteFreq(chip.NOTETABLE, cp.Note) - getNoteFreq(chip.NOTETABLE, prevNote);
                    cp.Slide_To_Note = cp.Note;
                    cp.Note = prevNote;
                    if (chip.features >= 1) cp.Current_Ton_Sliding = ts;
                    if (cp.Ton_Slide_Delta - cp.Current_Ton_Sliding < 0) cp.Ton_Slide_Step = -cp.Ton_Slide_Step;
                    cp.Ton_Slide_Type = 1;
                    cp.Current_OnOff = 0;
                }
                break;
            case 4: cp.SamplePosition = chan.CmdParam; break;
            case 5: cp.OrnamentPosition = chan.CmdParam; break;
            case 6:
                cp.OffOn_Delay = chan.CmdParam & 15;
                cp.OnOff_Delay = chan.CmdParam >> 4;
                cp.Current_OnOff = cp.OnOff_Delay;
                cp.Ton_Slide_Count = 0;
                cp.Current_Ton_Sliding = 0;
                break;
            case 7:
                if (chip.features >= 3 && chan.CmdParam <= 31) {
                    chip.env.EnvOrnament = chan.CmdParam;
                    chip.env.EnvOrnamentPosition = 0;
                }
                break;
            case 9:
                var envDelay = chan.CmdDelay;
                if (envDelay === 0 && chip.features >= 3) envDelay = 1;
                chip.env.EnvDelay = envDelay;
                chip.env.CurDelay = envDelay;
                chip.env.SlideAdd = chan.CmdParam;
                break;
            case 10:
                var envDelay = chan.CmdDelay;
                if (envDelay === 0 && chip.features >= 3) envDelay = 1;
                chip.env.EnvDelay = envDelay;
                chip.env.CurDelay = envDelay;
                chip.env.SlideAdd = -chan.CmdParam;
                break;
            case 11:
                if (chan.CmdParam !== 0) {
                    chip.env.Delay = chan.CmdParam;
                    for (var ci = 0; ci < chips.length; ci++)
                        chips[ci].env.Delay = chan.CmdParam;
                }
                break;
        }
    }

    function tickRegisters(chip) {
        var tempMixer = 0;
        chip.env.AddToEnv = 0;

        for (var chNum = 0; chNum < 3; chNum++) {
            var cp = chip.p[chNum];
            var ic = chip.isCh[chNum];

            cp.Amplitude = 0;

            if (cp.SoundEnabled) {
                var sam = chip.module.Samples[ic.Sample];
                var ton = 0;

                if (sam && cp.SamplePosition < sam.Length) {
                    var item = sam.Items[cp.SamplePosition];
                    ton = cp.Ton_Accumulator + item.Add_to_Ton;
                    if (item.Ton_Accumulation) cp.Ton_Accumulator = ton;
                }

                var orn = chip.module.Ornaments[ic.Ornament];
                var j;
                if (!orn || cp.OrnamentPosition >= orn.Length) {
                    j = cp.Note;
                } else {
                    j = cp.Note + orn.Items[cp.OrnamentPosition];
                }
                if ((j << 24) >> 24 < 0) j = 0;
                else if (j > 95) j = 95;

                var w = getNoteFreq(chip.NOTETABLE, j);
                ton = (ton + cp.Current_Ton_Sliding + w) & 0xFFF;
                cp.Ton = ton;

                if (cp.Ton_Slide_Count > 0) {
                    cp.Ton_Slide_Count--;
                    if (cp.Ton_Slide_Count === 0) {
                        cp.Current_Ton_Sliding += cp.Ton_Slide_Step;
                        cp.Ton_Slide_Count = cp.Ton_Slide_Delay;
                        if (cp.Ton_Slide_Type === 1) {
                            if ((cp.Ton_Slide_Step < 0 && cp.Current_Ton_Sliding <= cp.Ton_Slide_Delta) ||
                                (cp.Ton_Slide_Step >= 0 && cp.Current_Ton_Sliding >= cp.Ton_Slide_Delta)) {
                                cp.Note = cp.Slide_To_Note;
                                cp.Ton_Slide_Count = 0;
                                cp.Current_Ton_Sliding = 0;
                            }
                        }
                    }
                }

                var amp = 0;
                if (sam && cp.SamplePosition < sam.Length) {
                    var item = sam.Items[cp.SamplePosition];
                    amp = item.Amplitude;
                    if (item.Amplitude_Sliding) {
                        if (item.Amplitude_Slide_Up) {
                            if (cp.Current_Amplitude_Sliding < 15) cp.Current_Amplitude_Sliding++;
                        } else {
                            if (cp.Current_Amplitude_Sliding > -15) cp.Current_Amplitude_Sliding--;
                        }
                    }
                    amp += cp.Current_Amplitude_Sliding;
                    if ((amp << 24) >> 24 < 0) amp = 0;
                    else if (amp > 15) amp = 15;
                    amp = PT3_Vol[ic.Volume][amp];

                    if (item.Envelope_Enabled && ic.EnvelopeEnabled) amp |= 16;

                    if (!item.Mixer_Noise) {
                        j = cp.Current_Envelope_Sliding + item.Add_to_Envelope_or_Noise;
                        if (item.Envelope_or_Noise_Accumulation) cp.Current_Envelope_Sliding = j;
                        chip.env.AddToEnv += j;
                    } else {
                        chip.env.PT3Noise = cp.Current_Noise_Sliding + item.Add_to_Envelope_or_Noise;
                        if (item.Envelope_or_Noise_Accumulation) cp.Current_Noise_Sliding = chip.env.PT3Noise;
                    }

                    if (!item.Mixer_Ton) tempMixer |= (1 << chNum);
                    if (!item.Mixer_Noise) tempMixer |= (1 << (chNum + 3));
                }

                if (sam) {
                    cp.SamplePrevPosition = cp.SamplePosition;
                    cp.SamplePosition++;
                    if (cp.SamplePosition >= sam.Length) cp.SamplePosition = sam.Loop;
                }
                if (orn) {
                    cp.OrnamentPosition++;
                    if (cp.OrnamentPosition >= orn.Length) cp.OrnamentPosition = orn.Loop;
                }

                cp.Amplitude = amp;
            }

            if (cp.Current_OnOff > 0) {
                cp.Current_OnOff--;
                if (cp.Current_OnOff === 0) {
                    cp.SoundEnabled = !cp.SoundEnabled;
                    if (cp.SoundEnabled) cp.Current_OnOff = cp.OnOff_Delay;
                    else cp.Current_OnOff = cp.OffOn_Delay;
                }
            }

            if (chip.env.CurrentPattern !== -1) {
                var gt = ic.Global_Ton;
                var gn = ic.Global_Noise;
                var ge = ic.Global_Envelope;
                var sam = chip.module.Samples[ic.Sample];
                if (sam && !sam.Enabled) {
                    gt = false; gn = false; ge = false;
                }
                if (!gt) tempMixer |= (1 << chNum);
                if (!gn) tempMixer |= (1 << (chNum + 3));
                if (!ge) cp.Amplitude &= 15;

                if ((!gt || !gn) && (cp.Amplitude & 16) === 0 && (tempMixer & ((1 << chNum) | (1 << (chNum + 3)))) === ((1 << chNum) | (1 << (chNum + 3)))) {
                    cp.Amplitude = 0;
                }
            }

            cp.TempMixer = tempMixer;
        }

        var regs = new Array(14);
        regs[0] = chip.p[0].Ton & 0xFF;
        regs[1] = (chip.p[0].Ton >> 8) & 0xFF;
        regs[2] = chip.p[1].Ton & 0xFF;
        regs[3] = (chip.p[1].Ton >> 8) & 0xFF;
        regs[4] = chip.p[2].Ton & 0xFF;
        regs[5] = (chip.p[2].Ton >> 8) & 0xFF;
        regs[6] = chip.env.NoiseExplicit ? ((chip.env.PT3Noise + chip.env.AddToNoise) & 31) : (chip.env.PT3Noise & 31);
        regs[7] = chip.p[0].TempMixer | chip.p[1].TempMixer | chip.p[2].TempMixer;

        regs[8] = chip.p[0].Amplitude;
        regs[9] = chip.p[1].Amplitude;
        regs[10] = chip.p[2].Amplitude;
        var envVal = chip.env.AddToEnv + chip.env.CurSlide + chip.env.Base;
        if (chip.features >= 3 && chip.env.EnvOrnament !== 0) {
            var envNote = getNoteByEnvelope(chip.NOTETABLE, chip.env.Base);
            var eorn = chip.module.Ornaments[chip.env.EnvOrnament];
            if (eorn && chip.env.EnvOrnamentPosition < eorn.Length) {
                envNote += eorn.Items[chip.env.EnvOrnamentPosition];
            }
            if (envNote < 0) envNote = 0;
            else if (envNote > 95) envNote = 95;
            var envBase = Math.round(getNoteFreq(chip.NOTETABLE, envNote) / 16);
            envVal = chip.env.AddToEnv + chip.env.CurSlide + envBase;
            if (eorn) {
                chip.env.EnvOrnamentPosition++;
                if (chip.env.EnvOrnamentPosition >= eorn.Length) {
                    chip.env.EnvOrnamentPosition = eorn.Loop;
                }
            }
        }
        regs[11] = envVal & 0xFF;
        regs[12] = (envVal >> 8) & 0xFF;
        regs[13] = chip.env.EnvType;
        chip.env.EnvType = 0xFF;

        if (chip.env.CurDelay > 0) {
            chip.env.CurDelay--;
            if (chip.env.CurDelay === 0) {
                chip.env.CurDelay = chip.env.EnvDelay;
                chip.env.CurSlide += chip.env.SlideAdd;
            }
        }

        return regs;
    }

    var started = false;
    var ended = false;
    var loopFrame = -1;
    var loopStartFrame = -1;
    var loopStartFound = false;
    var tickCount = 0;

    var masterMod = modules[0];

    this.trackName = masterMod.Title;
    this.authorName = masterMod.Author;

    this.getFrameRate = function() { return masterMod.IntFreq; };
    this.getClockRate = function() { return masterMod.ChipFreq; };
    this.getTurbo = function() { return modules.length; };
    this.getNumChips = function() { return modules.length; };
    this.getNumPositions = function() { return masterMod.Positions.length; };
    this.getLoopPos = function() { return masterMod.Loop; };
    this.getDelay = function() { return masterMod.Initial_Delay; };
    this.getTrackFileName = function() { return fileName || ''; };
    this.getTrackName = function() { return masterMod.Title || ''; };
    this.getAuthorName = function() { return masterMod.Author || ''; };
    this.getFrameCount = function() { return masterMod.Positions.length * 64 * masterMod.Initial_Delay; };
    this.getLoopFrame = function() { return loopFrame; };
    this.getLoopStartFrame = function() { return loopStartFrame; };

    this.getNextFrame = function() {
        if (ended) {
            return [[0,0,0,0,0,0,0,0xFF,0,0,0,0,0,0], [], false];
        }

        if (!started) {
            started = true;
            for (var ci = 0; ci < chips.length; ci++) {
                var ch = chips[ci];
                ch.env.CurrentPosition = 0;
                ch.env.CurrentPattern = ch.module.Positions[0];
                ch.env.CurrentLine = 0;
                ch.env.DelayCounter = 1;
            }
        }

        var prevNotes = chips.map(function(chip) { return [chip.p[0].Note, chip.p[1].Note, chip.p[2].Note]; });

        chips[0].env.DelayCounter--;
        if (chips[0].env.DelayCounter === 0) {
            for (var ci = 0; ci < chips.length; ci++) {
                var ch = chips[ci];
                var needAdvance = false;
                var pat = ch.module.Patterns[ch.env.CurrentPattern];
                if (pat && ch.env.CurrentLine >= pat.Length) {
                    needAdvance = true;
                }

                if (needAdvance) {
                    ch.env.CurrentPosition++;
                    if (ch.env.CurrentPosition >= ch.numPos) {
                        ch.env.CurrentPosition = ch.loopPos;
                        if (loopFrame < 0) loopFrame = tickCount;
                    }
                    ch.env.CurrentPattern = ch.module.Positions[ch.env.CurrentPosition];
                    ch.env.CurrentLine = 0;
                }

                if (!loopStartFound && chips[0].env.CurrentPosition === chips[0].loopPos) {
                    loopStartFound = true;
                    loopStartFrame = tickCount;
                }

                pat = ch.module.Patterns[ch.env.CurrentPattern];
                if (pat && ch.env.CurrentLine < pat.Length) {
                    ch.env.AddToNoise = pat.Items[ch.env.CurrentLine].Noise;
                    ch.env.NoiseExplicit = pat.Items[ch.env.CurrentLine].NoiseExplicit;
                    if (ch.features >= 3 && pat.Items[ch.env.CurrentLine].Envelope !== 0) {
                        ch.env.Base = pat.Items[ch.env.CurrentLine].Envelope;
                        ch.env.EnvOrnament = 0;
                        ch.env.EnvOrnamentPosition = 0;
                    }
                    for (var k = 0; k < 3; k++) {
                        patternInterpreter(ch, k, prevNotes[ci][k]);
                    }
                    ch.env.CurrentLine++;
                    ch.env.DelayCounter = ch.env.Delay;
                }
            }
        }

        var regsA = tickRegisters(chips[0]);
        var regsB = chips.length > 1 ? tickRegisters(chips[1]) : [];
        var regsC = chips.length > 2 ? tickRegisters(chips[2]) : [];
        tickCount++;

        var looped = loopFrame >= 0 && tickCount >= loopFrame;
        return [regsA, regsB, regsC, looped];
    };
}

return VT2Player;
})();

if (typeof require !== 'undefined') {
    module.exports = { VT2Player: VT2Player };
}
