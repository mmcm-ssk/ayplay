'use strict';
// Unified beeper build: scans chiptunes once and writes beeper flags directly
// into ayPlayer_playlist_all.cache.json (and regenerates ay_beeper_map.json for
// prod PHP which rebuilds the cache server-side from it).
//
// Usage:  node scripts/build-beeper-cache.js
// Env:    AY_CAP=120    cap emulated frames per subsong (default 120)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHIPTUNES = path.join(ROOT, 'chiptunes');
const CACHE = path.join(ROOT, 'api', 'ayPlayer_playlist_all.cache.json');
const MAP_OUT = path.join(ROOT, 'api', 'ay_beeper_map.json');

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
const t0 = Date.now();
for (let i = 0; i < files.length; i++) {
    const rel = path.relative(ROOT, files[i]).replace(/\\/g, '/');
    let flags = [];
    try {
        const buf = fs.readFileSync(files[i]);
        const bytes = new Uint8Array(buf.buffer || buf, buf.byteOffset || 0, buf.byteLength);
        const probe = new AYReader(bytes, rel, -1);
        if (!probe.error) {
            const num = probe.getNumSubsongs ? probe.getNumSubsongs() : 1;
            for (let si = 0; si < num; si++) {
                const r = si === 0 ? probe : new AYReader(bytes, rel + '#scan' + CAP, si);
                if (r.error) { flags.push(false); continue; }
                try {
                    r._maxFrames = Math.min(r._maxFrames || CAP, CAP);
                    r.getFrameCount();
                } catch (e) { flags.push(false); continue; }
                try {
                    const pu = r.getPortUsage ? r.getPortUsage() : null;
                    flags.push(!!(pu && pu.ay === 0 && pu.fe > 0));
                } catch (e) { flags.push(false); }
            }
        }
    } catch (e) { flags = []; }
    if (flags.length) map[rel] = flags;
    if ((i + 1) % 10 === 0) {
        console.log('[' + (i + 1) + '/' + files.length + '] elapsed=' + Math.round((Date.now() - t0) / 1000) + 's');
    }
}

// 2) Write the map (artifact for prod PHP that regenerates the cache itself)
fs.writeFileSync(MAP_OUT, JSON.stringify(map, null, 0));
const nAll = Object.values(map).filter(f => f.length && f.every(Boolean)).length;
const nAny = Object.values(map).filter(f => f.length && f.some(Boolean)).length;
console.log('map:', Object.keys(map).length, 'files | anyBeeper:', nAny, '| allBeeper:', nAll, '->', MAP_OUT);

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
        if (b === undefined) continue;
        const bSub = b.map(v => v ? 1 : 0);
        const bAll = bSub.length > 0 && bSub.every(v => v === 1);
        e.beeper = bAll;
        e.channels = bAll ? 1 : 3;
        e.beeperSub = bSub;
        merged++;
    }
}
fs.writeFileSync(CACHE, JSON.stringify(j, null, 2));
console.log('cache merged:', merged, '.ay entries ->', CACHE);