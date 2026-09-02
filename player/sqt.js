// SQ-Tracker (SQT) player.
// Парсер взят из sources/sqt-gemini.js (класс SQTrackerDecoder), рендер воспроизводит
// эталонную логику zxtune (module/players/aym/sqtracker.cpp + tracking.cpp).
//
// Формат кадра (как в psc.js):
//   [0..5]  tone A/B/C (lo, hi)
//   [6]     noise
//   [7]     mixer (биты 0-2: выкл тон A/B/C, 3-5: выкл шум A/B/C)
//   [8..10] volume (бит 4 = режим огибающей)
//   [11,12] огибающая tone
//   [13]    форма огибающей (255 = не писать R13)

class SQTrackerDecoder {
    constructor(buffer) {
        this.view = new DataView(buffer);
        this.uint8 = new Uint8Array(buffer);

        this.SAMPLE_SIZE = 32;
        this.ORNAMENT_SIZE = 32;

        this.header = {
            size: this.view.getUint16(0, true),
            samplesOffset: this.view.getUint16(2, true),
            ornamentsOffset: this.view.getUint16(4, true),
            patternsOffset: this.view.getUint16(6, true),
            positionsOffset: this.view.getUint16(8, true),
            loopPositionOffset: this.view.getUint16(10, true)
        };

        this.delta = this.header.samplesOffset - 10;
    }

    parse() {
        const result = {
            meta: { program: "SQ-Tracker" },
            positions: { loop: 0, lines: [] },
            samples: {},
            ornaments: {},
            patterns: {}
        };

        this.parsePositions(result);

        for (let i = 1; i <= 26; i++) {
            try { this.parseSample(i, result); } catch (e) {}
            try { this.parseOrnament(i, result); } catch (e) {}
        }

        const usedPatterns = new Set();
        result.positions.lines.forEach(pos => {
            pos.channels.forEach(ch => {
                if (ch.pattern > 0) usedPatterns.add(ch.pattern);
            });
        });

        usedPatterns.forEach(patIndex => {
            this.parsePattern(patIndex, result);
        });

        return result;
    }

    parsePositions(result) {
        const loopPositionOffset = this.header.loopPositionOffset - this.delta;
        let posOffset = this.header.positionsOffset - this.delta;
        let pos = 0;

        while (posOffset < this.uint8.length) {
            if (posOffset === loopPositionOffset) result.positions.loop = pos;

            const patC = this.uint8[posOffset];
            const patB = this.uint8[posOffset + 2];
            const patA = this.uint8[posOffset + 4];

            if ((patC & 127) === 0 || (patB & 127) === 0 || (patA & 127) === 0) break;

            result.positions.lines.push({
                tempo: this.uint8[posOffset + 6],
                channels: [
                    this.parsePositionChannel(posOffset + 4),
                    this.parsePositionChannel(posOffset + 2),
                    this.parsePositionChannel(posOffset)
                ]
            });
            posOffset += 7;
            pos++;
        }
    }

    parsePositionChannel(offset) {
        const patternVal = this.uint8[offset];
        const transpAttVal = this.uint8[offset + 1];
        const transp = transpAttVal >> 4;

        return {
            pattern: patternVal & 127,
            transposition: transp < 9 ? transp : -(transp - 9) - 1,
            attenuation: transpAttVal & 15,
            enabledEffects: (patternVal & 128) !== 0
        };
    }

    parseSample(index, result) {
        const entryAddr = this.header.samplesOffset + index * 2;
        if (entryAddr - this.delta + 2 > this.uint8.length) return;
        let cursor = this.view.getUint16(entryAddr - this.delta, true) - this.delta;

        const loop = this.uint8[cursor++];
        const loopSize = this.uint8[cursor++];
        const lines = [];

        for (let i = 0; i < this.SAMPLE_SIZE; i++) {
            const volNoise = this.uint8[cursor++];
            const flags = this.uint8[cursor++];
            const delta = this.uint8[cursor++];

            const level = volNoise & 15;
            const noise = ((volNoise & 240) >> 3) | ((flags & 128) >> 7);
            let calcDelta = delta | ((flags & 15) << 8);

            lines.push({
                level, noise,
                enableNoise: (flags & 32) !== 0,
                enableTone: (flags & 64) !== 0,
                toneDeviation: (flags & 16) !== 0 ? calcDelta : -calcDelta
            });
        }

        result.samples[index] = {
            loop: Math.min(loop, this.SAMPLE_SIZE),
            loopLimit: Math.min(loop + loopSize, this.SAMPLE_SIZE),
            lines
        };
    }

