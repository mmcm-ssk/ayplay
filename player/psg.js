PSGReader = function(buffer, fileName) {
    var data = new Uint8Array(buffer);
    var ptr = 0;
    var frame = 0;
    var frameCount = 0;
    var loopFrame = 0;

    var sig = String.fromCharCode(data[0]) + String.fromCharCode(data[1]) + String.fromCharCode(data[2]);
    if (sig !== 'PSG') { this.error = 'Not a PSG file'; return; }

    var headerSize = 16;
    if (data.length >= 16) {
        ptr = 16;
    } else {
        ptr = 4;
    }

    var frames = [];
    var currentRegs = [0,0,0,0,0,0,0,0,0,0,0,0,0,0];

    function parseData() {
        var localFrames = [];
        var regs = currentRegs.slice();
        var i = ptr;
        while (i < data.length) {
            var cmd = data[i++];
            if (cmd <= 0x0F && cmd < 14) {
                if (i >= data.length) break;
                regs[cmd] = data[i++];
            } else if (cmd <= 0x0F) {
                if (i >= data.length) break;
                i++;
            } else if (cmd === 0xFF) {
                localFrames.push(regs.slice());
            } else if (cmd === 0xFD) {
                break;
            } else if (cmd === 0xFE) {
                if (i >= data.length) break;
                var count = data[i++] * 4;
                for (var j = 0; j < count; j++) {
                    localFrames.push(regs.slice());
                }
            }
        }
        return localFrames;
    }

    frames = parseData();
    // Post-process R13 to use 0xFF sentinel (no change) like PT3 reader
    var lastR13 = frames[0][13];
    for (var fi = 1; fi < frames.length; fi++) {
        if (frames[fi][13] === lastR13) {
            frames[fi][13] = 0xFF;
        } else {
            lastR13 = frames[fi][13];
        }
    }
    frameCount = frames.length;
    var dataLen = data.length;

    this.getFrameCount = function() { return frameCount; };

    this.getFrameRate = function() { return 50; };

    this.getClockRate = function() { return 1773400; };

    this.getTurbo = function() { return false; };

    this.getNumChips = function() { return 1; };

    this.getTrackFileName = function() { return fileName; };

    this.getTrackName = function() {
        var name = fileName.replace(/^.*[\\\/]/, '').replace(/\.psg$/i, '');
        return decodeURIComponent(name);
    };

    this.getAuthorName = function() { return ''; };

    this.getLoopFrame = function() { return loopFrame; };
    this.getNumPositions = function() { return 0; };
    this.getLoopPos = function() { return -1; };
    this.getDelay = function() { return 0; };
    this.getLoopCount = function() { return 0; };

    this.setProgress = function(k) {
        frame = Math.floor(k * frameCount);
    };

    this.getProgress = function() {
        var k = frame / frameCount;
        if (k < 0) k = 0;
        if (k > 1) k = 1;
        return k;
    };

    this.getTime = function() {
        var k = frame / frameCount;
        if (k < 0) k = 0;
        if (k > 1) k = 1;
        var fullTimeInSeconds = frameCount / 50;
        var timeInSeconds = Math.round(k * fullTimeInSeconds);
        var minutes = Math.floor(timeInSeconds / 60);
        var seconds = "00" + (timeInSeconds - minutes * 60);
        return minutes + ":" + seconds.substr(-2,2);
    };

    this.getTimeElapsed = function() {
        var k = frame / frameCount;
        if (k < 0) k = 0;
        if (k > 1) k = 1;
        var fullTimeInSeconds = frameCount / 50;
        var timeInSeconds = Math.round((1 - k) * fullTimeInSeconds);
        var minutes = Math.floor(timeInSeconds / 60);
        var seconds = "00" + (timeInSeconds - minutes * 60);
        return "-" + minutes + ":" + seconds.substr(-2,2);
    };

    this.getNextFrame = function() {
        if (frame >= frameCount) {
            return [[0,0,0,0,0,0,0,0,0,0,0,0,0,0], [], [], true];
        }
        var regs0 = frames[frame].slice();
        frame++;
        var done = (frame >= frameCount);
        return [regs0, [], [], done];
    };
};
