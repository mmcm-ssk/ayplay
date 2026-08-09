var STCReader = (function() {

var ST_FREQ_TABLE = [
    0xEF8,0xE10,0xD60,0xC80,0xBD8,0xB28,0xA88,0x9F0,0x960,0x8E0,
    0x858,0x7E0,0x77C,0x708,0x6B0,0x640,0x5EC,0x594,0x544,0x4F8,
    0x4B0,0x470,0x42C,0x3F0,0x3BE,0x384,0x358,0x320,0x2F6,0x2CA,
    0x2A2,0x27C,0x258,0x238,0x216,0x1F8,0x1DF,0x1C2,0x1AC,0x190,
    0x17B,0x165,0x151,0x13E,0x12C,0x11C,0x10B,0x0FC,0x0EF,0x0E1,
    0x0D6,0x0C8,0x0BD,0x0B2,0x0A8,0x09F,0x096,0x08E,0x085,0x07E,
    0x077,0x070,0x06B,0x064,0x05E,0x059,0x054,0x04F,0x04B,0x047,
    0x042,0x03F,0x03B,0x038,0x035,0x032,0x02F,0x02C,0x02A,0x027,
    0x025,0x023,0x021,0x01F,0x01D,0x01C,0x01A,0x019,0x017,0x016,
    0x015,0x013,0x012,0x011,0x010,0x00F
];

function STCReader(buffer, fileName) {
    var data = new Uint8Array(buffer);

    function u16(off) { return data[off] | (data[off + 1] << 8); }
    function i8(off)  { var v = data[off]; return v >= 0x80 ? v - 0x100 : v; }

    if (data.length < 27) { this.error = 'File too small'; return; }

    var delay = data[0];
    var positionsPtr = u16(1);
    var ornamentsPtr = u16(3);
    var patternsPtr  = u16(5);

    var nameBytes = '';
    for (var i = 7; i < 25; i++) {
        if (data[i] >= 32 && data[i] <= 127) nameBytes += String.fromCharCode(data[i]);
    }
    nameBytes = nameBytes.trim();

    var knownNames = [
        'SONG BY ST COMPILE', 'SONG BY MB COMPILE', 'SONG BY ST-COMPILE',
        'SOUND TRACKER v1.1', 'S.T.FULL EDITION  ',
        'S.T.FULL EDITION \x7F', 'SOUND TRACKER v1.3'
    ];
    var trackName = '';
    for (var i = 0; i < knownNames.length; i++) {
        if (nameBytes === knownNames[i]) { trackName = ''; break; }
    }
    if (!trackName && nameBytes) trackName = nameBytes;

    var fileSize = u16(25);
    if (fileSize !== data.length && trackName) {
        var lo = fileSize & 0xFF, hi = (fileSize >> 8) & 0xFF;
        if (lo >= 32 && lo <= 127) trackName += String.fromCharCode(lo);
        if (hi >= 32 && hi <= 127) trackName += String.fromCharCode(hi);
        trackName = trackName.trim();
    }

    var numPositions = data[positionsPtr] + 1;

    var posList = [];
    for (var i = 0; i < numPositions; i++) {
        var patNum = data[positionsPtr + 1 + i * 2];
        var trans  = i8(positionsPtr + 2 + i * 2);
        posList.push({ pattern: patNum, transposition: trans });
    }

    var parsedPatterns = {};
    var patternLines = {};
    var maxLines = 0;

    for (var pi = 0; pi < numPositions; pi++) {
        var patNum = posList[pi].pattern;
        var trans  = posList[pi].transposition;
        if (parsedPatterns[patNum] !== undefined) continue;

        var patIdx = 0;
        while (patIdx < 256) {
            if (data[patternsPtr + patIdx * 7] === patNum) break;
            patIdx++;
        }
        if (patIdx >= 256) { parsedPatterns[patNum] = []; patternLines[patNum] = 0; continue; }

        var chPtr = [
            u16(patternsPtr + patIdx * 7 + 1),
            u16(patternsPtr + patIdx * 7 + 3),
            u16(patternsPtr + patIdx * 7 + 5)
        ];

        var skip = [0, 0, 0];
        var skipCounter = [0, 0, 0];
        var csam = [0, 0, 0];
        var corn = [0, 0, 0];
        var lines = [];
        var lineIdx = 0;
        var quit = false;

        while (lineIdx < 256 && !quit) {
            for (var ch = 0; ch < 3; ch++) {
                skipCounter[ch]--;
                if (skipCounter[ch] >= 0) {
                    lines[lineIdx] = lines[lineIdx] || { note: [-1,-1,-1], sample: [0,0,0], ornament: [undefined,undefined,undefined], envelope: [15,15,15], envFreq: 0 };
                    continue;
                }

                if (ch === 0 && data[chPtr[0]] === 0xFF) {
                    quit = true;
                    break;
                }

                var line = lines[lineIdx] || { note: [-1,-1,-1], sample: [0,0,0], ornament: [undefined,undefined,undefined], envelope: [15,15,15], envFreq: 0 };
                lines[lineIdx] = line;

                var chDone = false;
                while (!chDone) {
                    var cmd = data[chPtr[ch]];

                if (cmd <= 0x5F) {
                    var nt = cmd + trans;
                    if (nt > 0x5F) nt = 0x5F;
                    if (nt < 0) nt = 0;
                    line.note[ch] = nt;
                        chPtr[ch]++;
                        chDone = true;
                    } else if (cmd >= 0x60 && cmd <= 0x6F) {
                        csam[ch] = cmd & 0x0F;
                        line.sample[ch] = csam[ch];
                        chPtr[ch]++;
                    } else if (cmd >= 0x70 && cmd <= 0x7F) {
                        corn[ch] = cmd & 0x0F;
                        if (corn[ch] === 0) corn[ch] = -1;
                        line.ornament[ch] = corn[ch];
                        line.envelope[ch] = 15;
                        chPtr[ch]++;
                    } else if (cmd === 0x80) {
                        line.note[ch] = -2;
                        chPtr[ch]++;
                        chDone = true;
                    } else if (cmd === 0x81) {
                        chPtr[ch]++;
                        chDone = true;
                    } else if (cmd === 0x82) {
                        line.ornament[ch] = -1;
                        line.envelope[ch] = 15;
                        chPtr[ch]++;
                    } else if (cmd >= 0x83 && cmd <= 0x8E) {
                        line.envelope[ch] = cmd - 0x80;
                        chPtr[ch]++;
                        line.envFreq = data[chPtr[ch]];
                        line.ornament[ch] = -1;
                        chPtr[ch]++;
                    } else {
                        skip[ch] = cmd - 0xA1;
                        chPtr[ch]++;
                    }
                }
                skipCounter[ch] = skip[ch];
            }

            if (quit) break;
            lineIdx++;
        }
        patternLines[patNum] = lineIdx;
        parsedPatterns[patNum] = lines;
        if (lineIdx > maxLines) maxLines = lineIdx;
    }

    var ornaments = [];
    var numOrnaments = Math.floor((patternsPtr - ornamentsPtr) / 0x21);
    if (numOrnaments > 16) numOrnaments = 16;
    for (var i = 0; i < numOrnaments; i++) {
        var ornNum = data[ornamentsPtr + 0x21 * i];
        if (ornNum > 15) continue;
        var items = [];
        for (var k = 0; k < 32; k++) {
            items.push(i8(ornamentsPtr + 0x21 * i + 1 + k));
        }
        ornaments[ornNum] = { number: ornNum, items: items };
    }
    for (var i = 0; i < 16; i++) {
        if (!ornaments[i]) ornaments[i] = { number: i, items: new Array(32).fill(0) };
    }

    var emptyTick = { amplitude: 0, mixerTone: false, mixerNoise: false, addTon: 0, noiseAdd: 0 };
    var numSamples = Math.floor((positionsPtr - 27) / 99);
    if (numSamples > 16) numSamples = 16;
    var samples = [];
    for (var i = 0; i < numSamples; i++) {
        var base = 0x1B + 0x63 * i;
        var sampleNum = data[base];
        if (sampleNum > 15) continue;
        var ticks = [];
        for (var k = 0; k < 32; k++) {
            var b0 = data[base + 1 + k * 3];
            var b1 = data[base + 1 + k * 3 + 1];
            var b2 = data[base + 1 + k * 3 + 2];
            var amp = b0 & 0x0F;
            var mixNoise = !(b1 & 0x80);
            var mixTone  = !(b1 & 0x40);
            var addTonHi = (b0 >> 4) & 0x0F;
            var addTon   = (addTonHi << 8) | b2;
            if (!(b1 & 0x20)) addTon = -addTon;
            var noiseAdd = b1 & 0x1F;
            ticks.push({
                amplitude: amp,
                mixerTone: mixTone,
                mixerNoise: mixNoise,
                addTon: addTon,
                noiseAdd: noiseAdd
            });
        }
        var repPos = data[base + 0x61];
        var repLen = data[base + 0x62];
        var loopPos, loopLen, hasLoop;
        if (repPos === 0) {
            hasLoop = false;
            loopPos = 32;
            loopLen = 33;
            ticks.push(emptyTick);
        } else {
            hasLoop = true;
            loopPos = repPos - 1;
            if (loopPos > 31) loopPos = 31;
            loopLen = repPos + repLen;
            if (loopLen > 32) loopLen = 32;
            if (loopLen === 0) loopLen = 1;
            if (loopPos >= loopLen) loopPos = loopLen - 1;
            var l = loopPos + 1;
            if (loopLen < 32) {
                var newLen = loopLen + 33 - l;
                for (var k = 32; k < newLen; k++) {
                    var srcIdx = k + l - 33;
                    ticks[k] = (srcIdx >= 0 && srcIdx < 32) ? ticks[srcIdx] : emptyTick;
                }
                loopLen = newLen;
                loopPos = 32;
            }
        }
        var repeat = repPos > 0 ? repPos - 1 : 0;
        var repeatLength = repLen > 0 ? repLen : 1;
        samples[sampleNum] = { number: sampleNum, ticks: ticks, loopPos: loopPos, loopLen: loopLen, hasLoop: hasLoop, repeat: repeat, repeatLength: repeatLength };
    }
    for (var i = 0; i < 16; i++) {
        if (!samples[i]) samples[i] = { number: i, ticks: [emptyTick], loopPos: 0, loopLen: 1, hasLoop: false };
    }

    var loopPosition = 0;
    var CLOCK = 1773400;
    var FRAME_RATE = 50;

    var state = {
        currentPos: 0,
        currentLine: 0,
        tickCounter: 0,
        delay: delay,
        channels: [
            { note: 0, sampleNum: 0, ornamentNum: -1, samplePos: 0, ornamentPos: 0, envEnabled: false, envType: 15, enabled: false },
            { note: 0, sampleNum: 0, ornamentNum: -1, samplePos: 0, ornamentPos: 0, envEnabled: false, envType: 15, enabled: false },
            { note: 0, sampleNum: 0, ornamentNum: -1, samplePos: 0, ornamentPos: 0, envEnabled: false, envType: 15, enabled: false }
        ],
        envBase: 0,
        envShape: 0,
        envShapeTrigger: false,
        pt3Noise: 0,
        globalTickCounter: 0,
        looped: false
    };

    var loopFrameAt = 0;
    var hasLooped = false;
    var estimatedFrames = numPositions * maxLines * delay;
    if (estimatedFrames < 50) estimatedFrames = 50;
    if (estimatedFrames > 360000) estimatedFrames = 360000;

    var VOLTBL = [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
        [0,0,0,0,0,0,1,1,1,1,1,2,2,2,2,2],
        [0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3],
        [0,0,0,0,1,1,1,2,2,2,3,3,3,4,4,4],
        [0,0,0,1,1,1,2,2,3,3,3,4,4,4,5,5],
        [0,0,0,1,1,2,2,3,3,3,4,4,5,5,6,6],
        [0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7],
        [0,0,1,1,2,2,3,3,4,5,5,6,6,7,7,8],
        [0,0,1,1,2,3,3,4,5,5,6,6,7,8,8,9],
        [0,0,1,2,2,3,4,4,5,6,6,7,8,8,9,10],
        [0,0,1,2,3,3,4,5,6,6,7,8,9,9,10,11],
        [0,0,1,2,3,4,4,5,6,7,8,8,9,11,11,12],
        [0,0,1,2,3,4,5,6,7,7,8,9,10,11,12,13],
        [0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],
        [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
    ];

    function getNoteFreq(note) {
        if (note < 0) note = 0;
        if (note > 95) note = 95;
        return ST_FREQ_TABLE[note];
    }

    function initState() {
        state.currentPos = 0;
        state.currentLine = 0;
        state.tickCounter = 0;
        state.delay = delay;
        state.envBase = 0;
        state.envShape = 0;
        state.envShapeTrigger = false;
        state.pt3Noise = 0;
        state.globalTickCounter = 0;
        state.looped = false;
        hasLooped = false;
        loopFrameAt = 0;

        for (var ch = 0; ch < 3; ch++) {
            var c = state.channels[ch];
            c.note = 0;
            c.sampleNum = 0;
            c.ornamentNum = -1;
            c.samplePos = 0;
            c.ornamentPos = 0;
            c.envEnabled = false;
            c.envType = 15;
            c.enabled = false;
        }
    }

    function advancePosition() {
        state.currentPos++;
        if (state.currentPos >= numPositions) {
            state.currentPos = loopPosition;
            state.looped = true;
            if (!hasLooped) {
                hasLooped = true;
                loopFrameAt = state.globalTickCounter;
            }
        }
        state.currentLine = 0;
    }

    function processLine() {
        var patNum = posList[state.currentPos].pattern;
        var lines = parsedPatterns[patNum];
        if (!lines) return;

        if (state.currentLine >= (patternLines[patNum] || 0)) {
            advancePosition();
            patNum = posList[state.currentPos].pattern;
            lines = parsedPatterns[patNum];
            if (!lines) return;
            state.currentLine = 0;
        }

        var line = lines[state.currentLine];
        if (!line) { state.currentLine++; return; }

        for (var ch = 0; ch < 3; ch++) {
            var c = state.channels[ch];

            if (line.sample[ch] > 0) {
                c.sampleNum = line.sample[ch];
            }
            if (line.ornament[ch] !== undefined) {
                c.ornamentNum = line.ornament[ch];
                c.envEnabled = false;
            }

            if (line.note[ch] === -2) {
                c.enabled = false;
                c.samplePos = 0;
                c.ornamentPos = 0;
            } else if (line.note[ch] >= 0) {
                c.enabled = true;
                c.note = line.note[ch];
                c.samplePos = 0;
                c.ornamentPos = 0;
            }

            if (line.envelope[ch] !== 15) {
                c.envEnabled = true;
                c.envType = line.envelope[ch];
                state.envBase = line.envFreq;
                state.envShape = line.envelope[ch];
                state.envShapeTrigger = true;
                c.ornamentNum = -1;
            }
        }

        state.currentLine++;
    }

    function playTick() {
        state.tickCounter--;
        if (state.tickCounter <= 0) {
            processLine();
            state.tickCounter = state.delay;
        }

        var tempMixer = 0;
        var regs = new Array(14);
        var addToEnv = 0;

        for (var ch = 0; ch < 3; ch++) {
            var c = state.channels[ch];
            var ton = 0;
            var amp = 0;

            if (c.enabled) {
                var samIdx = c.sampleNum;
                if (samIdx < 0 || samIdx > 15) samIdx = 0;
                var sam = samples[samIdx];

                if (c.samplePos >= sam.ticks.length) {
                    c.samplePos = sam.hasLoop ? sam.loopPos : sam.ticks.length - 1;
                }
                if (c.samplePos < 0) c.samplePos = 0;
                var tick = sam.ticks[c.samplePos];
                if (!tick) { tick = { addTon: 0, amplitude: 0, mixerTone: false, mixerNoise: false, noiseAdd: 0 }; }
                ton = tick.addTon;

                var noteWithOrn = c.note;
                var ornIdx = c.ornamentNum;
                if (ornIdx >= 0 && ornIdx <= 15) {
                    var orn = ornaments[ornIdx];
                    noteWithOrn = c.note + orn.items[c.ornamentPos];
                    if (noteWithOrn < 0) noteWithOrn = 0;
                    if (noteWithOrn > 95) noteWithOrn = 95;
                }

                ton = (ton + getNoteFreq(noteWithOrn)) & 0xFFF;

                amp = tick.amplitude;
                amp = VOLTBL[15][amp];
                if (c.envEnabled) amp |= 0x10;

                if (tick.mixerNoise) {
                    state.pt3Noise = tick.noiseAdd;
                } else {
                    addToEnv += tick.noiseAdd;
                }

                if (!tick.mixerTone)  tempMixer |= (1 << ch);
                if (!tick.mixerNoise) tempMixer |= (8 << ch);

                c.samplePos++;
                if (sam.hasLoop && c.samplePos >= sam.loopLen) c.samplePos = sam.loopPos;
                else if (!sam.hasLoop && c.samplePos >= 32) { c.enabled = false; }
                c.ornamentPos++;
                if (c.ornamentPos >= 32) c.ornamentPos = 16;
            }

            regs[ch * 2]     = ton & 0xFF;
            regs[ch * 2 + 1] = (ton >> 8) & 0xFF;
            regs[8 + ch] = amp;
        }

        regs[6] = state.pt3Noise & 0x1F;
        regs[7] = tempMixer;

        var envVal = state.envBase + addToEnv;
        regs[11] = envVal & 0xFF;
        regs[12] = (envVal >> 8) & 0xFF;
        regs[13] = state.envShapeTrigger ? state.envShape : 0xFF;
        state.envShapeTrigger = false;

        state.globalTickCounter++;

        return regs;
    }

    this.getFrameCount = function() { return estimatedFrames; };
    this.getLoopFrame  = function() { return loopFrameAt; };
    this.reset = function() { initState(); };
    this.computeLoopFrame = function() {
        initState();
        for (var i = 0; i < estimatedFrames; i++) {
            this.getNextFrame();
            if (state.looped) {
                var lf = i + 1;
                initState();
                return lf;
            }
        }
        initState();
        return 0;
    };
    this.getNumPositions = function() { return numPositions; };
    this.getLoopPos = function() { return loopPosition; };
    this.getDelay = function() { return delay; };
    this.getClockRate  = function() { return CLOCK; };
    this.getFrameRate  = function() { return FRAME_RATE; };
    this.getTrackFileName = function() { return fileName || ''; };
    this.getTrackName  = function() { return trackName; };
    this.getAuthorName = function() { return ''; };
    this.getTurbo      = function() { return false; };
    this.getNumChips   = function() { return 1; };
    this.getProgress   = function() {
        var k = state.globalTickCounter / estimatedFrames;
        if (k < 0) k = 0; if (k > 1) k = 1;
        return k;
    };

    this.setProgress = function(k) {
        if (k < 0) k = 0; if (k > 1) k = 1;
        var saved = Math.floor(k * estimatedFrames);
        if (Math.abs(state.globalTickCounter - saved) <= 1) return;
        initState();
        for (var i = 0; i < saved; i++) {
            this.getNextFrame();
            if (state.looped) {
                state.looped = false;
                state.currentPos = loopPosition;
            }
        }
    };

    this.getNextFrame = function() {
        var regs = playTick();
        var done = state.looped;
        if (done) state.looped = false;
        return [regs, [], [], done];
    };
}

return STCReader;
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = { STC: STCReader }; }