    parseOrnament(index, result) {
        const entryAddr = this.header.ornamentsOffset + index * 2;
        if (entryAddr - this.delta + 2 > this.uint8.length) return;
        let cursor = this.view.getUint16(entryAddr - this.delta, true) - this.delta;

        const loop = this.uint8[cursor++];
        const loopSize = this.uint8[cursor++];
        const lines = [];

        for (let i = 0; i < this.ORNAMENT_SIZE; i++) {
            lines.push(this.view.getInt8(cursor++));
        }

        result.ornaments[index] = {
            loop: Math.min(loop, this.ORNAMENT_SIZE),
            loopLimit: Math.min(loop + loopSize, this.ORNAMENT_SIZE),
            lines
        };
    }

    parsePattern(index, result) {
        const entryAddr = this.header.patternsOffset + index * 2;
        const patternAddr = this.view.getUint16(entryAddr - this.delta, true);
        let cursor = patternAddr - this.delta;

        const patSize = this.uint8[cursor++];
        const lines = [];

        let state = { counter: 0, lastNote: 0, lastNoteStart: 0, repeatLastNote: false, cursor: cursor };

        for (let lineIdx = 0; lineIdx < patSize; ++lineIdx) {
            let lineCommands = {};

            const builder = {
                setRest: () => lineCommands.rest = true,
                setNote: (note) => lineCommands.note = note,
                setSample: (sample) => lineCommands.sample = sample,
                setOrnament: (ornament) => lineCommands.ornament = ornament,
                setEnvelope: (type, val) => lineCommands.envelope = { type, val },
                setGlissade: (step) => lineCommands.glissade = step,
                setAttenuation: (att) => lineCommands.attenuation = att,
                setAttenuationAddon: (add) => lineCommands.attenuationAddon = add,
                setGlobalAttenuation: (att) => lineCommands.globalAttenuation = att,
                setGlobalAttenuationAddon: (add) => lineCommands.globalAttenuationAddon = add,
                setTempo: (tempo) => lineCommands.tempo = tempo,
                setTempoAddon: (add) => lineCommands.tempoAddon = add
            };

            if (state.counter > 0) {
                state.counter--;
                if (state.repeatLastNote) {
                    this.parseNote(state.lastNoteStart, state, builder);
                }
            } else {
                this.parseLine(state, builder);
            }

            lines.push(lineCommands);
        }

        result.patterns[index] = { size: patSize, lines: lines };
    }

    parseLine(state, builder) {
        state.repeatLastNote = false;
        const cmd = this.uint8[state.cursor++];

        if (cmd <= 0x5f) {
            state.lastNote = cmd;
            state.lastNoteStart = state.cursor - 1;
            builder.setNote(cmd);
            this.parseNoteParameters(state.cursor, state, builder);
        } else if (cmd <= 0x6e) {
            this.parseEffect(cmd - 0x60, this.uint8[state.cursor++], builder);
        } else if (cmd === 0x6f) {
            builder.setRest();
        } else if (cmd <= 0x7f) {
            builder.setRest();
            this.parseEffect(cmd - 0x6f, this.uint8[state.cursor++], builder);
        } else if (cmd <= 0x9f) {
            const addon = cmd & 15;
            if ((cmd & 16) !== 0) state.lastNote -= addon;
            else state.lastNote += addon;
            builder.setNote(state.lastNote);
            this.parseNote(state.lastNoteStart, state, builder);
        } else if (cmd <= 0xbf) {
            state.counter = cmd & 15;
            if ((cmd & 16) !== 0) {
                state.repeatLastNote = (state.counter !== 0);
                this.parseNote(state.lastNoteStart, state, builder);
            }
        } else {
            state.lastNoteStart = state.cursor - 1;
            builder.setSample(cmd & 31);
        }
    }

    parseNote(cursor, state, builder) {
        const saved = state.cursor;
        const cmd = this.uint8[cursor];
        if (cmd < 0x80) {
            this.parseNoteParameters(cursor + 1, state, builder);
        } else {
            builder.setSample(cmd & 31);
        }
        state.cursor = saved;
    }

