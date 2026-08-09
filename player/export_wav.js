var fs = require('fs');
var path = require('path');

var args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage: node player/export_wav.js <file> [--stems]');
    console.log('  Supported: .stc, .pt3, .pt2, .asc, .tfc, .mtc');
    console.log('  --stems: export per-channel WAVs');
    process.exit(1);
}

var fileName = args[0];
var exportStems = args.indexOf('--stems') >= 0;
var filePath = path.resolve(fileName);
var buf = fs.readFileSync(filePath);
var baseName = path.basename(fileName, path.extname(fileName));

globalThis.DECIMATE_FACTOR = 8;
globalThis.FIR_SIZE = 192;
globalThis.DC_FILTER_SIZE = 1024;

var playerDir = __dirname;
eval(fs.readFileSync(path.join(playerDir, 'ayumi.js'), 'utf8'));
eval(fs.readFileSync(path.join(playerDir, 'opn.js'), 'utf8'));
eval(fs.readFileSync(path.join(playerDir, 'psg.js'), 'utf8'));
global.PT3Reader = require(path.join(playerDir, 'pt3.js')).PT3;
global.TFCReader = require(path.join(playerDir, 'tfc.js')).TFC;
var MTC = require(path.join(playerDir, 'mtc.js')).MTC;

var EXT = path.extname(fileName).toLowerCase();
var reader = null;
var dump = [];
var loopFrame = -1;
var frameRate = 50;
var clockRate = 1773400;
var opnClock = 0;
var chipTypes = null;

function readSingle(ctor, name) {
    reader = new ctor(buf.buffer, fileName);
    if (reader.error) { console.error('Error:', reader.error); process.exit(1); }
    frameRate = reader.getFrameRate();
    clockRate = reader.getClockRate();
    var estFc = reader.getFrameCount();
    var maxFc = Math.max(estFc * 5, frameRate * 120);
    for (var i = 0; i < maxFc; i++) {
        var r = reader.getNextFrame();
        if (r[3] && loopFrame < 0) loopFrame = i;
        if (loopFrame >= 0 && i >= Math.max(estFc, loopFrame)) break;
        dump.push({ a: r[0].slice(), b: [], c: [] });
    }
    if (loopFrame >= 0) dump.length = Math.min(dump.length, loopFrame + (name === 'pt3' ? 0 : 1));
    else if (dump.length > estFc) dump.length = estFc;
    chipTypes = ['ay'];
}

if (EXT === '.stc') {
    readSingle(require(path.join(playerDir, 'stc.js')).STC, 'stc');
} else if (EXT === '.pt3') {
    readSingle(require(path.join(playerDir, 'pt3.js')).PT3, 'pt3');
} else if (EXT === '.pt2') {
    readSingle(require(path.join(playerDir, 'pt2.js')).PT2, 'pt2');
} else if (EXT === '.asc') {
    readSingle(require(path.join(playerDir, 'asc.js')).ASC, 'asc');
} else if (EXT === '.tfc') {
    reader = new TFCReader(buf.buffer, fileName);
    if (reader.error) { console.error('Error:', reader.error); process.exit(1); }
    frameRate = reader.getFrameRate();
    clockRate = reader.getClockRate();
    opnClock = reader.getClockRate();
    var fc = reader.getFrameCount();
    for (var i = 0; i < fc + 1; i++) {
        var r = reader.getNextFrame();
        if (r[3] && loopFrame < 0) loopFrame = i;
        if (loopFrame >= 0) break;
        dump.push({ a: r[0].slice(), b: r[1].slice(), c: [] });
    }
    if (dump.length > fc) dump.length = fc;
    chipTypes = ['opn', 'opn'];
} else if (EXT === '.mtc') {
    reader = new MTC(buf.buffer, fileName);
    if (reader.error) { console.error('Error:', reader.error); process.exit(1); }
    frameRate = reader.getFrameRate();
    clockRate = reader.getClockRate();
    opnClock = reader.getOpnClockRate ? reader.getOpnClockRate() : 0;
    chipTypes = reader.getChipTypes ? reader.getChipTypes() : ['ay'];
    var mtcFc = reader.getFrameCount();
    for (var i = 0; i < mtcFc + 1; i++) {
        var r = reader.getNextFrame();
        if (r[r.length - 1] && loopFrame < 0) loopFrame = i;
        if (loopFrame >= 0) break;
        dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [], c: r[2] ? r[2].slice() : [], d: (r.length > 4 && r[3]) ? r[3].slice() : [] });
    }
} else {
    console.error('Unsupported format:', EXT);
    process.exit(1);
}

console.log('Frames:', dump.length, 'Loop:', loopFrame, 'Rate:', frameRate, 'Clock:', clockRate, 'Chips:', JSON.stringify(chipTypes), 'OpnClock:', opnClock);

