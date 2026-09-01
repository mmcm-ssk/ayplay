'use strict';

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '..', 'player');

const OPN = require(path.join(SRC_DIR, 'opn.js')).OPN;
global.Z80 = require(path.join(SRC_DIR, 'z80core.js'));
global.pako = require(path.join(SRC_DIR, 'pako_inflate.min.js'));
if (typeof performance === 'undefined') global.performance = require('perf_hooks').performance;
global.document = { hidden: true };
global.requestAnimationFrame = function(cb) { cb(); };
globalThis.window = globalThis;
require(path.join(SRC_DIR, 'ayumi.js'));
const Ayumi = globalThis.Ayumi;
const { MTC } = require(path.join(SRC_DIR, 'aym_reader.js'));

globalThis.self = globalThis;
function loadReader(file, exportName, globalName) {
  try {
    const mod = require(path.join(SRC_DIR, file));
    if (mod[exportName]) global[globalName] = mod[exportName];
  } catch (e) {
    console.warn('reader not available:', file, '-', e.message);
  }
}
loadReader('pt3.js', 'PT3', 'PT3Reader');
loadReader('psg.js', 'PSG', 'PSGReader');
loadReader('tfc.js', 'TFC', 'TFCReader');
loadReader('fym.js', 'FYM', 'FYMReader');
loadReader('stc.js', 'STC', 'STCReader');
loadReader('asc.js', 'ASC', 'ASCReader');
loadReader('pt2.js', 'PT2', 'PT2Reader');
loadReader('vt2.js', 'VT2Player', 'VT2Player');
loadReader('pt1.js', 'PT1', 'PT1Reader');
loadReader('stp.js', 'STP', 'STPReader');
loadReader('ay.js', 'AYReader', 'AYReader');
loadReader('snd2psg.js', 'SndToPsg', 'SndToPsg');

const BIN = 1000;
const SR = 4000;
const SUPPORTED = ['.mtc', '.ay', '.pt3', '.stc', '.ym', '.fym', '.psg', '.snd', '.tfm', '.asc', '.pt2', '.vt2', '.tfc', '.stp', '.pt1'];

function binOp(arr, op) {
  const n = arr.length;
  const d = new Array(BIN).fill(0);
  if (n === 0) return d;
  if (n <= BIN) {
    for (let i = 0; i < BIN; i++) d[i] = arr[(i * n / BIN)|0];
    return d;
  }
  for (let i = 0; i < n; i++) {
    const idx = (i * BIN / n)|0;
    if (op(arr[i], d[idx])) d[idx] = arr[i];
  }
  return d;
}

function binMax(arr) { return binOp(arr, (a, b) => a > b); }
function binMin(arr) { return binOp(arr, (a, b) => a < b); }

function updateState(renderer, r) {
  renderer.setTone(0, ((r[1] << 8) | r[0]) || 2);
  renderer.setTone(1, ((r[3] << 8) | r[2]) || 2);
  renderer.setTone(2, ((r[5] << 8) | r[4]) || 2);
  renderer.setNoise(r[6]);
  renderer.setMixer(0, r[7] & 1, (r[7] >> 3) & 1, r[8] >> 4);
  renderer.setMixer(1, (r[7] >> 1) & 1, (r[7] >> 4) & 1, r[9] >> 4);
  renderer.setMixer(2, (r[7] >> 2) & 1, (r[7] >> 5) & 1, r[10] >> 4);
  renderer.setVolume(0, r[8] & 0xf);
  renderer.setVolume(1, r[9] & 0xf);
  renderer.setVolume(2, r[10] & 0xf);
  renderer.setEnvelope((r[12] << 8) | r[11]);
  if (r[13] != 0xff) renderer.setEnvelopeShape(r[13]);
}

