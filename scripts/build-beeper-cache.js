'use strict';
// Unified beeper/sample build: scans chiptunes once and writes beeper + digi
// (sample voice) flags directly into ayPlayer_playlist_all.cache.json (and
// regenerates ay_beeper_map.json / ay_sample_map.json for prod PHP which
// rebuilds the cache server-side from them).
//
// Usage:  node scripts/build-beeper-cache.js
// Env:    AY_CAP=120    cap emulated frames per subsong (default 120)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHIPTUNES = path.join(ROOT, 'chiptunes');
const CACHE = path.join(ROOT, 'api', 'ayPlayer_playlist_all.cache.json');
const MAP_OUT = path.join(ROOT, 'api', 'ay_beeper_map.json');
const SAMPLE_MAP_OUT = path.join(ROOT, 'api', 'ay_sample_map.json');

const CAP = parseInt(process.env.AY_CAP || '120', 10);

globalThis.Z80 = require(path.join(ROOT, 'player', 'z80core.js'));
const { AYReader } = require(path.join(ROOT, 'player', 'ay.js'));

function walkAy(dir, out) {
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) walkAy(p, out);
        else if (/\.ay$/i.test(name)) out.push(p);
    }
}

// 1) Scan all .ay files -> flags map { rel.ay: [per subsong boolean] }
console.log('scanning .ay files...');
const files = [];
walkAy(CHIPTUNES, files);
files.sort();

const map = {};
const sampleMap = {};
const t0 = Date.now();
for (let i = 0; i < files.length; i++) {
    const rel = path.relative(ROOT, files[i]).replace(/\\/g, '/');
    let flags = [];
    let sampleFlags = [];
    try {
        const buf = fs.readFileSync(files[i]);
        const bytes = new Uint8Array(buf.buffer || buf, buf.byteOffset || 0, buf.byteLength);
        const probe = new AYReader(bytes, rel, -1);
        if (!probe.error) {
            const num = probe.getNumSubsongs ? probe.getNumSubsongs() : 1;
            for (let si = 0; si < num; si++) {
                const r = si === 0 ? probe : new AYReader(bytes, rel + '#scan' + CAP, si);
                if (r.error) { flags.push(false); sampleFlags.push(false); continue; }
                try {
                    r._maxFrames = Math.min(r._maxFrames || CAP, CAP);
                    r.getFrameCount();
                } catch (e) { flags.push(false); sampleFlags.push(false); continue; }
                try {
                    const pu = r.getPortUsage ? r.getPortUsage() : null;
                    const hasBeep = !!(pu && pu.fe > 0);
                    // AY writes may be only a 'silent init' in the .ay player prologue
                    // (Follin beeper tracks write a few AY regs at frame 0, volumes stay 0),
                    // so a track is beeper when the AY is never actually audible.
                    let audibleAy = false;
                    if (hasBeep) {
                        for (let f = 0; f < r._frameCount && !audibleAy; f++) {
                            const fr = r.getNextFrame();
                            const a = fr[0];
                            if ((a[8] & 15) || (a[9] & 15) || (a[10] & 15)) audibleAy = true;
                        }
                    }
                    flags.push(!!(hasBeep && !audibleAy));
                    // Sample/digi: emulation populated _digi/_digiEv (heavy volume-register
                    // writes to a single channel sampled at interrupt rate, e.g. "(Sample)"
                    // voice subsongs). Mirrors the player's own digi detection.
                    sampleFlags.push(!!(r._digi && r._digiEv && r._digiEv.length));
                } catch (e) { flags.push(false); sampleFlags.push(false); }
            }
        }
    } catch (e) { flags = []; sampleFlags = []; }
    if (flags.length) map[rel] = flags;
    if (sampleFlags.length) sampleMap[rel] = sampleFlags;
    if ((i + 1) % 10 === 0) {
        console.log('[' + (i + 1) + '/' + files.length + '] elapsed=' + Math.round((Date.now() - t0) / 1000) + 's');
    }
}

// 2) Write the maps (artifact for prod PHP that regenerates the cache itself)
fs.writeFileSync(MAP_OUT, JSON.stringify(map, null, 0));
const nAll = Object.values(map).filter(f => f.length && f.every(Boolean)).length;
const nAny = Object.values(map).filter(f => f.length && f.some(Boolean)).length;
console.log('map:', Object.keys(map).length, 'files | anyBeeper:', nAny, '| allBeeper:', nAll, '->', MAP_OUT);
fs.writeFileSync(SAMPLE_MAP_OUT, JSON.stringify(sampleMap, null, 0));
const nSAll = Object.values(sampleMap).filter(f => f.length && f.every(Boolean)).length;
const nSAny = Object.values(sampleMap).filter(f => f.length && f.some(Boolean)).length;
console.log('sample map:', Object.keys(sampleMap).length, 'files | anySample:', nSAny, '| allSample:', nSAll, '->', SAMPLE_MAP_OUT);

// 3) Merge flags directly into the local/dev cache (no PHP required)
if (!fs.existsSync(CACHE)) {
    console.error('cache not found:', CACHE, '(generate it first, e.g. via generate-playlist.js)');
    process.exit(1);
}
const j = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
if (!Array.isArray(j.entries)) { console.error('unexpected cache shape: expected { entries: [...] }'); process.exit(1); }
let merged = 0;
for (const e of j.entries) {
    if (e && e.file && /\.ay$/i.test(e.file)) {
        const b = map[e.file];
        if (b !== undefined) {
            const bSub = b.map(v => v ? 1 : 0);
            const bAll = bSub.length > 0 && bSub.every(v => v === 1);
            e.beeper = bAll;
            e.channels = bAll ? 1 : 3;
            e.beeperSub = bSub;
            merged++;
        }
        const s = sampleMap[e.file];
        if (s !== undefined) {
            const sSub = s.map(v => v ? 1 : 0);
            e.sampleSub = sSub;
            e.sample = sSub.length > 0 && sSub.every(v => v === 1);
            merged++;
        }
    }
}
fs.writeFileSync(CACHE, JSON.stringify(j, null, 2));
console.log('cache merged:', merged, '.ay entries ->', CACHE);