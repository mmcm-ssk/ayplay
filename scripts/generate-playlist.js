const fs = require('fs');
const path = require('path');

const chiptunesDir = path.resolve(__dirname, '..', 'chiptunes');
const outputFile = path.resolve(__dirname, '..', 'api', 'playlist_DATA.js');
const baseDir = path.resolve(__dirname, '..');

function isPt3Ts(name) {
    return name.toLowerCase().includes('[ts]') || name.toLowerCase().includes('_ts');
}

function formatTime(seconds) {
    var min = Math.floor(seconds / 60);
    var sec = Math.round(seconds % 60);
    if (sec >= 60) { sec = 0; min++; }
    return (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
}

function getPt3Time(filePath) {
    try {
        var buf = fs.readFileSync(filePath);
        if (buf.length < 203) return null;
        var delay = buf[100];
        var numPositions = 0;
        while (numPositions < buf.length && buf[201 + numPositions] !== 255) {
            numPositions++;
            if (numPositions > 255) { numPositions = 255; break; }
        }
        if (numPositions < 1) numPositions = 1;
        var totalFrames = numPositions * 64 * delay;
        if (totalFrames < 50) totalFrames = 50;
        return formatTime(totalFrames / 50);
    } catch(e) {
        return null;
    }
}

function getVt2Time(filePath) {
    try {
        var text = fs.readFileSync(filePath, 'utf-8');
        var lines = text.split(/\r?\n/);
        var delay = 6;
        var intFreq = 50;
        var numPositions = 0;
        var inModule = false;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line.toUpperCase() === '[MODULE]') {
                if (inModule) break;
                inModule = true;
                continue;
            }
            if (!inModule) continue;
            if (line.charAt(0) === '[') break;
            var eq = line.indexOf('=');
            if (eq < 1) continue;
            var key = line.substring(0, eq).trim().toUpperCase();
            var val = line.substring(eq + 1).trim();
            if (key === 'SPEED') {
                delay = parseInt(val, 10) || 6;
            } else if (key === 'INTFREQ') {
                intFreq = parseInt(val, 10) || 50;
                if (intFreq >= 50000) intFreq = Math.round(intFreq / 1000);
                if (intFreq < 1 || intFreq > 10000) intFreq = 50;
            } else if (key === 'PLAYORDER' && val !== '') {
                numPositions = val.split(',').length;
            }
        }
        if (numPositions < 1) numPositions = 1;
        var totalFrames = numPositions * 64 * delay;
        if (totalFrames < 50) totalFrames = 50;
        return formatTime(totalFrames / intFreq);
    } catch(e) {
        return null;
    }
}

function getFymTime(filePath) {
    try {
        var zlib = require('zlib');
        var buf = fs.readFileSync(filePath);
        var raw = zlib.inflateSync(buf);
        if (raw.length < 16) return null;
        function getInt(off) { return raw[off] | (raw[off+1] << 8) | (raw[off+2] << 16) | (raw[off+3] << 24); }
        var frameCount = getInt(4);
        var frameRate = getInt(16);
        if (!frameCount || !frameRate) return null;
        return formatTime(frameCount / frameRate);
    } catch(e) {
        return null;
    }
}

function getStcTime(filePath) {
    try {
        var buf = fs.readFileSync(filePath);
        if (buf.length < 7) return null;
        var delay = buf[0];
        var positionsPtr = buf[1] | (buf[2] << 8);
        if (positionsPtr >= buf.length) return null;
        var numPositions = buf[positionsPtr] + 1;
        if (numPositions < 1) numPositions = 1;
        var totalFrames = numPositions * 64 * delay;
        if (totalFrames < 50) totalFrames = 50;
        return formatTime(totalFrames / 50);
    } catch(e) {
        return null;
    }
}

function getPt2Time(filePath) {
    try {
        var buf = fs.readFileSync(filePath);
        if (buf.length < 131) return null;
        var delay = buf[0];
        if (delay < 2) delay = 2;
        var numPositions = 0;
        for (var i = 131; i < buf.length; i++) {
            if (buf[i] === 0xFF) break;
            if (buf[i] < 32) numPositions++;
            if (numPositions > 255) break;
        }
        if (numPositions < 1) numPositions = 1;
        var totalFrames = numPositions * 64 * delay;
        if (totalFrames < 50) totalFrames = 50;
        return formatTime(totalFrames / 50);
    } catch(e) {
        return null;
    }
}

function getAscTime(filePath) {
    try {
        var buf = fs.readFileSync(filePath);
        if (buf.length < 9) return null;
        var delay = buf[0];
        if (delay < 1) delay = 1;
        var numPositions = buf[8];
        if (numPositions < 1) numPositions = 1;
        var totalFrames = numPositions * 64 * delay;
        if (totalFrames < 50) totalFrames = 50;
        return formatTime(totalFrames / 50);
    } catch(e) {
        return null;
    }
}

function getAyTime(filePath) {
    return null;
}