function generateWaveform(dump, opts) {
  const chipCount = opts.chipCount;
  const chipTypes = opts.chipTypes;
  const fc = opts.fc;
  const fr = opts.fr || 50;
  const clock = opts.clock;
  const opnClock = opts.opnClock || 3500000;
  const chCount = chipCount * 3;
  const samplesPerFrame = Math.max(2, Math.floor(SR / fr));

  const ayGens = [];
  const opnGens = [];
  for (let ci = 0; ci < chipCount; ci++) {
    if (chipTypes[ci] === 'opn') {
      opnGens.push(new OPN(opnClock, SR));
      ayGens.push(null);
    } else {
      const a = new Ayumi();
      a.configure(false, clock, SR);
      ayGens.push(a);
      opnGens.push(null);
    }
  }

  const opnTmp = [0, 0, 0];
  const chMin = [];
  const chMax = [];
  const allAmps = new Array(fc).fill(0);
  for (let ch = 0; ch < chCount; ch++) {
    chMin.push(new Array(fc).fill(0));
    chMax.push(new Array(fc).fill(0));
  }

  for (let f = 0; f < fc; f++) {
    const entry = dump[f];
    const srcs = [entry.a, entry.b, entry.c, entry.d];
    for (let ci = 0; ci < chipCount; ci++) {
      const src = srcs[ci];
      if (!src) continue;
      const base = ci * 3;
      if (chipTypes[ci] === 'opn') {
        const og = opnGens[ci];
        // MTC/OPN exports c0/c1 as arrays of [reg, val] pairs (see processor.js:463);
        // keep a flat-array fallback for any other OPN source format.
        if (src.length && Array.isArray(src[0])) {
          for (let pr = 0; pr < src.length; pr++) og.writeReg(src[pr][0], src[pr][1]);
        } else {
          for (let pr = 0; pr + 1 < src.length; pr += 2) og.writeReg(src[pr], src[pr + 1]);
        }
        for (let s = 0; s < samplesPerFrame; s++) {
          og.renderSample(opnTmp);
          for (let ch = 0; ch < 3; ch++) {
            const v = opnTmp[ch] / 32768;
            if (v > chMax[base + ch][f]) chMax[base + ch][f] = v;
            if (v < chMin[base + ch][f]) chMin[base + ch][f] = v;
          }
        }
      } else {
        const agn = ayGens[ci];
        updateState(agn, src);
        for (let s = 0; s < samplesPerFrame; s++) {
          agn.process();
          for (let ch = 0; ch < 3; ch++) {
            const v = agn.chanOut[ch].left;
            if (v > chMax[base + ch][f]) chMax[base + ch][f] = v;
            if (v < chMin[base + ch][f]) chMin[base + ch][f] = v;
          }
        }
      }
    }
    let frameMax = 0;
    for (let ch = 0; ch < chCount; ch++) {
      const a = Math.abs(chMax[ch][f]);
      if (a > frameMax) frameMax = a;
    }
    allAmps[f] = frameMax;
  }

  const bo = binMax(allAmps);
  let gm = 0.001;
  for (let i = 0; i < bo.length; i++) if (bo[i] > gm) gm = bo[i];
  const data = bo.map(function (v) { return v / gm; });

  const channels = [];
  for (let ch = 0; ch < chCount; ch++) {
    const cmx = binMax(chMax[ch]);
    const cmn = binMin(chMin[ch]);
    let cgm = 0.001;
    for (let i = 0; i < cmx.length; i++) {
      if (cmx[i] > cgm) cgm = cmx[i];
      if (-cmn[i] > cgm) cgm = -cmn[i];
    }
    const d = new Array(2000);
    for (let i = 0; i < 1000; i++) {
      d[2 * i] = cmn[i] / cgm;
      d[2 * i + 1] = cmx[i] / cgm;
    }
    channels.push(d);
  }

  return { data: data, channels: channels, endFrame: fc - 1 };
}

