const fs = require('fs');
const b = fs.readFileSync('C:\\Project AY Player\\formats\\PT2.txt', 'latin1');
const start = b.indexOf('TONE_TB DB');
const end = b.indexOf('TABL1', start);
const section = b.substring(start, end);
const lines = section.split(/\r?\n/);
const bytes = [];
for (const line of lines) {
    const m = line.match(/DB\s+(.*)/i);
    if (!m) continue;
    const arg = m[1];
    let i = 0;
    while (i < arg.length) {
        while (i < arg.length && arg[i] == ' ') i++;
        if (i >= arg.length) break;
        if (arg[i] == '#') {
            i++;
            let h = '';
            while (i < arg.length && /[0-9A-Fa-f]/.test(arg[i])) { h += arg[i]; i++; }
            bytes.push(parseInt(h, 16));
        } else if (arg[i] == '"' || arg[i] == "'") {
            const q = arg[i]; i++;
            while (i < arg.length && arg[i] !== q) { bytes.push(arg.charCodeAt(i)); i++; }
            if (i < arg.length) i++;
        } else {
            i++;
        }
        while (i < arg.length && (arg[i] == ' ' || arg[i] == '\t')) i++;
        if (i < arg.length && arg[i] == ',') i++;
    }
}

// 96 notes x 2 bytes LE
const tones = [];
for (let n = 0; n < 96; n++) {
    tones.push(bytes[n * 2] | (bytes[n * 2 + 1] << 8));
}

console.log('// PT2 Tone Table - 96 notes (8 octaves x 12 semitones)');
console.log('var PT2_TONES = [');
for (let i = 0; i < 96; i += 12) {
    const row = tones.slice(i, i + 12);
    console.log('    ' + row.map(t => '0x' + t.toString(16).padStart(4, '0')).join(',') + ',');
}
console.log('];');

// Generate volume table
const vtab = new Uint8Array(256);
let DE = 0, ix = 0;
for (let outer = 0; outer < 16; outer++) {
    let HL = 0;
    for (let inner = 0; inner < 16; inner++) {
        vtab[ix++] = (HL + 128) >> 8;
        HL = (HL + DE) & 0xFFFF;
    }
    if ((DE & 0xFF) === 119) DE = (DE & 0xFF00) | 120;
    DE = (DE + 17) & 0xFFFF;
}

console.log('\n// PT2 Volume Table - 16x16 symmetric');
console.log('var PT2_VOLUMES = [');
for (let i = 0; i < 256; i += 16) {
    const row = Array.from(vtab.slice(i, i + 16));
    console.log('    ' + row.map(v => String(v).padStart(2)).join(',') + ',');
}
console.log('];');
