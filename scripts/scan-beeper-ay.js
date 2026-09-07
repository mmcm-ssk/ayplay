'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHIPTUNES = path.join(ROOT, 'chiptunes');
const MAP_OUT = path.join(ROOT, 'api', 'ay_beeper_map.json');

// Beeper detection only needs the sound port writes, which happen in the
// first frames of each subsong. Capping emulation keeps the scan fast
// (a full per-subsong run up to 9000 frames is what made it crawl).
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

const files = [];
walkAy(CHIPTUNES, files);
files.sort();
console.log('files:', files.length);

// map: { "rel.ay": [0,0,1,1] } — per subsong beeper flag; {} = no beeper at all
const map = {};
let t0 = Date.now();
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
fs.writeFileSync(MAP_OUT, JSON.stringify(map, null, 0));
const nAll = Object.values(map).filter(f => f.length && f.every(Boolean)).length;
const nAny = Object.values(map).filter(f => f.length && f.some(Boolean)).length;
console.log('beeper per-subsong map:', Object.keys(map).length, 'files | anyBeeper:', nAny, '| allBeeper:', nAll, '->', MAP_OUT);