    parseNoteParameters(start, state, builder) {
        let cursor = start;
        const cmd = this.uint8[cursor++];

        if ((cmd & 128) !== 0) {
            const sample = (cmd >> 1) & 31;
            if (sample !== 0) builder.setSample(sample);

            if ((cmd & 64) !== 0) {
                const param = this.uint8[cursor++];
                const ornament = (param >> 4) | ((cmd & 1) << 4);
                if (ornament !== 0) builder.setOrnament(ornament);

                const effect = param & 15;
                if (effect !== 0) this.parseEffect(effect, this.uint8[cursor++], builder);
            }
        } else {
            this.parseEffect(cmd, this.uint8[cursor++], builder);
        }
        state.cursor = cursor;
    }

    parseEffect(code, param, builder) {
        switch (code - 1) {
            case 0:
                builder.setAttenuation(param & 15); break;
            case 1:
                builder.setAttenuationAddon(param > 127 ? param - 256 : param); break;
            case 2:
                builder.setGlobalAttenuation(param); break;
            case 3:
                builder.setGlobalAttenuationAddon(param > 127 ? param - 256 : param); break;
            case 4:
                builder.setTempo((param & 31) !== 0 ? param & 31 : 32); break;
            case 5:
                builder.setTempoAddon(param); break;
            case 6:
                builder.setGlissade(-param); break;
            case 7:
                builder.setGlissade(param); break;
            default:
                builder.setEnvelope((code - 1) & 15, param); break;
        }
    }
}

class DualSQTReader {
    constructor(r1, r2, fname) {
        this._r1 = r1;
        this._r2 = r2;
        this._fname = fname;
        var fc1 = r1.getFrameCount(), fc2 = r2.getFrameCount();
        this._frameCount = Math.max(fc1, fc2);
        this._curFrame = 0;
    }
    getFrameCount() { return this._frameCount; }
    getFrameRate() { return this._r1.getFrameRate(); }
    getClockRate() { return this._r1.getClockRate(); }
    getTurbo() { return true; }
    getNumChips() { return 2; }
    getTrackFileName() { return this._fname; }
    getTrackName() { return this._r1.getTrackName(); }
    getAuthorName() { return this._r1.getAuthorName(); }
    getLoopFrame() { return 0; }
    getNumPositions() { return this._r1.getNumPositions(); }
    getLoopPos() { return this._r1.getLoopPos(); }
    getDelay() { return 0; }
    getNextFrame() {
        var f1 = this._r1.getNextFrame();
        var f2 = this._r2.getNextFrame();
        this._curFrame++;
        var looped = this._curFrame >= this._frameCount;
        return [f1[0], f2[0], [], looped];
    }
}

