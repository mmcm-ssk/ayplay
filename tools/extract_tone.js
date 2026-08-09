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
console.log('Total bytes:', bytes.length);
console.log('Raw bytes:', bytes.map(x => '0x' + x.toString(16).padStart(2, '0')).join(', '));

const tones = [];
for (let n = 0; n < 96 && n * 3 + 2 < bytes.length; n++) {
    const b0 = bytes[n * 3], b1 = bytes[n * 3 + 1], b2 = bytes[n * 3 + 2];
    tones.push((b2 << 8) | ((b0 & 1) << 4) | ((b1 >> 4) & 0xF));
}
console.log('\n96 tones (' + tones.length + '):');
for (let i = 0; i < tones.length; i += 12) {
    console.log(tones.slice(i, i + 12).map(t => '0x' + t.toString(16).padStart(4, '0')).join(', '));
}
