const fs = require('fs');
const buf = fs.readFileSync('C:\\Project AY Player\\formats\\PT2.txt');

// Find TONE_TB by looking for bytes: "TONE_TB" 
const searchBytes = Buffer.from('TONE_TB');
let toneOffset = -1;
for (let i = 0; i < buf.length - searchBytes.length; i++) {
    if (buf.slice(i, i + searchBytes.length).equals(searchBytes)) {
        toneOffset = i;
        break;
    }
}

// Find VOLTAB
const voltSearch = Buffer.from('VOLTAB');
let voltOffset = -1;
for (let i = toneOffset; i < buf.length - voltSearch.length; i++) {
    if (buf.slice(i, i + voltSearch.length).equals(voltSearch)) {
        voltOffset = i;
        break;
    }
}

console.log('TONE_TB at:', toneOffset, 'VOLTAB at:', voltOffset);

// Find DB directives after TONE_TB
// Look for 'DB' after TONE_TB
const dbSearch = Buffer.from('DB');
let pos = toneOffset;
const dbOffsets = [];
while (pos < buf.length) {
    const idx = buf.indexOf(dbSearch, pos);
    if (idx < 0 || idx >= voltOffset) break;
    dbOffsets.push(idx);
    pos = idx + 2;
}

console.log('Found', dbOffsets.length, 'DB directives');

// Extract all byte values from DB lines
const allBytes = [];
for (const dbOff of dbOffsets) {
    // Get the line content after DB
    let lineEnd = buf.indexOf(0x0D, dbOff);
    if (lineEnd < 0) lineEnd = dbOff + 100;
    const line = buf.slice(dbOff + 2, lineEnd);
    
    // Parse the line byte by byte
    let i = 0;
    while (i < line.length) {
        // skip spaces
        while (i < line.length && line[i] === 0x20) i++;
        if (i >= line.length) break;
        
        if (line[i] === 0x23) { // '#'
            // hex value
            i++;
            let hex = 0;
            while (i < line.length && ((line[i] >= 0x30 && line[i] <= 0x39) || (line[i] >= 0x41 && line[i] <= 0x46) || (line[i] >= 0x61 && line[i] <= 0x66))) {
                hex = hex * 16 + (line[i] <= 0x39 ? line[i] - 0x30 : (line[i] & 0xDF) - 0x41 + 10);
                i++;
            }
            allBytes.push(hex);
        } else if (line[i] === 0x22 || line[i] === 0x27) { // " or '
            // quoted char
            const q = line[i]; i++;
            while (i < line.length && line[i] !== q) {
                allBytes.push(line[i]);
                i++;
            }
            if (i < line.length) i++; // skip closing quote
        } else {
            i++;
            continue;
        }
        
        // skip spaces and comma
        while (i < line.length && (line[i] === 0x20 || line[i] === 0x09)) i++;
        if (i < line.length && line[i] === 0x2C) i++; // comma
    }
}

console.log('Total tone bytes:', allBytes.length);

// The tone table has 96 notes x 3 bytes each = 288 bytes
// Extract 12-bit tone values
const tones = [];
for (let n = 0; n < 96 && n * 3 + 2 < allBytes.length; n++) {
    const b0 = allBytes[n * 3];
    const b1 = allBytes[n * 3 + 1];
    const b2 = allBytes[n * 3 + 2];
    const tone = (b2 << 8) | ((b0 & 1) << 4) | ((b1 >> 4) & 0xF);
    tones.push(tone);
}

console.log('\n96 note periods:');
for (let i = 0; i < 96; i += 8) {
    const row = tones.slice(i, i + 8);
    console.log(row.map(t => '0x' + t.toString(16).padStart(4, '0')).join(', '));
}

// Output as JS
console.log('\nvar PT2_TONES=[' + tones.map(t => '0x' + t.toString(16)).join(',') + '];');
