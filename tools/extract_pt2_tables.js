const fs = require('fs');
const buf = fs.readFileSync('C:\\Project AY Player\\formats\\PT2.txt', 'latin1');

// Find TONE_TB label
const toneIdx = buf.indexOf('TONE_TB');
const tabl1Idx = buf.indexOf('TABL1', toneIdx + 7);

const section = buf.substring(toneIdx, tabl1Idx);

const bytes = [];
const lines = section.split(/\r?\n/);
for (const line of lines) {
    const match = line.match(/DB\s+(.+)/i);
    if (!match) continue;
    const parts = match[1].split(',');
    for (let p of parts) {
        p = p.trim();
        if (p.startsWith('#')) {
            bytes.push(parseInt(p.substring(1), 16));
        } else if (p.charAt(0) === '"' || p.charAt(0) === "'") {
            const ch = p.charAt(1);
            bytes.push(ch.charCodeAt(0));
        }
    }
}

console.log('Total tone bytes:', bytes.length);

// Parse as 96 notes x 3 bytes - extract 12-bit tone value
const notes = [];
for (let i = 0; i < 96; i++) {
    const b0 = bytes[i*3];
    const b1 = bytes[i*3+1];
    const b2 = bytes[i*3+2];
    const low = ((b0 & 1) << 4) | ((b1 >> 4) & 0xF);
    const high = b2;
    const period = (high << 8) | low;
    notes.push(period);
}

// Output as JS array
console.log('\n// PT2 Tone Table - 96 notes, 8 octaves x 12 semitones');
console.log('var PT2_TONES = [');
for (let i = 0; i < 96; i += 8) {
    const slice = notes.slice(i, i+8);
    console.log('    ' + slice.map(n => '0x' + n.toString(16).padStart(4, '0')).join(',') + (i+8 < 96 ? ',' : ''));
}
console.log('];');

// Also generate volume table
console.log('\n// PT2 Volume Table');
console.log('var PT2_VOLUMES = [');
const vtab = [];
let DE = 0;
let ix = 0;
const table = new Uint8Array(256);
for (let outer = 0; outer < 16; outer++) {
    let HL = 0;
    for (let inner = 0; inner < 16; inner++) {
        table[ix++] = (HL + 128) >> 8;
        HL = (HL + DE) & 0xFFFF;
    }
    if ((DE & 0xFF) === 119) DE = (DE & 0xFF00) | 120;
    DE = (DE + 17) & 0xFFFF;
}
for (let i = 0; i < 256; i += 16) {
    const slice = Array.from(table.slice(i, i+16));
    console.log('    ' + slice.map(n => n.toString().padStart(2)).join(',') + (i+16 < 256 ? ',' : ''));
}
console.log('];');