var SQTReader = (function () {
    // SQ-Tracker frequency table (zxtune core/plugins/players/ay/freq_tables.cpp)
    var FREQ_TABLE = [
        0xd5d, 0xc9c, 0xbe7, 0xb3c, 0xa9b, 0xa02, 0x973, 0x8eb, 0x86b, 0x7f2, 0x780, 0x714,
        0x6ae, 0x64e, 0x5f4, 0x59e, 0x54f, 0x501, 0x4b9, 0x475, 0x435, 0x3f9, 0x3c0, 0x38a,
        0x357, 0x327, 0x2fa, 0x2cf, 0x2a7, 0x281, 0x25d, 0x23b, 0x21b, 0x1fc, 0x1e0, 0x1c5,
        0x1ac, 0x194, 0x17d, 0x168, 0x153, 0x140, 0x12e, 0x11d, 0x10d, 0x0fe, 0x0f0, 0x0e2,
        0x0d6, 0x0ca, 0x0be, 0x0b4, 0x0aa, 0x0a0, 0x097, 0x08f, 0x087, 0x07f, 0x078, 0x071,
        0x06b, 0x065, 0x05f, 0x05a, 0x055, 0x050, 0x04c, 0x047, 0x043, 0x040, 0x03c, 0x039,
        0x035, 0x032, 0x030, 0x02d, 0x02a, 0x028, 0x026, 0x024, 0x022, 0x020, 0x01e, 0x01c,
        0x01b, 0x019, 0x018, 0x016, 0x015, 0x014, 0x013, 0x012, 0x011, 0x010, 0x00f, 0x00e
    ];

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    function newChannel() {
        return {
            note: 0, attenuation: 0, transposition: 0,
            curSample: null, sampleTick: 0, samplePos: 0,
            curOrnament: null, ornamentTick: 0, ornamentPos: 0,
            envelope: false, sliding: 0, glissade: 0
        };
    }

    return function (buf, fname) {
        var ab;
        if (buf instanceof ArrayBuffer) { ab = buf; }
        else { var t = new Uint8Array(buf); ab = t.buffer; }

        var firstSize = new Uint16Array(ab.slice(0, 2))[0];

        if (ab.byteLength > firstSize + 12) {
            var subBuf = ab.slice(firstSize);
            try {
                var subDec = new SQTrackerDecoder(subBuf);
                var subParsed = subDec.parse();
                if (subParsed.positions.lines.length > 0) {
                    var r1 = new SQTReader(ab.slice(0, firstSize), fname);
                    var r2 = new SQTReader(subBuf, fname);
                    if (!r1.error && !r2.error) {
                        return new DualSQTReader(r1, r2, fname);
                    }
                }
            } catch (e) {}
        }

        var pp = new SQTrackerDecoder(ab);
        var parsed = pp.parse();

        var positions = parsed.positions.lines;
        if (positions.length === 0) { this.error = "No positions"; return; }
        var loopPosIdx = clamp(parsed.positions.loop, 0, positions.length - 1);
        var patterns = parsed.patterns;
        var samples = parsed.samples;
        var ornaments = parsed.ornaments;

        var title = positions.length ? "" : "";
        title = (fname || "").replace(/^.*[\\\/]/, "").replace(/\.sqt$/i, "");

        function getPattern(idx) { return patterns[idx] || { size: 0, lines: [] }; }
        function getCell(idx, row) {
            var p = patterns[idx];
            if (!p || row >= p.lines.length) return null;
            return p.lines[row];
        }

        var dump = [];
        var chans = [];
        for (var c = 0; c < 3; c++) chans.push(newChannel());
        var envTone = 0, envType = 0, noiseReg = 0;

        function applyCell(cell, ch) {
            var cs = chans[ch];
            if (cell.rest) { cs.curSample = null; cs.curOrnament = null; }
            if (cell.note !== undefined) cs.note = cell.note;
            if (cell.sample !== undefined && cell.rest !== true) {
                var s = samples[cell.sample];
                cs.curSample = s ? s : null;
                cs.sampleTick = 32;
                cs.samplePos = 0;
                cs.curOrnament = null;
                cs.envelope = false;
                cs.glissade = 0;
            }
            if (cell.ornament !== undefined && cell.rest !== true) {
                var o = ornaments[cell.ornament];
                cs.curOrnament = o ? o : null;
                cs.ornamentTick = 32;
                cs.ornamentPos = 0;
            }
            if (cell.glissade !== undefined) { cs.glissade = cell.glissade; cs.sliding = 0; }
            if (cell.attenuation !== undefined) cs.attenuation = cell.attenuation;
            if (cell.attenuationAddon !== undefined) cs.attenuation = (cs.attenuation + cell.attenuationAddon) & 15;
            if (cell.globalAttenuation !== undefined) {
                for (var k = 0; k < 3; k++) chans[k].attenuation = cell.globalAttenuation;
            }
            if (cell.globalAttenuationAddon !== undefined) {
                for (var k2 = 0; k2 < 3; k2++) chans[k2].attenuation = (chans[k2].attenuation + cell.globalAttenuationAddon) & 15;
            }
            if (cell.envelope !== undefined) {
                envType = cell.envelope.type;
                envTone = cell.envelope.val;
                cs.envelope = true;
            }
        }

        function synth(cs, ch, fr) {
            if (!cs.curSample) {
                fr[8 + ch] = 0;
                fr[7] |= (1 << ch) | (1 << (ch + 3));
                return;
            }
            var line = cs.curSample.lines[cs.samplePos];
            cs.samplePos++;

            var level = clamp(line.level - cs.attenuation, 0, 15);
            if (line.level === 0 && cs.envelope) level |= 0x10;
            fr[8 + ch] = level;

            if (line.enableNoise) {
                noiseReg = line.noise;
            } else {
                fr[7] |= (1 << (ch + 3));
            }
            if (!line.enableTone) {
                fr[7] |= (1 << ch);
            }

            var note = cs.note + cs.transposition;
            if (cs.curOrnament) {
                var o = cs.curOrnament;
                note += o.lines[cs.ornamentPos];
                cs.ornamentPos++;
                if (!(--cs.ornamentTick)) {
                    if (o.loop !== 32) {
                        cs.ornamentPos = o.loop;
                        cs.ornamentTick = o.loopLimit - cs.ornamentPos;
                    } else {
                        cs.ornamentPos = cs.curSample.loop;
                        cs.ornamentTick = cs.curSample.loopLimit - cs.ornamentPos;
                    }
                }
            }

            var offset = line.toneDeviation + (cs.glissade !== 0 ? cs.sliding : 0);
            var noteIdx = clamp(note, 0, 95);
            var tone = (FREQ_TABLE[noteIdx] + offset) & 0xfff;
            fr[ch * 2] = tone & 0xff;
            fr[ch * 2 + 1] = (tone >> 8) & 0x0f;

            if (!(--cs.sampleTick)) {
                cs.samplePos = cs.curSample.loop;
                cs.sampleTick = cs.curSample.loopLimit - cs.samplePos;
                if (cs.samplePos === 32) { cs.curSample = null; cs.curOrnament = null; }
            }
            cs.sliding += cs.glissade;
        }

        var prevTone = [0, 0, 0, 0, 0, 0];

        function makeFrame() {
            return [prevTone[0], prevTone[1], prevTone[2], prevTone[3], prevTone[4], prevTone[5], 0, 0, 0, 0, 0, 0, 0, 255];
        }

        for (var p = 0; p < positions.length; p++) {
            var pos = positions[p];
            var tempo = pos.tempo;

            for (var cIn = 0; cIn < 3; cIn++) {
                chans[cIn].attenuation = pos.channels[cIn].attenuation;
                chans[cIn].transposition = pos.channels[cIn].transposition;
            }

            var sizes = [
                getPattern(pos.channels[0].pattern).size,
                getPattern(pos.channels[1].pattern).size,
                getPattern(pos.channels[2].pattern).size
            ];
            var rows = Math.max(sizes[0], sizes[1], sizes[2]);

            for (var r = 0; r < rows; r++) {
                var envChange = false;
                for (var ci = 0; ci < 3; ci++) {
                    var ch = 2 - ci;
                    var fx = pos.channels[ch].enabledEffects;
                    var cell = getCell(pos.channels[ch].pattern, r);
                    if (!cell) continue;

                    var nt = (fx && cell.tempo) ? cell.tempo : 0;
                    if (nt) tempo = nt;

                    var hasData = false;
                    for (var kk in cell) { hasData = true; break; }
                    if (hasData) {
                        if (fx && cell.tempoAddon) tempo = (tempo + cell.tempoAddon) & 31;
                        if (cell.envelope !== undefined) envChange = true;
                        applyCell(cell, ch);
                    }
                }

                var effTempo = (tempo !== 0) ? tempo : 32;
                for (var t = 0; t < effTempo; t++) {
                    var fr = makeFrame();
                    if (envChange) { fr[13] = envType; envChange = false; }
                    for (var c2 = 0; c2 < 3; c2++) {
                        synth(chans[2 - c2], 2 - c2, fr);
                    }
                    fr[11] = envTone & 0xff;
                    fr[12] = (envTone >> 8) & 0xff;
                    fr[6] = noiseReg;
                    prevTone[0] = fr[0]; prevTone[1] = fr[1];
                    prevTone[2] = fr[2]; prevTone[3] = fr[3];
                    prevTone[4] = fr[4]; prevTone[5] = fr[5];
                    dump.push(fr);
                }
            }
        }

        var frameCount = dump.length;
        var curFrame = 0;

        this.getFrameCount = function () { return frameCount; };
        this.getFrameRate = function () { return 50; };
        this.getClockRate = function () { return 1773400; };
        this.getTurbo = function () { return false; };
        this.getNumChips = function () { return 1; };
        this.getTrackFileName = function () { return fname; };
        this.getTrackName = function () { return title; };
        this.getAuthorName = function () { return ""; };
        this.getLoopFrame = function () { return 0; };
        this.getNumPositions = function () { return positions.length; };
        this.getLoopPos = function () { return loopPosIdx; };
        this.getDelay = function () { return 0; };
        this.getNextFrame = function () {
            if (curFrame >= frameCount) return [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255], [], [], true];
            var r = dump[curFrame];
            var looped = ++curFrame >= frameCount;
            return [r, [], [], looped];
        };
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = { SQT: SQTReader }; }