function scanDir(dir, baseDir, parentAuthor) {
    var entries = [];
    if (!fs.existsSync(dir)) return entries;
    var sectionOverride = parentAuthor ? path.basename(dir) : null;
    var items = fs.readdirSync(dir);
    var fymFiles = {};
    var pt3Map = {};
    var handledPt3 = [];

    for (var i = 0; i < items.length; i++) {
        var name = items[i];
        if (name.toLowerCase().endsWith('.pt3')) {
            var key = name.slice(0, -4).toLowerCase().replace(/[^a-z0-9]/g, '');
            pt3Map[key] = name;
        } else if (name.toLowerCase().endsWith('.fym')) {
            fymFiles[name] = true;
        }
    }

    // process files and subdirectories
    for (var i = 0; i < items.length; i++) {
        var name = items[i];
        if (name === '.' || name === '..') continue;
        var fullPath = path.join(dir, name);
        var stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            var nextParent = (dir === chiptunesDir) ? undefined : (parentAuthor || path.basename(dir));
            entries = entries.concat(scanDir(fullPath, baseDir, nextParent));
        } else if (name.toLowerCase().endsWith('.fym')) {
            var relative = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            var fymKey = name.slice(0, -4).toLowerCase().replace(/[^a-z0-9]/g, '');
            var entry = {
                name: name,
                file: relative,
                pt3: !!pt3Map[fymKey],
                pt3File: pt3Map[fymKey] || null
            };
            if (!entry.author) {
                entry.author = parentAuthor || path.basename(dir);
            }
            if (!entry.hasOwnProperty('section')) {
                entry.section = sectionOverride || null;
            }
            entries.push(entry);

            if (entry.pt3) {
                var pt3Name = entry.pt3File;
                var pt3Entry = {
                    name: pt3Name,
                    file: relative.replace(/[^/]+$/, pt3Name),
                    pt3: false, pt3File: null,
                    turbo: isPt3Ts(pt3Name),
                    title: entry.title || null,
                    time: entry.time || '',
                    year: entry.year || '',
                    download: entry.download || '',
                    section: entry.section || null,
                    author: parentAuthor || path.basename(dir)
                };
                entries.push(pt3Entry);
                handledPt3.push(pt3Name);
            }
        } else if (name.toLowerCase().endsWith('.vt2')) {
            var fullPath = path.join(dir, name);
            var relative = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            var entry = {
                name: name,
                file: relative,
                pt3: false,
                turbo: isPt3Ts(name),
                title: name.replace(/\.vt2$/i, '')
            };
            if (!entry.author) {
                entry.author = parentAuthor || path.basename(dir);
            }
            if (!entry.hasOwnProperty('section')) {
                entry.section = sectionOverride || null;
            }
            // scan VT2 for module count
            try {
                var vt2buf = fs.readFileSync(fullPath);
                var vt2ModuleCount = 0;
                for (var vi = 0; vi <= vt2buf.length - 8; vi++) {
                    if (vt2buf[vi] === 91 && vt2buf[vi+1] === 77 && vt2buf[vi+2] === 111 &&
                        vt2buf[vi+3] === 100 && vt2buf[vi+4] === 117 && vt2buf[vi+5] === 108 &&
                        vt2buf[vi+6] === 101 && vt2buf[vi+7] === 93) {
                        vt2ModuleCount++;
                    }
                }
                if (vt2ModuleCount >= 1) entry.modules = vt2ModuleCount;
            } catch(e) {}
            entries.push(entry);
        } else if (name.toLowerCase().endsWith('.pt3') && !handledPt3.includes(name)) {
            var relative = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            var entry = {
                name: name,
                file: relative,
                pt3: false
            };
            if (!entry.author) {
                entry.author = parentAuthor || path.basename(dir);
            }
            if (!entry.hasOwnProperty('section')) {
                entry.section = sectionOverride || null;
            }
            entries.push(entry);
        } else if (name.toLowerCase().endsWith('.stc') || name.toLowerCase().endsWith('.pt2') || name.toLowerCase().endsWith('.ay') || name.toLowerCase().endsWith('.snd') || name.toLowerCase().endsWith('.asc')) {
            var relative = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            var entry = {
                name: name,
                file: relative,
                pt3: false
            };
            if (!entry.author) {
                entry.author = parentAuthor || path.basename(dir);
            }
            if (!entry.hasOwnProperty('section')) {
                entry.section = sectionOverride || null;
            }
            entries.push(entry);
        }
    }
    // Fill time for entries without it
    for (var ei = 0; ei < entries.length; ei++) {
        var e = entries[ei];
        if (!e.time && e.file) {
            var t;
            if (/\.pt3$/i.test(e.file)) {
                t = getPt3Time(path.resolve(baseDir, e.file));
            } else if (/\.fym$/i.test(e.file)) {
                t = getFymTime(path.resolve(baseDir, e.file));
            } else if (/\.vt2$/i.test(e.file)) {
                t = getVt2Time(path.resolve(baseDir, e.file));
            } else if (/\.stc$/i.test(e.file)) {
                t = getStcTime(path.resolve(baseDir, e.file));
            } else if (/\.pt2$/i.test(e.file)) {
                t = getPt2Time(path.resolve(baseDir, e.file));
            } else if (/\.ay$/i.test(e.file)) {
                t = getAyTime(path.resolve(baseDir, e.file));
            } else if (/\.asc$/i.test(e.file)) {
                t = getAscTime(path.resolve(baseDir, e.file));
            } else if (/\.snd$/i.test(e.file)) {
                t = null;
            }
            if (t) e.time = t;
        }
        // Normalize all times to MM:SS
        if (e.time) {
            var parts = e.time.split(':');
            if (parts.length === 2) {
                var mm = parseInt(parts[0], 10);
                var ss = parseInt(parts[1], 10);
                if (!isNaN(mm) && !isNaN(ss)) {
                    e.time = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
                }
            }
        }
    }
    return entries;
}

var playlist = scanDir(chiptunesDir, baseDir);
var js = 'var AYPLAYLIST_DATA = ' + JSON.stringify(playlist, null, 2) + ';';
fs.writeFileSync(outputFile, js, 'utf-8');
console.log('Generated playlist: ' + playlist.length + ' entries -> ' + outputFile);
