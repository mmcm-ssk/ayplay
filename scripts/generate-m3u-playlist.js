const fs = require('fs');
const path = require('path');

const chiptunesDir = path.resolve(__dirname, '..', 'chiptunes');
const outputFile = path.resolve(__dirname, '..', 'api', 'playlist.m3u');
const baseDir = path.resolve(__dirname, '..');

const EXTENSIONS = ['.fym', '.pt3', '.vt2', '.psg', '.stc', '.ay', '.pt2', '.snd', '.asc'];

function scanDir(dir, depth, parentAuthor, parentYear, parentSection) {
    var entries = [];
    if (!fs.existsSync(dir)) return entries;
    var items = fs.readdirSync(dir);
    for (var i = 0; i < items.length; i++) {
        var name = items[i];
        if (name === '.' || name === '..' || name === 'list.xml') continue;
        var fullPath = path.join(dir, name);
        var stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            var nextAuthor = depth === 0 ? name : parentAuthor;
            var nextYear = parentYear;
            var nextSection = parentSection;
            if (depth >= 1) {
                nextSection = parentSection ? parentSection + ' > ' + name : name;
            }
            entries = entries.concat(scanDir(fullPath, depth + 1, nextAuthor, nextYear, nextSection));
        } else {
            var ext = path.extname(name).toLowerCase();
            if (EXTENSIONS.includes(ext)) {
                var relative = path.relative(baseDir, fullPath).replace(/\\/g, '/');
                var title = name.replace(/\.(fym|pt3|vt2|psg|stc|pt2|ay|snd|asc)$/i, '').replace(/%20/g, ' ');
                entries.push({
                    file: relative,
                    title: title,
                    author: parentAuthor || path.basename(path.dirname(relative)),
                    year: parentYear || '',
                    section: parentSection || ''
                });
            }
        }
    }
    return entries;
}

var playlist = scanDir(chiptunesDir, 0, '', '', '');
playlist.sort(function(a, b) {
    var ad = a.author.toLowerCase() || '\uffff';
    var bd = b.author.toLowerCase() || '\uffff';
    if (ad < bd) return -1;
    if (ad > bd) return 1;
    var as = a.section || '';
    var bs = b.section || '';
    if (as < bs) return -1;
    if (as > bs) return 1;
    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
});

var lines = ['#EXTM3U'];
var lastAuthor = '';
var lastYear = '';
var lastSection = '';
for (var i = 0; i < playlist.length; i++) {
    var e = playlist[i];
    if (e.author !== lastAuthor) {
        lines.push('#EXTGRP:' + e.author);
        lastAuthor = e.author;
        lastSection = '';
    }
    if (e.section && e.section !== lastSection) {
        lines.push('#SUBSECTION:' + e.section);
        lastSection = e.section;
    }
    var display = e.author + ' - ' + e.title;
    lines.push('#EXTINF:-1,' + display);
    lines.push(e.file);
}
fs.writeFileSync(outputFile, lines.join('\r\n') + '\r\n', 'utf-8');
console.log('Generated M3U playlist: ' + playlist.length + ' entries -> ' + outputFile);
