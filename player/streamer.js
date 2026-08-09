/* Chunked audio stream renderer (Web Worker).
   Renders a register dump into PCM chunks on a worker thread using the same
   synthesis core as processor.js. Rendering is far faster than real time, so a
   pass-through AudioWorklet (player_worklet.js) can play the chunks without
   ever missing audio, even when the main thread is throttled (screen off). */

var _AWV = '20260825';

self.sampleRate = 48000;

var scopeAccum = null;
var scopeAccumLen = 0;
var renderFinished = false;

function FakePort() {}
FakePort.prototype.postMessage = function(msg) {
    if (msg.type === 'scope') {
        var data = new Float64Array(msg.data);
        if (scopeAccum && scopeAccumLen + data.length <= scopeAccum.length) {
            scopeAccum.set(data, scopeAccumLen);
            scopeAccumLen += data.length;
        }
    } else if (msg.type === 'finished') {
        renderFinished = true;
    }
};

function AudioWorkletProcessor() { this.port = new FakePort(); }
var ProcClass = null;
function registerProcessor(name, cls) { ProcClass = cls; }

importScripts(
    'ayumi.js?v=' + _AWV,
    'opn.js?v=' + _AWV
);

/* processor.js must NOT be importScripts'd into this same global scope: its
   top-level `const Ayumi = globalThis.Ayumi` would collide with ayumi.js's
   global `function Ayumi` declaration (classic scripts share one scope, unlike
   audio worklet modules). Instead, evaluate it inside a nested function scope
   where those consts stay local and only registerProcessor() (the shim above)
   escapes with the AYProcessor class. */
var procSourceReady = false;
var pendingLoad = null;
fetch('processor.js?v=' + _AWV).then(function(r) {
    return r.text();
}).then(function(code) {
    (function() { eval(code); })();
    procSourceReady = true;
    if (pendingLoad) {
        var m = pendingLoad;
        pendingLoad = null;
        handleLoad(m);
    }
}).catch(function(err) {
    self.postMessage({ type: 'error', message: 'processor.js fetch/eval: ' + String((err && err.message) || err) });
});

var proc = null;
var curGen = 0;
var renderDone = false;
var currentMsg = null;
var waiting = false;
var chunkIdx = 0;

function tick(gen) {
    if (gen !== curGen || !proc) {
        return;
    }
    if (renderDone) {
        return;
    }
    var msg = currentMsg;
    if (!msg) {
        return;
    }
    renderFinished = false;
    var SR = self.sampleRate;
    var isFirst = (chunkIdx === 0);
    var chunkSec = isFirst && msg.firstChunkSeconds ? msg.firstChunkSeconds : (msg.chunkSeconds || 5);
    var ch = Math.max(128, Math.round(SR * chunkSec));
    chunkIdx++;
    var chipCh = (msg.chipCount || 1) * 3;
    if (chipCh < 3) chipCh = 3;
    var left = new Float32Array(ch);
    var right = new Float32Array(ch);
    scopeAccum = new Float32Array((Math.ceil(ch / 8) + 16) * chipCh);
    scopeAccumLen = 0;
    proc._lastProcessTime = -1;
    var startPos = proc.pos;
    var finished = false;
    var i = 0;
    try {
        while (i < ch) {
            if (gen !== curGen) return;
            var n = Math.min(128, ch - i);
            proc.process(null, [[left.subarray(i, i + n), right.subarray(i, i + n)]], null);
            i += n;
            if (renderFinished) finished = true;
        }
    } catch (err) {
        self.postMessage({ type: 'error', message: String((err && err.message) || err) });
        return;
    }
    var endPos = proc.pos;
    var scopeView = scopeAccum.subarray(0, scopeAccumLen);
    self.postMessage({
        type: 'chunk',
        gen: gen,
        left: left.buffer,
        right: right.buffer,
        scope: scopeView.buffer,
        startPos: startPos,
        endPos: endPos,
        finished: finished
    }, [left.buffer, right.buffer, scopeView.buffer]);
    if (finished) {
        renderDone = true;
        renderFinished = false;
        self.postMessage({ type: 'renderDone', gen: gen });
        return;
    }
    waiting = true;
}

function handleLoad(msg) {
    curGen = (typeof msg.gen === 'number') ? msg.gen : curGen + 1;
    renderDone = false;
    renderFinished = false;
    waiting = false;
    chunkIdx = 0;
    if (msg.sampleRate) self.sampleRate = msg.sampleRate;
    try {
        proc = new ProcClass();
    } catch (err) {
        self.postMessage({ type: 'error', message: 'ProcClass: ' + String((err && err.message) || err) });
        proc = null;
        return;
    }
    proc.port.onmessage = function(e) {};
    try {
        proc._onMessage({ data: {
            type: 'load',
            dump: msg.dump,
            isTurbo: msg.isTurbo,
            chipCount: msg.chipCount,
            isYM: msg.isYM,
            clock: msg.clock,
            frameRate: msg.frameRate,
            volume: msg.volume !== undefined ? msg.volume : 1,
            repeat: msg.repeat,
            loopFrame: msg.loopFrame,
            chipKinds: msg.chipKinds,
            opnClock: msg.opnClock,
            pan: msg.pan
        } });
        proc._onMessage({ data: { type: 'fps', fps: 1000 } });
        if (msg.firEnabled === false) proc._onMessage({ data: { type: 'fir', enabled: false } });
        if (msg.progress && msg.progress > 0) {
            proc._onMessage({ data: { type: 'setProgress', progress: msg.progress } });
        }
    } catch (err) {
        self.postMessage({ type: 'error', message: 'load: ' + String((err && err.message) || err) });
        proc = null;
        return;
    }
    proc._lastProcessTime = -1;
    currentMsg = msg;
    self.postMessage({ type: 'loaded', gen: curGen });
    setTimeout(function() { tick(curGen); }, 0);
}

self.onmessage = function(e) {
    var msg = e.data;
    if (!msg) return;
    if (msg.type === 'load') {
        if (!procSourceReady || !ProcClass) {
            pendingLoad = msg;
            return;
        }
        handleLoad(msg);
    } else if (msg.type === 'go') {
        if (waiting) {
            waiting = false;
            setTimeout(function() { tick(curGen); }, 0);
        }
    } else if (msg.type === 'stop') {
        curGen++;
        proc = null;
        renderDone = true;
        currentMsg = null;
        waiting = false;
    }
};
