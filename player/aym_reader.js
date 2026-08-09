MTCReader = function(buffer, fileName) {
    var data = new Uint8Array(buffer);
    var chips = [];

    function tag(off) {
        return String.fromCharCode(data[off]) + String.fromCharCode(data[off + 1]) +
               String.fromCharCode(data[off + 2]) + String.fromCharCode(data[off + 3]);
    }
    function be32(off) {
        return (data[off] << 24) | (data[off + 1] << 16) | (data[off + 2] << 8) | data[off + 3];
    }

    if (data.length < 8 || tag(0) !== 'MTC1') {
        this.error = 'Not an MTC container';
        return;
    }

    var pos = 8;
    var fileEnd = data.length;
    while (pos + 8 <= fileEnd) {
        var ctag = tag(pos);
        var clen = be32(pos + 4);
        var chunkEnd = pos + 8 + clen;
        if (chunkEnd > fileEnd) break;
        if (ctag === 'TRCK') {
            var sub = pos + 8;
            while (sub + 8 <= chunkEnd) {
                var st = tag(sub);
                var slen = be32(sub + 4);
                var dataEnd = sub + 8 + slen;
                if (dataEnd > chunkEnd) break;
                if (st === 'DATA' && slen > 0) {
                    chips.push(data.subarray(sub + 8, dataEnd));
                }
                sub = dataEnd;
                if (sub < chunkEnd && data[sub] === 0) sub++;
            }
        }
        pos = chunkEnd;
        if (pos < fileEnd && data[pos] === 0) pos++;
    }

    if (chips.length === 0) {
        this.error = 'No tracks found in MTC';
        return;
    }

    var readers = [];
    for (var i = 0; i < chips.length; i++) {
        var c = chips[i];
        var isDump = c.length >= 16 &&
            c[0] === 0x50 && c[1] === 0x53 && c[2] === 0x47 && c[3] === 0x1A &&
            c[4] === 0 && c[5] === 0 && c[6] === 0 && c[7] === 0 &&
            c[8] === 0 && c[9] === 0 && c[10] === 0 && c[11] === 0 &&
            c[12] === 0 && c[13] === 0 && c[14] === 0 && c[15] === 0;
        var isTfm = c.length >= 8 &&
            c[0] === 0x54 && c[1] === 0x46 && c[2] === 0x4d && c[3] === 0x63 &&
            c[4] === 0x6f && c[5] === 0x6d;
        var sub = c.buffer.slice(c.byteOffset, c.byteOffset + c.byteLength);
        if (isDump) {
            readers.push(new PSGReader(sub, (fileName || '') + ':' + (i + 1)));
        } else if (isTfm) {
            readers.push(new TFCReader(sub, (fileName || '') + ':' + (i + 1)));
        } else {
            readers.push(new PT3Reader(sub, (fileName || '') + ':' + (i + 1), true));
        }
    }

    var numChips = readers.length;
    var chipTypes = [];
    for (var ct = 0; ct < numChips; ct++) {
        if (readers[ct].getChipType && readers[ct].getChipType() === 'opn') {
            chipTypes.push('opn');
            chipTypes.push('opn');
        } else {
            chipTypes.push('ay');
        }
    }
    var totalChips = chipTypes.length;
    var baseFc = 0;
    var opnClock = 0;
    for (var cf = 0; cf < numChips; cf++) {
        var fc = readers[cf].getFrameCount();
        if (fc > baseFc) baseFc = fc;
        if (readers[cf].getChipType && readers[cf].getChipType() === 'opn' && !opnClock) {
            opnClock = readers[cf].getClockRate();
        }
    }
    var trackName = '';
    var fname = (fileName || '').replace(/^.*[\/\\]/, '').replace(/\.mtc$/i, '');
    try {
        trackName = decodeURIComponent(fname);
    } catch(e) {
        trackName = fname;
    }

    this.getFrameCount = function() { return baseFc; };
    this.getFrameRate = function() { return readers[0].getFrameRate(); };
    this.getClockRate = function() {
        // AY chips must run at the AY clock (e.g. 1.77MHz), not the FM clock
        // of the first OPN/TFM chip, otherwise Ayumi's step > 1 diverges.
        for (var cr = 0; cr < numChips; cr++) {
            if (!(readers[cr].getChipType && readers[cr].getChipType() === 'opn')) {
                return readers[cr].getClockRate();
            }
        }
        return readers[0].getClockRate();
    };
    this.getOpnClockRate = function() { return opnClock; };
    this.getChipTypes = function() { return chipTypes.slice(); };
    this.getNumChips = function() { return totalChips; };
    this.getTurbo = function() { return totalChips > 1; };
    this.getNumPositions = function() { return 0; };
    this.getLoopPos = function() { return -1; };
    this.getDelay = function() { return 0; };
    this.getLoopFrame = function() { return 0; };
    this.computeLoopFrame = function() { return 0; };
    this.getTrackFileName = function() { return fileName || ''; };
    this.getTrackName = function() { return trackName; };
    this.getAuthorName = function() { return ''; };

    var frame = 0;

    this.getNextFrame = function() {
        var out = new Array(totalChips + 1);
        var oi = 0;
        for (var i = 0; i < numChips; i++) {
            var r = readers[i].getNextFrame();
            out[oi++] = r[0];
            if (readers[i].getChipType && readers[i].getChipType() === 'opn') out[oi++] = r[1];
            if (r[r.length - 1] && !readers[i].loopsContinuously) {
                // end-of-data chip: restart at its loop point so it keeps playing
                // until the longest chip finishes (ZXTune keeps each chip looping)
                try {
                    var lp = readers[i].getLoopFrame ? readers[i].getLoopFrame() : -1;
                    var fc = readers[i].getFrameCount();
                    if (lp >= 0 && fc > 1) readers[i].setProgress(Math.min(lp, fc - 1) / fc);
                    else if (fc > 1) readers[i].setProgress(0);
                } catch (e) {}
            }
        }
        frame++;
        out[totalChips] = frame > baseFc;
        return out;
    };

    this.setProgress = function(k) {
        frame = 0;
        for (var i = 0; i < numChips; i++) readers[i].setProgress(k);
    };

    this.reset = function() {
        frame = 0;
        for (var i = 0; i < numChips; i++) readers[i].setProgress(0);
    };
};
if (typeof module !== 'undefined' && module.exports) { module.exports = {MTC: MTCReader}; }
