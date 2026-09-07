'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHIPTUNES = path.join(ROOT, 'chiptunes');
const MAP_OUT = path.join(ROOT, 'api', 'ay_beeper_map.json');

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

const map = {};
let t0 = Date.now();
for (let i = 0; i < files.length; i++) {
    const rel = path.relative(ROOT, files[i]).replace(/\\/g, '/');
    let allBeeper = false;
    try {
        const buf = fs.readFileSync(files[i]);
        const bytes = new Uint8Array(buf.buffer || buf, buf.byteOffset || 0, buf.byteLength);
        const probe = new AYReader(bytes, rel, -1);
        if (!probe.error) {
            const num = probe.getNumSubsongs ? probe.getNumSubsongs() : 1;
            const flags = [];
            for (let si = 0; si < num; si++) {
                const r = si === 0 ? probe : new AYReader(bytes, rel, si);
                if (r.error) { flags.push(false); continue; }
                try { r.getFrameCount(); } catch (e) { flags.push(false); continue; }
                try { flags.push(!!(r.isBeeper && r.isBeeper())); } catch (e) { flags.push(false); }
            }
            allBeeper = flags.length > 0 && flags.every(Boolean);
        }
    } catch (e) { allBeeper = false; }
    if (allBeeper) map[rel] = 1;
    if ((i + 1) % 10 === 0) {
        console.log('[' + (i + 1) + '/' + files.length + '] beeper-all=' + Object.keys(map).length + ' elapsed=' + Math.round((Date.now() - t0) / 1000) + 's');
    }
}
fs.writeFileSync(MAP_OUT, JSON.stringify(map, null, 1));
console.log('beeper map (all subsongs beeper):', Object.keys(map).length, '->', MAP_OUT);