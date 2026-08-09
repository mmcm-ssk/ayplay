FYMReader = function(buffer, fileName) {
    var psgDump = pako.inflate(new Uint8Array(buffer));
    var ptr = 0;
    var frame = 0;

    function getInt() {
        var r = 0;
        for(var i = 0; i < 4; i++) r += psgDump[ptr++] << (8*i);
        return r;
    }

    function getStr() {
        var c, r = '';
        while(c = psgDump[ptr++]) r += String.fromCharCode(c);
        return r;
    }

    var offset = getInt();

    var frameCount = getInt();
    this.getFrameCount = function() {
        return frameCount;
    }

    var loopFrame = getInt();
    this.getLoopFrame = function() {
        return loopFrame;
    }

    var clockRate = getInt();
    this.getClockRate = function() {
        return clockRate;
    }

    var frameRate = getInt();
    this.getFrameRate = function() {
        return frameRate;
    }

    this.getTrackFileName = function() {
        return fileName;
    }

    var trackName = getStr();
    this.getTrackName = function() {
        return trackName;
    }

    var authorName = getStr();
    this.getAuthorName = function() {
        return authorName;
    }

    var loopCount = 0;
    this.getLoopCount = function() {
        return loopCount;
    }

	var isTurbo = ((offset + frameCount*14) < psgDump.length);
    this.getTurbo = function() {
        return isTurbo;
    }

	this.setProgress = function(k) {
		frame = Math.floor(k * frameCount);
	}

	this.getProgress = function() {
		var k = frame / frameCount;
		if (k<0) { k=0; }
		if (k>1) { k=1; }
		return k;
	}

	this.getTime = function() {
		var k = frame / frameCount;
		if (k<0) { k=0; }
		if (k>1) { k=1; }
		var fullTimeInSeconds = frameCount / frameRate;
		var timeInSeconds = Math.round(k * fullTimeInSeconds);
		var minutes = Math.floor(timeInSeconds / 60);
		var seconds = "00" + (timeInSeconds - minutes * 60);
		return minutes + ":" + seconds.substr(-2,2);
	}

	this.getTimeElapsed = function() {
		var k = frame / frameCount;
		if (k<0) { k=0; }
		if (k>1) { k=1; }
		var fullTimeInSeconds = frameCount / frameRate;
		var timeInSeconds = Math.round((1-k) * fullTimeInSeconds);
		var minutes = Math.floor(timeInSeconds / 60);
		var seconds = "00" + (timeInSeconds - minutes * 60);
		return "-" + minutes + ":" + seconds.substr(-2,2);
	}

    this.getNextFrame = function() {
		var finished = false;
		var r;
        if (frame >= frameCount) {
            return [[0,0,0,0,0,0,0,0,0,0,0,0,0,0], [0,0,0,0,0,0,0,0,0,0,0,0,0,0], true];
        }
        var regs0 = [];
        for (r = 0; r < 14; r++) {
            regs0[r] = psgDump[r * frameCount + frame + offset];
        }
		var regs1 = [];
		if (isTurbo) {
			var turboOffset = offset + frameCount*14;
			for (r = 0; r < 14; r++) {
				regs1[r] = psgDump[r * frameCount + frame + offset + turboOffset];
			}
		}
        frame++;
        if (frame >= frameCount) {
            loopCount++;
            finished = true;
        }
        return [regs0, regs1, finished];
    }
}
