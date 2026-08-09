const fs = require('fs');
const buf = fs.readFileSync('C:\\Project AY Player\\formats\\PT2.txt', 'latin1');

// Find TONE_TB section
const start = buf.indexOf('TONE_TB');
const end = buf.indexOf(';---', start);
const section = buf.substring(start, end);

// Extract all bytes from DB directives, handling quoted chars properly
const bytes = [];
const lines = section.split(/\r?\n/);
for (const line of lines) {
    const m = line.match(/DB\s+(.*)/i);
    if (!m) continue;
    const arg = m[1];
    // Split by comma but respect quotes
    let i = 0;
    while (i < arg.length) {
        while (i < arg.length && (arg[i] === ' ' || arg[i] === '\t')) i++;
        if (i >= arg.length) break;
        if (arg[i] === '#') {
            i++;
            let hex = '';
            while (i < arg.length && /[0-9A-Fa-f]/.test(arg[i])) { hex += arg[i]; i++; }
            bytes.push(parseInt(hex, 16));
        } else if (arg[i] === '"' || arg[i] === "'") {
            const q = arg[i]; i++;
            while (i < arg.length && arg[i] !== q) {
                bytes.push(arg.charCodeAt(i)); i++;
            }
            if (i < arg.length) i++; // skip closing quote
        } else {
            i++;
        }
        while (i < arg.length && (arg[i] === ' ' || arg[i] === '\t')) i++;
        if (i < arg.length && arg[i] === ',') i++;
    }
}

console.log('Total bytes:', bytes.length);

// Build the 12-bit tone lookup
const tones = [];
for (let note = 0; note < 96; note++) {
    const b0 = bytes[note * 3];
    const b1 = bytes[note * 3 + 1];
    const b2 = bytes[note * 3 + 2];
    const tone = (b2 << 8) | ((b0 & 1) << 4) | ((b1 >> 4) & 0xF);
    tones.push(tone);
}

// Print as JS
console.log('var PT2_TONES=[' + tones.map(t => '0x' + t.toString(16)).join(',') + '];');
