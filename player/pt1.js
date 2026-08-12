var PT1Reader = (function() {

var PT1_FREQ_TABLE = [
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

var MIN_PATTERN_SIZE = 5;
var MAX_PATTERN_SIZE = 64;
var MAX_POSITIONS_COUNT = 255;
var MAX_PATTERNS_COUNT = 32;
var MAX_SAMPLES_COUNT = 16;
var MAX_ORNAMENTS_COUNT = 16;
var MAX_SAMPLE_SIZE = 64;
var ORNAMENT_SIZE = 64;
var MIN_SIZE = 256;
var MAX_SIZE = 0x2800;

var DEFAULT_LINE = { level: 0, noise: 0, toneMask: true, noiseMask: true, vibrato: 0 };

function PT1Reader(buffer, fileName) {
    var data = new Uint8Array(buffer);

    function u16(off) { return data[off] | (data[off + 1] << 8); }
    function i8(off)  { var v = data[off]; return v >= 0x80 ? v - 0x100 : v; }

    if (data.length < MIN_SIZE || data.length > MAX_SIZE) { this.error = 'File too small'; return; }

    var tempo = data[0];
    var length = data[1];
    var loopPosition = data[2];
    var patternsOffset = u16(67);

    if (tempo < 2 || tempo > 15) { this.error = 'Invalid tempo'; return; }
    if (length < 1 || length > 255 || loopPosition > 254) { this.error = 'Invalid header'; return; }

    var positions = [];
    var headerSize = 0;
    var posOff = 99;
    if (posOff >= data.length) { this.error = 'Invalid positions'; return; }
    for (; posOff < data.length && data[posOff] !== 0xff; posOff++) {
        var b = data[posOff];
        if (b >= MAX_PATTERNS_COUNT) { this.error = 'Invalid position'; return; }
        positions.push(b);
        if (positions.length > MAX_POSITIONS_COUNT) { this.error = 'Invalid positions'; return; }
    }
    if (posOff >= data.length || data[posOff] !== 0xff) { this.error = 'Invalid positions'; return; }
    headerSize = posOff + 1;
    if (headerSize < 101 || headerSize > 355) { this.error = 'Invalid header'; return; }
    if (patternsOffset !== headerSize) { this.error = 'Invalid patterns offset'; return; }
    if (positions.length < 1) { this.error = 'No positions'; return; }
    if (loopPosition >= positions.length) loopPosition = 0;

    var title = '';
    for (var t = 69; t < 99; t++) {
        if (data[t] >= 32 && data[t] <= 127) title += String.fromCharCode(data[t]);
    }
    title = title.trim();

    var parsedPatterns = {};
    var maxPatternSize = 0;
    var usedSamples = {};
    var usedOrnaments = {};
    var usedPatterns = {};
    var maxUsedPattern = 0;
    for (var i = 0; i < positions.length; i++) {
        usedPatterns[positions[i]] = true;
        if (positions[i] > maxUsedPattern) maxUsedPattern = positions[i];
    }
    var minOffset = patternsOffset + maxUsedPattern * 6;
    if (minOffset + 6 > data.length) { this.error = 'Invalid patterns table'; return; }

    function parseChannel(st) {
        st.lineTempo = undefined;
        var cell = { commands: [] };
        while (st.off < data.length) {
            var cmd = data[st.off++];
            if (cmd <= 0x5f) {
                cell.note = cmd;
                cell.enabled = true;
                break;
            } else if (cmd <= 0x6f) {
                cell.sample = cmd - 0x60;
            } else if (cmd <= 0x7f) {
                cell.ornament = cmd - 0x70;
            } else if (cmd === 0x80) {
                cell.enabled = false;
                break;
            } else if (cmd === 0x81) {
                cell.commands.push({ type: 1 });
            } else if (cmd <= 0x8f) {
                var type = cmd - 0x81;
                var tone = data[st.off] | (data[st.off + 1] << 8);
                st.off += 2;
                cell.commands.push({ type: 0, p1: type, p2: tone });
            } else if (cmd === 0x90) {
                break;
            } else if (cmd <= 0xa0) {
                st.lineTempo = cmd - 0x91;
            } else if (cmd <= 0xb0) {
                cell.volume = cmd - 0xa1;
            } else {
                st.period = cmd - 0xb1;
            }
        }
        return cell;
    }

    function parsePattern(patIdx) {
        var base = patternsOffset + patIdx * 6;
        if (base + 6 > data.length) return null;
        var chans = [];
        for (var i = 0; i < 3; i++) {
            var off = u16(base + i * 2);
            if (off < minOffset || off >= data.length) return null;
            chans.push({ off: off, period: 0, counter: 0 });
        }

        function hasLine() {
            for (var i = 0; i < 3; i++) {
                var st = chans[i];
                if (st.counter) continue;
                if (st.off >= data.length || (i === 0 && data[st.off] === 0xff)) return false;
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
                if (st.lineTempo !== undefined) line.tempo = st.lineTempo;
                line['c' + i] = cell;
                st.counter = st.period;
            }
            lines[lineIdx] = line;
            lineIdx++;
        }
        var size = Math.max(lineIdx, MIN_PATTERN_SIZE);
        return { lines: lines, size: size };
    }

    for (var patKey in usedPatterns) {
        var pat = parsePattern(parseInt(patKey, 10));
        if (!pat) { this.error = 'Invalid pattern'; return; }
        parsedPatterns[patKey] = pat;
        if (pat.size > maxPatternSize) maxPatternSize = pat.size;
    }

    usedSamples[0] = true;
    usedOrnaments[0] = true;

    function parseSampleLine(src) {
        var lhv = src[0], naf = src[1], lov = src[2];
        var vibrato = ((lhv & 0xf0) << 4) | lov;
        if (!(naf & 32)) vibrato = -vibrato;
        return {
            level: lhv & 15,
            noise: naf & 31,
            toneMask: (naf & 64) !== 0,
            noiseMask: (naf & 128) !== 0,
            vibrato: vibrato
        };
    }

    function parseSample(idx) {
        var off = u16(3 + idx * 2);
        if (off === 0) {
            return { lines: [parseSampleLine([data[0], data[1], data[2]])], loop: 0 };
        }
        if (off + 2 > data.length) return null;
        var size = data[off];
        var loop = data[off + 1];
        var availSize = data.length - off;
        var usedSize = 2 + Math.min(size * 3, 256);
        var fullSize = usedSize <= availSize ? size : Math.floor((availSize - 2) / 3);
        var lines = [];
        lines.length = size;
        for (var i = 0; i < size; i++) {
            if (i < fullSize) {
                var l = off + 2 + ((i * 3) & 0xff);
                lines[i] = parseSampleLine([data[l], data[l + 1], data[l + 2]]);
            } else {
                lines[i] = DEFAULT_LINE;
            }
        }
        var lo = loop;
        if (lo > size) lo = size;
        return { lines: lines, loop: lo };
    }

    function parseOrnament(idx) {
        var off = u16(35 + idx * 2);
        if (off === 0) {
            return { lines: [i8(0)] };
        }
        if (off >= data.length) return null;
        var availSize = data.length - off;
        var fullSize = Math.min(ORNAMENT_SIZE, availSize);
        var lines = [];
        lines.length = ORNAMENT_SIZE;
        for (var i = 0; i < ORNAMENT_SIZE; i++) {
            lines[i] = i < fullSize ? i8(off + i) : 0;
        }
        return { lines: lines };
    }

    var samples = {};
    var hasValidSamples = false;
    for (var s = 0; s < MAX_SAMPLES_COUNT; s++) {
        var so = u16(3 + s * 2);
        if (so !== 0 && so + 2 <= data.length) hasValidSamples = true;
        var smp = parseSample(s);
        if (smp) samples[s] = smp;
        else samples[s] = { lines: [], loop: 0 };
    }
    if (!hasValidSamples) { this.error = 'Invalid samples'; return; }

    var ornaments = {};
    for (var o = 0; o < MAX_ORNAMENTS_COUNT; o++) {
        var orn = parseOrnament(o);
        if (orn) ornaments[o] = orn;
        else ornaments[o] = { lines: [] };
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

    var CLOCK = 1773400;
    var FRAME_RATE = 50;

    var state = {
        currentPos: 0,
        currentLine: 0,
        tickCounter: 0,
        tempo: tempo,
        channels: [
            { enabled: false, envelope: false, volume: 15, note: 0, sampleNum: 0, ornamentNum: 0, posInSample: 0 },
            { enabled: false, envelope: false, volume: 15, note: 0, sampleNum: 0, ornamentNum: 0, posInSample: 0 },
            { enabled: false, envelope: false, volume: 15, note: 0, sampleNum: 0, ornamentNum: 0, posInSample: 0 }
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
        state.tempo = tempo;
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
            c.volume = 15;
            c.note = 0;
            c.sampleNum = 0;
            c.ornamentNum = 0;
            c.posInSample = 0;
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
        }
        if (cell.note !== undefined) {
            c.note = cell.note;
            c.posInSample = 0;
        }
        if (cell.sample !== undefined) {
            c.sampleNum = cell.sample;
        }
        if (cell.ornament !== undefined) {
            c.ornamentNum = cell.ornament;
        }
        if (cell.volume !== undefined) {
            c.volume = cell.volume;
        }
        for (var i = 0; i < cell.commands.length; i++) {
            var cmd = cell.commands[i];
            if (cmd.type === 0) {
                envTone = cmd.p2;
                envShape = cmd.p1;
                envShapeTrigger = true;
                c.envelope = true;
            } else if (cmd.type === 1) {
                c.envelope = false;
            }
        }
    }

    function processLine() {
        if (state.currentLine >= parsedPatterns[positions[state.currentPos]].size) {
            advancePosition();
        }
        var pat = parsedPatterns[positions[state.currentPos]];
        var line = pat.lines[state.currentLine];
        if (line) {
            if (line.tempo !== undefined) state.tempo = line.tempo;
            for (var ch = 0; ch < 3; ch++) {
                var cell = line['c' + ch];
                if (cell) applyCell(ch, cell);
            }
        }
        state.currentLine++;
    }

    function getVolume(volume, level) {
        return ((volume * 17 + (volume > 7 ? 1 : 0)) * level + 128) >> 8;
    }

    function renderRegs() {
        var regs = new Array(14);
        var mixer = 0;
        for (var ch = 0; ch < 3; ch++) {
            var c = state.channels[ch];
            var ton = 0;
            var vol = 0;
            if (c.enabled) {
                var sam = samples[c.sampleNum];
                var sline = getSampleLine(sam, c.posInSample);
                var orn = ornaments[c.ornamentNum];
                var ornLine = getOrnamentLine(orn, c.posInSample);
                var halftones = c.note + ornLine;
                if (halftones < 0) halftones = 0;
                if (halftones > 95) halftones = 95;
                ton = (PT1_FREQ_TABLE[halftones] + sline.vibrato + (halftones === 46 ? 1 : 0)) & 0xFFF;
                if (sline.toneMask) mixer |= (1 << ch);
                vol = getVolume(c.volume, sline.level);
                if (c.envelope) vol |= 0x10;
                if (!sline.noiseMask) noise = sline.noise;
                else mixer |= (8 << ch);
                c.posInSample++;
                if (c.posInSample >= sam.lines.length) {
                    c.posInSample = sam.loop;
                }
            } else {
                vol = 0;
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
            state.tickCounter = state.tempo;
        }
        return renderRegs();
    }

    this.getFrameCount = function() { return estimatedFrames; };
    this.getLoopFrame  = function() { return loopFrameAt; };
    this.reset = function() { initState(); };
    this.computeLoopFrame = function() {
        initState();
        var scanFrames = Math.max(estimatedFrames * 2, numPositions * maxPatternSize * 16);
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

return PT1Reader;
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = { PT1: PT1Reader }; }