function parseMTC(filePath) {
  const buf = fs.readFileSync(filePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const reader = new MTC(ab, filePath);
  if (reader.error) throw new Error(reader.error);
  const fc = reader.getFrameCount();
  const fr = reader.getFrameRate();
  const dump = new Array(fc);
  for (let f = 0; f < fc; f++) {
    const frame = reader.getNextFrame();
    dump[f] = { a: frame[0], b: frame[1], c: frame[2], d: frame[3] };
  }
  return {
    dump: dump,
    fc: fc,
    fr: fr,
    clock: reader.getClockRate(),
    opnClock: reader.getOpnClockRate(),
    chipCount: reader.getNumChips(),
    chipTypes: reader.getChipTypes()
  };
}

function parseTrack(filePath, sub) {
  const ext = path.extname(filePath).toLowerCase();
  const buf = fs.readFileSync(filePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  if (ext === '.mtc') return parseMTC(filePath);
  if (ext === '.pt3') {
    const reader = new PT3Reader(ab, filePath);
    const estFc = reader.getFrameCount();
    const fr = reader.getFrameRate();
    const clock = reader.getClockRate();
    const turbo = reader.getTurbo();
    const chipCount = reader.getNumChips ? reader.getNumChips() : (turbo ? 2 : 1);
    const maxFc = Math.min(Math.max(estFc * 5, (fr || 50) * 120), 18000);
    const dump = [];
    let lf = -1;
    for (let i = 0; i < maxFc; i++) {
      const r = reader.getNextFrame();
      if (r[r.length - 1] && lf < 0) lf = i;
      if (lf >= 0) break;
      dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [], c: r[2] ? r[2].slice() : [] });
    }
    if (lf >= 0) {
      const effectiveEnd = Math.min(dump.length, lf);
      if (effectiveEnd < dump.length) dump.length = effectiveEnd;
    } else if (dump.length > estFc) {
      dump.length = estFc;
    }
    return { dump: dump, fc: dump.length, fr: fr, clock: clock, chipCount: chipCount, chipTypes: new Array(chipCount).fill('ay') };
  }
  if (ext === '.stc') {
    const reader = new STCReader(ab, filePath);
    const estFc = reader.getFrameCount();
    const fr = reader.getFrameRate();
    const clock = reader.getClockRate();
    const maxFc = Math.min(Math.max(estFc * 5, (fr || 50) * 120), 18000);
    const dump = [];
    let lf = -1;
    for (let i = 0; i < maxFc; i++) {
      const r = reader.getNextFrame();
      if (r[r.length - 1] && lf < 0) lf = i;
      if (lf >= 0) break;
      dump.push({ a: r[0].slice(), b: [] });
    }
    let dumpLen = dump.length;
    if (lf >= 0) {
      const effectiveEnd = Math.min(dumpLen, lf);
      if (effectiveEnd < dumpLen) dump.length = effectiveEnd;
    } else if (dumpLen > estFc) {
      dump.length = estFc;
    }
    return { dump: dump, fc: dump.length, fr: fr, clock: clock, chipCount: 1, chipTypes: ['ay'] };
  }
  if (ext === '.ym' || ext === '.fym') {
    const reader = new FYMReader(ab, filePath);
    const fc = reader.getFrameCount();
    const fr = reader.getFrameRate();
    const clock = reader.getClockRate();
    const dump = [];
    for (let i = 0; i < fc; i++) {
      const r = reader.getNextFrame();
      dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [] });
    }
    const cc = reader.getNumChips ? reader.getNumChips() : (reader.getTurbo && reader.getTurbo() ? 2 : 1);
    return { dump: dump, fc: fc, fr: fr, clock: clock, chipCount: cc, chipTypes: new Array(cc).fill('ay') };
  }
  if (ext === '.psg' || ext === '.snd') {
    let psgData = ab;
    if (ext === '.snd') {
      const fileBytes = new Int8Array(buf);
      const sndParser = new SndToPsg(fileBytes);
      psgData = new Uint8Array(sndParser.exec).buffer;
    }
    const reader = new PSGReader(psgData, filePath);
    const fc = reader.getFrameCount();
    const fr = reader.getFrameRate();
    const clock = reader.getClockRate();
    const dump = [];
    for (let i = 0; i < fc; i++) {
      const r = reader.getNextFrame();
      dump.push({ a: r[0].slice(), b: [] });
    }
    return { dump: dump, fc: fc, fr: fr, clock: clock, chipCount: 1, chipTypes: ['ay'] };
  }
  if (ext === '.tfc') {
    const reader = new TFCReader(ab, filePath);
    if (reader.error) throw new Error(reader.error);
    const fc = reader.getFrameCount();
    const fr = reader.getFrameRate();
    const clock = reader.getClockRate();
    const chipCount = reader.getNumChips ? reader.getNumChips() : 2;
    const dump = [];
    for (let i = 0; i < fc; i++) {
      const r = reader.getNextFrame();
      dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [] });
    }
    return { dump: dump, fc: fc, fr: fr, clock: clock, chipCount: chipCount, chipTypes: new Array(chipCount).fill('opn'), opnClock: clock };
  }
  if (ext === '.ay') {
    const reader = new AYReader(ab, filePath, (sub != null && sub >= 0) ? sub : -1);
    if (reader.error) throw new Error(reader.error);
    const fr = reader.getFrameRate();
    const clock = reader.getClockRate();
    const dump = [];
    reader.run(null, function() {
      const fc = reader.getFrameCount();
      for (let i = 0; i < fc; i++) {
        const r = reader.getNextFrame();
        dump.push({ a: r[0].slice(), b: [] });
      }
    }, null);
    return { dump: dump, fc: dump.length, fr: fr, clock: clock, chipCount: 1, chipTypes: ['ay'] };
  }
  if (ext === '.asc') {
    const reader = new ASCReader(ab, filePath);
    const estFc = reader.getFrameCount();
    const fr = reader.getFrameRate();
    const clock = reader.getClockRate();
    const maxFc = Math.min(Math.max(estFc * 5, (fr || 50) * 120), 18000);
    const dump = [];
    let lf = -1;
    for (let i = 0; i < maxFc; i++) {
      const r = reader.getNextFrame();
      if (r[r.length - 1] && lf < 0) lf = i;
      if (lf >= 0) break;
      dump.push({ a: r[0].slice(), b: [] });
    }
    if (lf >= 0) {
      const effectiveEnd = Math.min(dump.length, lf);
      if (effectiveEnd < dump.length) dump.length = effectiveEnd;
    } else if (dump.length > estFc) {
      dump.length = estFc;
    }
    return { dump: dump, fc: dump.length, fr: fr, clock: clock, chipCount: 1, chipTypes: ['ay'] };
  }
  if (ext === '.pt2') {
    const reader = new PT2Reader(ab, filePath);
    const estFc = reader.getFrameCount();
    const fr = reader.getFrameRate();
    const clock = reader.getClockRate();
    const maxFc = Math.min(Math.max(estFc * 5, (fr || 50) * 120), 18000);
    const dump = [];
    let lf = -1;
    for (let i = 0; i < maxFc; i++) {
      const r = reader.getNextFrame();
      if (r[r.length - 1] && lf < 0) lf = i;
      if (lf >= 0) break;
      dump.push({ a: r[0].slice(), b: [] });
    }
    if (lf >= 0) {
      const effectiveEnd = Math.min(dump.length, lf);
      if (effectiveEnd < dump.length) dump.length = effectiveEnd;
    } else if (dump.length > estFc) {
      dump.length = estFc;
    }
    return { dump: dump, fc: dump.length, fr: fr, clock: clock, chipCount: 1, chipTypes: ['ay'] };
  }
  if (ext === '.vt2') {
    const reader = new VT2Player(ab, filePath);
    const estFc = reader.getFrameCount();
    const fr = reader.getFrameRate();
    const clock = reader.getClockRate();
    const turbo = reader.getTurbo();
    const chipCount = reader.getNumChips ? reader.getNumChips() : (turbo ? 2 : 1);
    const maxFc = Math.min(Math.max(estFc * 5, (fr || 50) * 120), 18000);
    const dump = [];
    let lf = -1;
    for (let i = 0; i < maxFc; i++) {
      const r = reader.getNextFrame();
      if (r[r.length - 1] && lf < 0) lf = i;
      if (lf >= 0) break;
      dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [], c: r[2] ? r[2].slice() : [] });
    }
    if (lf >= 0) {
      const effectiveEnd = Math.min(dump.length, lf);
      if (effectiveEnd < dump.length) dump.length = effectiveEnd;
    } else if (dump.length > estFc) {
      dump.length = estFc;
    }
    return { dump: dump, fc: dump.length, fr: fr, clock: clock, chipCount: chipCount, chipTypes: new Array(chipCount).fill('ay') };
  }
  if (ext === '.stp') {
    const reader = new STPReader(ab, filePath);
    const estFc = reader.getFrameCount();
    const fr = reader.getFrameRate();
    const clock = reader.getClockRate();
    const dump = [];
    let lf = -1;
    const maxFc = Math.min(Math.max(estFc * 2, (fr || 50) * 120), 18000);
    for (let i = 0; i < maxFc; i++) {
      const r = reader.getNextFrame();
      if (r[r.length - 1] && lf < 0) lf = i;
      if (lf >= 0) break;
      dump.push({ a: r[0].slice(), b: [] });
    }
    let dumpLen = dump.length;
    if (lf >= 0) {
      const effectiveEnd = Math.min(dumpLen, lf);
      if (effectiveEnd < dumpLen) dump.length = effectiveEnd;
    } else if (dumpLen > estFc) {
      dump.length = estFc;
    }
    return { dump: dump, fc: dump.length, fr: fr, clock: clock, chipCount: 1, chipTypes: ['ay'] };
  }
  if (ext === '.pt1') {
    const reader = new PT1Reader(ab, filePath);
    const estFc = reader.getFrameCount();
    const fr = reader.getFrameRate();
    const clock = reader.getClockRate();
    const dump = [];
    let lf = -1;
    const maxFc = Math.min(Math.max(estFc * 2, (fr || 50) * 120), 18000);
    for (let i = 0; i < maxFc; i++) {
      const r = reader.getNextFrame();
      if (r[r.length - 1] && lf < 0) lf = i;
      if (lf >= 0) break;
      dump.push({ a: r[0].slice(), b: [] });
    }
    let dumpLen = dump.length;
    if (lf >= 0) {
      const effectiveEnd = Math.min(dumpLen, lf);
      if (effectiveEnd < dumpLen) dump.length = effectiveEnd;
    } else if (dumpLen > estFc) {
      dump.length = estFc;
    }
    return { dump: dump, fc: dump.length, fr: fr, clock: clock, chipCount: 1, chipTypes: ['ay'] };
  }
  return null;
}

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return; }
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
}

