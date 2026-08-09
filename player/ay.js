var AYReader = (function() {

var _cache = {};

function AYReader(buffer, fileName) {
    var data = new Uint8Array(buffer);
    if (data.length < 20) { this.error = 'File too small'; return; }

    var cacheKey = fileName;
    if (_cache[cacheKey]) {
        var c = _cache[cacheKey];
        this._frames = c.frames;
        this._frameCount = c.frameCount;
        this._trackName = c.trackName;
        this._authorName = c.authorName;
        this._loopFrame = c.loopFrame;
        this._fileName = fileName;
        this._portMode = c.portMode;
        buildAPI(this);
        return;
    }

    function u16(off) { return (data[off] << 8) | data[off + 1]; }
    function s16(off) { var v = u16(off); return v >= 0x8000 ? v - 0x10000 : v; }

    var sig = String.fromCharCode(data[0], data[1], data[2], data[3]);
    if (sig !== 'ZXAY') { this.error = 'Not a ZXAY file'; return; }

    var typeId = String.fromCharCode(data[4], data[5], data[6], data[7]);
    if (typeId !== 'EMUL') { this.error = 'Only EMUL type supported, got: ' + typeId; return; }

    var fileVersion = data[8];
    var playerVersion = data[9];

    var pAuthor = s16(12);
    var authorAbs = 12 + pAuthor;
    var pMisc = s16(14);
    var miscAbs = 14 + pMisc;
    var fileFlags = 0;
    if (pMisc > 0 && miscAbs < data.length) {
        fileFlags = data[miscAbs];
    }
    var numOfSongs = data[16] + 1;
    var firstSong = data[17];
    var pSongs = s16(18);
    var songsAbs = 18 + pSongs;

    function readString(absOff) {
        var end = absOff;
        while (end < data.length && data[end] !== 0) end++;
        var s = '';
        for (var i = absOff; i < end; i++) {
            if (data[i] >= 32 && data[i] < 127) s += String.fromCharCode(data[i]);
        }
        return s;
    }

    var authorName = readString(authorAbs);

    var songIdx = Math.max(0, Math.min(firstSong, numOfSongs - 1));
    var songStructOff = songsAbs + songIdx * 4;
    var songNameOff = songStructOff + s16(songStructOff);
    var songDataOff = (songStructOff + 2) + s16(songStructOff + 2);

    var trackName = readString(songNameOff);

    var hiReg = data[songDataOff + 8];
    var loReg = data[songDataOff + 9];
    var songLength = u16(songDataOff + 4);
    var fadeLength = u16(songDataOff + 6);

    var pPointsOff = songDataOff + 10 + s16(songDataOff + 10);
    var stack = u16(pPointsOff);
    var initAddr = u16(pPointsOff + 2);
    var interruptAddr = u16(pPointsOff + 4);

    var pAddrOff = songDataOff + 12 + s16(songDataOff + 12);

    var memBlocks = [];
    var bOff = pAddrOff;
    while (bOff + 5 < data.length) {
        var addr = u16(bOff);
        if (addr === 0) break;
        var len = u16(bOff + 2);
        var dataPtr = s16(bOff + 4);
        var dataAbs = bOff + 4 + dataPtr;
        if (addr + len > 65536) len = 65536 - addr;
        if (dataAbs + len > data.length) len = data.length - dataAbs;
        if (len > 0) memBlocks.push({ addr: addr, len: len, dataAbs: dataAbs });
        bOff += 6;
    }

    if (initAddr === 0 && memBlocks.length > 0) initAddr = memBlocks[0].addr;

    var hasInterrupt = interruptAddr !== 0;
    var TSTATES_PER_FRAME = 69888;

    var mem = new Uint8Array(65536);
    for (var i = 0; i < 65536; i++) mem[i] = 0xFF;

    for (var i = 0x000A; i <= 0x00FF; i++) mem[i] = 0xC9;
    for (var i = 0x0100; i <= 0x3FFF; i++) mem[i] = 0xFF;
    for (var i = 0x4000; i <= 0xFFFF; i++) mem[i] = 0x00;

    mem[0x0038] = 0xFB;

    if (hasInterrupt) {
        mem[0x0000] = 0xF3; mem[0x0001] = 0xCD;
        mem[0x0002] = initAddr & 0xFF; mem[0x0003] = (initAddr >> 8) & 0xFF;
        mem[0x0004] = 0xED; mem[0x0005] = 0x56;
        mem[0x0006] = 0xFB; mem[0x0007] = 0x76;
        mem[0x0008] = 0xCD;
        mem[0x0009] = interruptAddr & 0xFF; mem[0x000A] = (interruptAddr >> 8) & 0xFF;
        mem[0x000B] = 0x18; mem[0x000C] = 0xF7;
    } else {
        mem[0x0000] = 0xF3; mem[0x0001] = 0xCD;
        mem[0x0002] = initAddr & 0xFF; mem[0x0003] = (initAddr >> 8) & 0xFF;
        mem[0x0004] = 0xED; mem[0x0005] = 0x5E;
        mem[0x0006] = 0xFB; mem[0x0007] = 0x76;
        mem[0x0008] = 0x18; mem[0x0009] = 0xFA;
    }

    for (var b = 0; b < memBlocks.length; b++) {
        var blk = memBlocks[b];
        for (var i = 0; i < blk.len; i++) {
            mem[(blk.addr + i) & 0xFFFF] = data[(blk.dataAbs + i)];
        }
    }

    var ayRegs = new Uint8Array(14);
    var ayCurReg = 0;
    var cpcData = 0;
    var cpcSwitch = 0;
    var envWritten = false;
    var portMode = 0;
    if (pMisc > 0 && (fileFlags & 0x04) && miscAbs + 3 < data.length) {
        var initialFreq = u16(miscAbs + 1);
        if (initialFreq === 1000000 || initialFreq === 1000 || initialFreq === 100) portMode = 2;
    }
    if (pMisc > 0 && (fileFlags & 0x02) && miscAbs + 3 < data.length && portMode === 0) {
        var initialFreq2 = u16(miscAbs + 1);
        if (initialFreq2 === 100 || initialFreq2 === 1000 || initialFreq2 === 1000000) portMode = 2;
    }
    if (portMode === 2) TSTATES_PER_FRAME = 20000;
    var z80 = new Z80({
        mem: mem,
        io_read: function() { return 0xFF; },
        io_write: function(port, value) {
            var hi = (port >> 8) & 0xFF;
            var lo = port & 0xFF;
            var zxMasked = port & 0xC002;
            if (portMode === 0) {
                if (hi === 0xF4 || hi === 0xF6 || hi === 0xF8 || hi === 0xFA) { portMode = 2; TSTATES_PER_FRAME = 20000; }
                else if ((zxMasked === 0xC000 || zxMasked === 0x8000) && lo === 0xFD) portMode = 1;
                else if (!(hi & 0x80)) { portMode = 2; TSTATES_PER_FRAME = 20000; }
            }
            if (portMode === 1) {
                if (zxMasked === 0xC000) { ayCurReg = value & 0x0F; }
                else if (zxMasked === 0x8000 && ayCurReg < 14) {
                    ayRegs[ayCurReg] = value;
                    if (ayCurReg === 13) envWritten = true;
                }
            } else {
                var hi = (port >> 8) & 0xFF;
                if (hi === 0xF4) { cpcData = value; }
                else if (hi === 0xF6) {
                    var bits = value & 0xC0;
                    if (cpcSwitch === 0) { cpcSwitch = bits; }
                    else if (bits === 0) {
                        if (cpcSwitch === 0xC0) ayCurReg = cpcData;
                        else if (cpcSwitch === 0x80 && ayCurReg < 14) {
                            ayRegs[ayCurReg] = cpcData;
                            if (ayCurReg === 13) envWritten = true;
                        }
                        cpcSwitch = 0;
                    }
                } else if (!(hi & 0x80)) {
                    var bits2 = value & 0xC0;
                    if (cpcSwitch === 0) { cpcSwitch = bits2; }
                    else if (bits2 === 0) {
                        if (cpcSwitch === 0xC0) ayCurReg = cpcData;
                        else if (cpcSwitch === 0x80 && ayCurReg < 14) {
                            ayRegs[ayCurReg] = cpcData;
                            if (ayCurReg === 13) envWritten = true;
                        }
                        cpcSwitch = 0;
                    }
                }
            }
        }
    });

    var initState = z80.getState();
    initState.a = hiReg & 0xF0; initState.f = loReg;
    initState.a_prime = hiReg & 0xF0; initState.f_prime = loReg;
    initState.b = hiReg; initState.c = loReg;
    initState.d = hiReg; initState.e = loReg;
    initState.h = hiReg; initState.l = loReg;
    initState.b_prime = hiReg; initState.c_prime = loReg;
    initState.d_prime = hiReg; initState.e_prime = loReg;
    initState.h_prime = hiReg; initState.l_prime = loReg;
    initState.ix = (hiReg << 8) | loReg;
    initState.iy = (hiReg << 8) | loReg;
    initState.i = 3; initState.r = 0;
    initState.pc = 0; initState.sp = stack;
    initState.imode = 1; initState.iff1 = 0; initState.iff2 = 0;
    initState.halted = false;
    initState.do_delayed_di = false; initState.do_delayed_ei = false;
    initState.cycle_counter = 0;
    z80.setState(initState);

    var maxFrames = songLength > 0 ? Math.min(songLength + fadeLength + 50, 15000) : 15000;
    var frames = new Uint8Array(maxFrames * 14);
    var frameCount = 0;
    var silentFrames = 0;
    var prevRegs = new Uint8Array(14);
    var loopFrame = -1;
    var seenStates = {};
    for (var frame = 0; frame < maxFrames; frame++) {
        var totalT = 0;
        while (totalT < TSTATES_PER_FRAME) {
            totalT += z80.run_instruction();
        }
        var off = frame * 14;
        for (var r = 0; r < 14; r++) frames[off + r] = ayRegs[r];
        if (!envWritten) frames[off + 13] = 0xff;
        envWritten = false;
        frameCount++;
        z80.interrupt(false, 0xFF);
        if (songLength > 0 && frame >= songLength) break;
        var same = true;
        for (var r = 0; r < 14; r++) { if (ayRegs[r] !== prevRegs[r]) { same = false; break; } }
        if (same) { silentFrames++; if (silentFrames > 200) break; }
        else {
            silentFrames = 0;
            for (var r = 0; r < 14; r++) prevRegs[r] = ayRegs[r];
        }
        if (frame > 50) {
            var key = 0;
            for (var r = 0; r < 13; r++) key = ((key << 5) - key + ayRegs[r]) | 0;
            if (seenStates[key] !== undefined && (frame - seenStates[key]) >= 20) {
                if (loopFrame < 0) loopFrame = seenStates[key];
            }
            if (seenStates[key] === undefined) seenStates[key] = frame;
        }
    }

    console.log('AYReader:', fileName, 'portMode:', portMode, 'clock:', (portMode === 2 ? 1000000 : 1773400), 'frames:', frameCount);
    this._frames = frames;
    this._frameCount = frameCount;
    this._trackName = trackName;
    this._authorName = authorName;
    this._loopFrame = loopFrame >= 0 ? loopFrame : 0;
    this._fileName = fileName;

    _cache[cacheKey] = {
        frames: frames,
        frameCount: frameCount,
        trackName: trackName,
        authorName: authorName,
        loopFrame: 0,
        fileName: fileName,
        portMode: portMode
    };

    this._portMode = portMode;
    buildAPI(this);
}

function buildAPI(self) {
    self.getFrameCount = function() { return self._frameCount; };
    self.getLoopFrame = function() { return self._loopFrame; };
    self.getFrameRate = function() { return 50; };
    self.getClockRate = function() { return self._portMode === 2 ? 1000000 : 1773400; };
    self.getTurbo = function() { return false; };
    self.getNumChips = function() { return 1; };
    self.getTrackFileName = function() { return self._fileName; };
    self.getTrackName = function() { return self._trackName || ''; };
    self.getAuthorName = function() { return self._authorName || ''; };
    self.getLoopCount = function() { return 0; };
    self.getNumPositions = function() { return 0; };
    self.getLoopPos = function() { return -1; };
    self.getDelay = function() { return 0; };
    var _frame = 0;
    self.getNextFrame = function() {
        if (_frame >= self._frameCount) return [[0,0,0,0,0,0,0,0,0,0,0,0,0,0], [], [], true];
        var off = _frame * 14;
        var regs = [
            self._frames[off], self._frames[off+1], self._frames[off+2],
            self._frames[off+3], self._frames[off+4], self._frames[off+5],
            self._frames[off+6], self._frames[off+7], self._frames[off+8],
            self._frames[off+9], self._frames[off+10], self._frames[off+11],
            self._frames[off+12], self._frames[off+13]
        ];
        _frame++;
        return [regs, [], [], _frame >= self._frameCount];
    };
    self.setProgress = function(k) { _frame = Math.floor(k * self._frameCount); };
    self.getProgress = function() { return Math.max(0, Math.min(1, _frame / self._frameCount)); };
}

return AYReader;
})();