function updateState(ay, r) {
    ay.setTone(0, ((r[1] << 8) | r[0]) || 2);
    ay.setTone(1, ((r[3] << 8) | r[2]) || 2);
    ay.setTone(2, ((r[5] << 8) | r[4]) || 2);
    ay.setNoise(r[6]);
    ay.setMixer(0, r[7] & 1, (r[7] >> 3) & 1, r[8] >> 4);
    ay.setMixer(1, (r[7] >> 1) & 1, (r[7] >> 4) & 1, r[9] >> 4);
    ay.setMixer(2, (r[7] >> 2) & 1, (r[7] >> 5) & 1, r[10] >> 4);
    ay.setVolume(0, r[8] & 0xf);
    ay.setVolume(1, r[9] & 0xf);
    ay.setVolume(2, r[10] & 0xf);
    ay.setEnvelope((r[12] << 8) | r[11]);
    if (r[13] != 0xff) ay.setEnvelopeShape(r[13]);
}

var SAMPLE_RATE = 44100;

function render(muteChannels) {
    var chipCount = chipTypes.length;
    var gens = [];
    for (var ci = 0; ci < chipCount; ci++) {
        if (chipTypes[ci] === 'opn') {
            gens.push({ kind: 'opn', chip: new OPN(opnClock || 3500000, SAMPLE_RATE) });
        } else {
            var a = new Ayumi();
            a.configure(false, clockRate, SAMPLE_RATE);
            a.firEnabled = true;
            gens.push({ kind: 'ay', chip: a });
        }
    }
    if (muteChannels) {
        for (var ci = 0; ci < chipCount; ci++) {
            var g = gens[ci];
            if (g.kind === 'ay') {
                for (var m = 0; m < 3; m++) {
                    if (muteChannels[ci * 3 + m]) {
                        g.chip.setVolume(m, 0);
                        g.chip.setMixer(m, 1, 1, 0);
                    }
                }
            }
        }
    }

    var samplesPerFrame = SAMPLE_RATE / frameRate;
    var totalSamples = Math.ceil(dump.length * samplesPerFrame);
    var left = new Float64Array(totalSamples);
    var right = new Float64Array(totalSamples);
    var idx = 0;
    var tmp = new Float64Array(3);

    for (var f = 0; f < dump.length; f++) {
        var e = dump[f];
        var srcs = [e.a, e.b, e.c, e.d];
        for (var ci = 0; ci < chipCount; ci++) {
            var s = srcs[ci];
            if (!s) continue;
            if (gens[ci].kind === 'opn') {
                for (var pr = 0; pr < s.length; pr++) gens[ci].chip.writeReg(s[pr][0], s[pr][1]);
            } else {
                updateState(gens[ci].chip, s);
            }
        }
        for (var sm = 0; sm < samplesPerFrame; sm++) {
            var ml = 0;
            var mr = 0;
            for (var ci = 0; ci < chipCount; ci++) {
                var g = gens[ci];
                var base = ci * 3;
                if (g.kind === 'opn') {
                    g.chip.renderSample(tmp);
                    for (var ch = 0; ch < 3; ch++) {
                        var amp = tmp[ch] / 32768;
                        if (muteChannels && muteChannels[base + ch]) continue;
                        ml += amp * 0.5;
                        mr += amp * 0.5;
                    }
                } else {
                    g.chip.process();
                    g.chip.removeDC();
                    ml += g.chip.left;
                    mr += g.chip.right;
                }
            }
            left[idx] = ml / chipCount;
            right[idx] = mr / chipCount;
            idx++;
        }
    }
    return { left: left, right: right, length: idx };
}

function findMax(left, right, len) {
    var mx = 0;
    for (var i = 0; i < len; i++) {
        var l = Math.abs(left[i]);
        var r = Math.abs(right[i]);
        if (l > mx) mx = l;
        if (r > mx) mx = r;
    }
    return mx || 1;
}

function writeWav(filePath, left, right, len, sampleRate) {
    var maxVal = findMax(left, right, len);
    var scale = 0.9 / maxVal;
    var dataSize = len * 4;
    var fileSize = 44 + dataSize;
    var buf = Buffer.alloc(fileSize);

    buf.write('RIFF', 0);
    buf.writeUInt32LE(fileSize - 8, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(2, 22);
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(sampleRate * 4, 28);
    buf.writeUInt16LE(4, 32);
    buf.writeUInt16LE(16, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(dataSize, 40);

    var offset = 44;
    for (var i = 0; i < len; i++) {
        var l = Math.max(-1, Math.min(1, left[i] * scale));
        var r = Math.max(-1, Math.min(1, right[i] * scale));
        buf.writeInt16LE(Math.round(l * 32767), offset);
        buf.writeInt16LE(Math.round(r * 32767), offset + 2);
        offset += 4;
    }

    fs.writeFileSync(filePath, buf);
    console.log('Written', filePath, '-', (len / sampleRate).toFixed(1) + 's');
}

var outDir = path.dirname(filePath);

var mix = render(null);
writeWav(path.join(outDir, baseName + '_mix.wav'), mix.left, mix.right, mix.length, SAMPLE_RATE);

if (exportStems) {
    var totalCh = chipTypes.length * 3;
    for (var ch = 0; ch < totalCh; ch++) {
        var mute = new Array(totalCh).fill(true);
        mute[ch] = false;
        var stem = render(mute);
        writeWav(path.join(outDir, baseName + '_ch' + (ch + 1) + '.wav'), stem.left, stem.right, stem.length, SAMPLE_RATE);
    }
}
