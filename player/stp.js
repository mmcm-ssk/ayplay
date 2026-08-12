var STPReader = (function() {

var STP_FREQ_TABLE = [
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

var ID_STRING = 'KSA SOFTWARE COMPILATION OF ';

var MIN_PATTERN_SIZE = 5;
var MAX_PATTERN_SIZE = 64;
var MAX_POSITIONS_COUNT = 256;
var MAX_PATTERNS_COUNT = 32;
var MAX_SAMPLES_COUNT = 15;
var MAX_ORNAMENTS_COUNT = 16;
var MAX_SAMPLE_SIZE = 32;
var MAX_ORNAMENT_SIZE = 32;

var DEFAULT_LINE = { level: 0, noise: 0, toneMask: true, noiseMask: true, envMask: true, vibrato: 0 };

function STPReader(buffer, fileName) {
    var data = new Uint8Array(buffer);

    function u16(off) { return data[off] | (data[off + 1] << 8); }
    function i8(off)  { var v = data[off]; return v >= 0x80 ? v - 0x100 : v; }
    function i16(off) { var v = u16(off); return v >= 0x8000 ? v - 0x10000 : v; }

    if (data.length < 10) { this.error = 'File too small'; return; }

    var tempo = data[0];
    var positionsPtr = u16(1);
    var patternsPtr  = u16(3);
    var ornamentsPtr = u16(5);
    var samplesPtr   = u16(7);
    var fixesCount   = data[9];

    if (tempo < 3 || tempo > 15) { this.error = 'Invalid tempo'; return; }
    if (positionsPtr >= data.length || patternsPtr >= data.length ||
        ornamentsPtr >= data.length || samplesPtr >= data.length) {
        this.error = 'Invalid offsets'; return;
    }

    var hasId = false;
    var title = '';
    if (positionsPtr >= 63) {
        hasId = true;
        for (var i = 0; i < ID_STRING.length; i++) {
            if (data[10 + i] !== ID_STRING.charCodeAt(i)) { hasId = false; break; }
        }
        if (hasId) {
            var tb = '';
            for (var i = 38; i < 63; i++) {
                if (data[i] >= 32 && data[i] <= 127) tb += String.fromCharCode(data[i]);
            }
            title = tb.trim();
        }
    }
    var hdrSize = hasId ? 63 : 10;

    var firstData = u16(patternsPtr);
    if (firstData < hdrSize) { this.error = 'Invalid first pattern'; return; }
    var unfixDelta = fixesCount !== 0 ? 0 : (firstData - hdrSize);

    function getRawObjectOffset(tablePtr, index) {
        var o = tablePtr + index * 2;
        if (o + 2 > data.length) return -1;
        var off = u16(o) - unfixDelta;
        if (off < 0 || off + 2 > data.length) return -1;
        return off;
    }

    var positions = [];
    var loopPosition = 0;
    (function parsePositions() {
        if (positionsPtr + 2 > data.length) throw new Error('positions oob');
        var length = data[positionsPtr];
        if (length === 0 || length > MAX_POSITIONS_COUNT) throw new Error('bad positions length');
        loopPosition = data[positionsPtr + 1];
        if (positionsPtr + 2 + length * 2 > data.length) throw new Error('positions oob');
        for (var i = 0; i < length; i++) {
            var b = data[positionsPtr + 2 + i * 2];
            if (b % 6 !== 0) throw new Error('bad pattern offset');
            positions.push({ pattern: b / 6, transposition: i8(positionsPtr + 3 + i * 2) });
        }
    })();

    var parsedPatterns = {};
    var maxPatternSize = 0;
    var usedSamples = {};
    var usedOrnaments = {};

    function parseChannel(st) {
        var cell = { commands: [] };
        while (st.off < data.length) {
            var cmd = data[st.off++];
            if (cmd === 0) continue;
            else if (cmd <= 0x60) {
                cell.note = cmd - 1;
                cell.enabled = true;
                break;
            } else if (cmd <= 0x6f) {
                cell.sample = cmd - 0x61;
            } else if (cmd <= 0x7f) {
                cell.ornament = cmd - 0x70;
                cell.commands.push({ type: 1 });
                cell.commands.push({ type: 2, p1: 0 });
            } else if (cmd <= 0xbf) {
                st.period = cmd - 0x80;
            } else if (cmd <= 0xcf) {
                if (cmd !== 0xc0) {
                    cell.commands.push({ type: 0, p1: cmd - 0xc0, p2: st.off < data.length ? data[st.off++] : 0 });
                } else {
                    cell.commands.push({ type: 0, p1: 0, p2: 0 });
                }
                cell.ornament = 0;
                cell.commands.push({ type: 2, p1: 0 });
            } else if (cmd <= 0xdf) {
                cell.enabled = false;
                break;
            } else if (cmd <= 0xef) {
                break;
            } else if (cmd === 0xf0) {
                cell.commands.push({ type: 2, p1: i8(st.off++) });
            } else {
                cell.volume = cmd - 0xf1;
            }
        }
        return cell;
    }

    function parsePattern(patIdx) {
        var base = patternsPtr + patIdx * 6;
        if (base + 6 > data.length) return null;
        var cursors = [];
        for (var i = 0; i < 3; i++) {
            var off = u16(base + i * 2);
            if (off < hdrSize + unfixDelta || off >= data.length) return null;
            cursors.push(off - unfixDelta);
        }
        var chans = [];
        for (var i = 0; i < 3; i++) chans.push({ off: cursors[i], period: 0, counter: 0 });

        function hasLine() {
            for (var i = 0; i < 3; i++) {
                var st = chans[i];
                if (st.counter) continue;
                if (st.off >= data.length || (i === 0 && data[st.off] === 0)) return false;
            }
            return true;
        }

        var lines = [];
        var lineIdx = 0;
        while (lineIdx < MAX_PATTERN_SIZE) {
            var linesToSkip = Math.min(chans[0].counter, chans[1].counter, chans[2].counter);
            if (linesToSkip) {
                for (var i = 0; i < 3; i++) chans[i].counter -= linesToSkip;
                lineIdx += linesToSkip;
            }
            if (!hasLine()) break;
            var line = {};
            for (var i = 0; i < 3; i++) {
                var st = chans[i];
                if (st.counter) { st.counter--; continue; }
                var cell = parseChannel(st);
                if (cell.sample !== undefined) usedSamples[cell.sample] = true;
                if (cell.ornament !== undefined) usedOrnaments[cell.ornament] = true;
                line['c' + i] = cell;
                st.counter = st.period;
            }
            lines[lineIdx] = line;
            lineIdx++;
        }
        var size = Math.max(lineIdx, MIN_PATTERN_SIZE);
        return { lines: lines, size: size };
    }

    var hasValidPatterns = false;
    var usedPatterns = {};
    for (var i = 0; i < positions.length; i++) {
        usedPatterns[positions[i].pattern] = true;
    }
    for (var patKey in usedPatterns) {
        var pat = parsePattern(parseInt(patKey, 10));
        if (pat) {
            parsedPatterns[patKey] = pat;
            if (pat.size > maxPatternSize) maxPatternSize = pat.size;
            hasValidPatterns = true;
        }
    }
    if (!hasValidPatterns) { this.error = 'No valid patterns'; return; }

    usedSamples[0] = true;
    usedOrnaments[0] = true;

    function parseSample(idx) {
        var off = getRawObjectOffset(samplesPtr, idx);
        if (off < 0) return null;
        var loop = i8(off);
        var size = i8(off + 1);
        if (size < 0) size = 0;
        if (size > MAX_SAMPLE_SIZE) size = MAX_SAMPLE_SIZE;
        var lines = [];
        for (var i = 0; i < size; i++) {
            var l = off + 2 + i * 4;
            if (l + 4 > data.length) { lines.push(DEFAULT_LINE); continue; }
            var laf = data[l];
            var naf = data[l + 1];
            lines.push({
                level: laf & 15,
                toneMask: (laf & 16) !== 0,
                noiseMask: (laf & 128) !== 0,
                envMask: (naf & 1) !== 0,
                noise: (naf & 62) >> 1,
                vibrato: i16(l + 2)
            });
        }
        var lo = loop < 0 ? size : loop;
        if (lo > size) lo = size;
        return { lines: lines, loop: lo };
    }

    function parseOrnament(idx) {
        var off = getRawObjectOffset(ornamentsPtr, idx);
        if (off < 0) return null;
        var loop = i8(off);
        var size = i8(off + 1);
        if (size < 0) size = 0;
        if (size > MAX_ORNAMENT_SIZE) size = MAX_ORNAMENT_SIZE;
        var lines = [];
        for (var i = 0; i < size; i++) {
            var l = off + 2 + i;
            if (l >= data.length) lines.push(0);
            else lines.push(i8(l));
        }
        var lo = loop < 0 ? size : loop;
        if (lo > size) lo = size;
        return { lines: lines, loop: lo };
    }

    var samples = {};
    for (var key in usedSamples) {
        var smp = parseSample(parseInt(key, 10));
        if (smp) samples[key] = smp;
    }
    var ornaments = {};
    for (var key2 in usedOrnaments) {
        var orn = parseOrnament(parseInt(key2, 10));
        if (orn) ornaments[key2] = orn;
    }

    function getSampleLine(sam, pos) {
        if (sam && pos < sam.lines.length) return sam.lines[pos];
        return DEFAULT_LINE;
    }
    function getOrnamentLine(orn, pos) {
        if (orn && pos < orn.lines.length) return orn.lines[pos];
        return 0;
    }

    var numPositions = positions.length;
    if (loopPosition >= numPositions) loopPosition = 0;

    var CLOCK = 1773400;
    var FRAME_RATE = 50;

    var state = {
        currentPos: 0,
        currentLine: 0,
        tickCounter: 0,
        channels: [
            { enabled: false, envelope: false, volume: 0, note: 0, sampleNum: 0, ornamentNum: 0, posInSample: 0, posInOrnament: 0, tonSlide: 0, glissade: 0 },
            { enabled: false, envelope: false, volume: 0, note: 0, sampleNum: 0, ornamentNum: 0, posInSample: 0, posInOrnament: 0, tonSlide: 0, glissade: 0 },
            { enabled: false, envelope: false, volume: 0, note: 0, sampleNum: 0, ornamentNum: 0, posInSample: 0, posInOrnament: 0, tonSlide: 0, glissade: 0 }
        ],
        globalTickCounter: 0,
        looped: false
    };

    var noise = 0;
    var envTone = 0;
    var envShape = 0;
    var envShapeTrigger = false;

    var loopFrameAt = 0;
    var hasLooped = false;

    var estimatedFrames = numPositions * maxPatternSize * tempo;
    if (estimatedFrames < 50) estimatedFrames = 50;
    if (estimatedFrames > 360000) estimatedFrames = 360000;

    function initState() {
        state.currentPos = 0;
        state.currentLine = 0;
        state.tickCounter = 0;
        state.globalTickCounter = 0;
        state.looped = false;
        noise = 0;
        envTone = 0;
        envShape = 0;
        envShapeTrigger = false;
        hasLooped = false;
        loopFrameAt = 0;
        for (var ch = 0; ch < 3; ch++) {
            var c = state.channels[ch];
            c.enabled = false;
            c.envelope = false;
            c.volume = 0;
            c.note = 0;
            c.sampleNum = 0;
            c.ornamentNum = 0;
            c.posInSample = 0;
            c.posInOrnament = 0;
            c.tonSlide = 0;
            c.glissade = 0;
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

    function applyCell(ch, cell) {
        var c = state.channels[ch];
        if (cell.enabled !== undefined) {
            c.enabled = cell.enabled;
            c.posInSample = 0;
            c.posInOrnament = 0;
        }
        if (cell.note !== undefined) {
            c.note = cell.note;
            c.posInSample = 0;
            c.posInOrnament = 0;
            c.tonSlide = 0;
        }
        if (cell.sample !== undefined) {
            c.sampleNum = cell.sample;
            c.posInSample = 0;
        }
        if (cell.ornament !== undefined) {
            c.ornamentNum = cell.ornament;
            c.posInOrnament = 0;
        }
        if (cell.volume !== undefined) {
            c.volume = cell.volume;
        }
        for (var i = 0; i < cell.commands.length; i++) {
            var cmd = cell.commands[i];
            if (cmd.type === 0) {
                if (cmd.p1) {
                    envTone = cmd.p2;
                    envShape = cmd.p1;
                    envShapeTrigger = true;
                }
                c.envelope = true;
            } else if (cmd.type === 1) {
                c.envelope = false;
            } else if (cmd.type === 2) {
                c.glissade = cmd.p1;
            }
        }
    }

    function processLine() {
        if (state.currentLine >= parsedPatterns[positions[state.currentPos].pattern].size) {
            advancePosition();
        }
        var pat = parsedPatterns[positions[state.currentPos].pattern];
        var line = pat.lines[state.currentLine];
        if (line) {
            for (var ch = 0; ch < 3; ch++) {
                var cell = line['c' + ch];
                if (cell) applyCell(ch, cell);
            }
        }
        state.currentLine++;
    }

    function renderRegs() {
        var regs = new Array(14);
        var mixer = 0;
        var trans = positions[state.currentPos].transposition;
        for (var ch = 0; ch < 3; ch++) {
            var c = state.channels[ch];
            var ton = 0;
            var vol = 0;
            if (c.enabled) {
                var sam = samples[c.sampleNum];
                var sline = getSampleLine(sam, c.posInSample);
                var orn = ornaments[c.ornamentNum];
                var ornLine = getOrnamentLine(orn, c.posInOrnament);
                c.tonSlide += c.glissade;
                vol = sline.level - c.volume;
                if (vol < 0) vol = 0;
                else if (vol > 15) vol = 15;
                if (sline.envMask && c.envelope) vol |= 0x10;
                var halftones = c.note + trans + (c.envelope ? 0 : ornLine);
                if (halftones < 0) halftones = 0;
                if (halftones > 95) halftones = 95;
                ton = (STP_FREQ_TABLE[halftones] + c.tonSlide + sline.vibrato) & 0xFFF;
                if (sline.toneMask) mixer |= (1 << ch);
                if (!sline.noiseMask) noise = sline.noise;
                else mixer |= (8 << ch);
                c.posInOrnament++;
                if (orn) {
                    if (c.posInOrnament >= orn.lines.length) c.posInOrnament = orn.loop;
                } else {
                    c.posInOrnament = 0;
                }
                c.posInSample++;
                if (sam && sam.lines.length > 0) {
                    if (c.posInSample >= sam.lines.length) {
                        var lo = sam.loop;
                        if (lo < c.posInSample) c.posInSample = lo;
                        else c.enabled = false;
                    }
                }
            } else {
                vol = 0;
                mixer |= (1 << ch) | (8 << ch);
            }
            regs[ch * 2] = ton & 0xFF;
            regs[ch * 2 + 1] = (ton >> 8) & 0xFF;
            regs[8 + ch] = vol;
        }
        regs[6] = noise & 0x1F;
        regs[7] = mixer;
        regs[11] = envTone & 0xFF;
        regs[12] = (envTone >> 8) & 0xFF;
        regs[13] = envShapeTrigger ? envShape : 0xFF;
        envShapeTrigger = false;
        state.globalTickCounter++;
        return regs;
    }

    function playTick() {
        state.tickCounter--;
        if (state.tickCounter <= 0) {
            processLine();
            state.tickCounter = tempo;
        }
        return renderRegs();
    }

    this.getFrameCount = function() { return estimatedFrames; };
    this.getLoopFrame  = function() { return loopFrameAt; };
    this.reset = function() { initState(); };
    this.computeLoopFrame = function() {
        initState();
        var scanFrames = estimatedFrames + maxPatternSize * tempo;
        for (var i = 0; i < scanFrames; i++) {
            var done = this.getNextFrame()[3];
            if (done) {
                initState();
                return i;
            }
        }
        initState();
        return 0;
    };
    this.getNumPositions = function() { return numPositions; };
    this.getLoopPos = function() { return loopPosition; };
    this.getDelay = function() { return tempo; };
    this.getClockRate  = function() { return CLOCK; };
    this.getFrameRate  = function() { return FRAME_RATE; };
    this.getTrackFileName = function() { return fileName || ''; };
    this.getTrackName  = function() { return title; };
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

return STPReader;
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = { STP: STPReader }; }