function main() {
  const musicDir = process.argv[2] || path.resolve(__dirname, '..');
  const outDir = process.argv[3] || path.resolve(__dirname, '..', 'waveforms');
  fs.mkdirSync(outDir, { recursive: true });

  const files = [];
  walk(musicDir, files);

  let done = 0;
  let skipped = 0;
  for (const fp of files) {
    const ext = path.extname(fp).toLowerCase();
    if (SUPPORTED.indexOf(ext) < 0) continue;
    const rel = path.relative(musicDir, fp).split(path.sep).join('/');
    if (rel.indexOf('waveforms/') === 0 || rel.indexOf('source/') === 0) continue;
    const relDir = path.dirname(rel);
    const baseName = path.basename(rel);
    const outDirFull = path.join(outDir, relDir);
    fs.mkdirSync(outDirFull, { recursive: true });

    let subSongs = [null];
    if (ext === '.ay') {
      try {
        const probeBuf = fs.readFileSync(fp);
        const probeAb = probeBuf.buffer.slice(probeBuf.byteOffset, probeBuf.byteOffset + probeBuf.byteLength);
        const probe = new AYReader(probeAb, fp, -1);
        if (probe.getNumSubsongs && probe.getNumSubsongs() > 1) {
          const n = probe.getNumSubsongs();
          subSongs = [];
          for (let i = 0; i < n; i++) subSongs.push(i);
        }
      } catch (e) {}
    }

    for (const sub of subSongs) {
      const outName = baseName + (sub != null ? '#' + sub : '') + '.json';
      const outPath = path.join(outDirFull, outName);
      if (fs.existsSync(outPath)) { skipped++; continue; }

      console.log('Processing:', rel + (sub != null ? ' #' + sub : ''));
      let parsed = null;
      try { parsed = parseTrack(fp, sub); }
      catch (e) { console.warn('skip (parse failed):', rel + (sub != null ? ' #' + sub : ''), '-', e.message); skipped++; continue; }
      if (!parsed) { console.warn('skip (unsupported format):', rel); skipped++; continue; }

      const wf = generateWaveform(parsed.dump, parsed);
      fs.writeFileSync(outPath, JSON.stringify(wf));
      if (sub === 0 && subSongs.length > 1) {
        const basePath = path.join(outDirFull, baseName + '.json');
        if (!fs.existsSync(basePath)) fs.writeFileSync(basePath, JSON.stringify(wf));
      }
      done++;
      if (done % 50 === 0) console.log('generated', done, 'files...');
    }
  }
  console.log('waveform generation complete: ' + done + ' generated, ' + skipped + ' skipped');
}

main();
