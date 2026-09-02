/* Off-main-thread waveform peak generation.
   AY: reads volume registers (r[8], r[9], r[10]) directly — no core needed.
   OPN: renders through OPN core, takes peak per frame.
   Both paths produce exactly 1 value per frame per channel. */
var _WAVE_OPN = null;

function _waveLoadOPN() {
    if (_WAVE_OPN) return true;
    var awv = '';
    try { awv = new URLSearchParams(self.location.search).get('awv') || ''; } catch (e) {}
    try {
        if (awv) importScripts('opn.js?v=' + awv);
        else importScripts('opn.js');
    } catch (e) { return false; }
    _WAVE_OPN = self.OPN;
    return !!_WAVE_OPN;
}

function _waveBin(arr) {
    var pts = 1000, n = arr.length;
    if (n === 0) return new Float64Array(pts);
    if (n <= pts) {
        var d = new Float64Array(pts);
        for (var i = 0; i < pts; i++) d[i] = arr[(i * n / pts)|0];
        return d;
    }
    var d = new Float64Array(pts);
    for (var i = 0; i < n; i++) {
        var idx = (i * pts / n)|0;
        if (arr[i] > d[idx]) d[idx] = arr[i];
    }
    return d;
}

function _waveGen(req) {
    var dump = req.dump, fc = req.fc;
    if (!fc || fc <= 0 || !dump || dump.length === 0) {
        postMessage({ type: 'done', id: req.id, fnBase: req.fnBase, data: new Array(1000).fill(0), channels: [], endFrame: -1 });
        return;
    }
    var chipCount = req.chipCount, chipTypes = req.chipTypes, opnClk = req.opnClock || 3500000;
    var chCount = chipCount * 3;
    var samplesPerFrame = Math.max(2, Math.min(256, Math.floor(44100 / (req.fr || 50))));
    var hasOpn = false;
    if (chipTypes) for (var i = 0; i < chipTypes.length; i++) if (chipTypes[i] === 'opn') { hasOpn = true; break; }
    if (hasOpn && !_waveLoadOPN()) { postMessage({ type: 'fallback', id: req.id }); return; }
    var opnGens = [];
    if (hasOpn) {
        for (var gi = 0; gi < chipCount; gi++) {
            if (chipTypes && chipTypes[gi] === 'opn') opnGens.push(new _WAVE_OPN(opnClk, 44100));
            else opnGens.push(null);
        }
    }
    var opnTmp = [0, 0, 0];
    var allAmps = [], chAmps = [];
    for (var ch = 0; ch < chCount; ch++) chAmps.push([]);
    var f = 0, cancelled = false;
    req._cancel = function() { cancelled = true; };

    function step() {
        if (cancelled) return;
        var t0 = (self.performance && performance.now) ? performance.now() : Date.now();
        do {
            var entry = dump[f];
            var srcs = [entry.a, entry.b, entry.c, entry.d];
            var frameMax = 0;
            for (var ci = 0; ci < chipCount; ci++) {
                var src = srcs[ci];
                if (!src) continue;
                var base = ci * 3;
                if (chipTypes && chipTypes[ci] === 'opn') {
                    var og = opnGens[ci];
                    for (var pr = 0; pr < src.length; pr++) og.writeReg(src[pr][0], src[pr][1]);
                    var chPeaks = [0, 0, 0];
                    for (var s2 = 0; s2 < samplesPerFrame; s2++) {
                        og.renderSample(opnTmp);
                        for (var ch2 = 0; ch2 < 3; ch2++) {
                            var v = Math.abs(opnTmp[ch2] / 32768);
                            if (v > chPeaks[ch2]) chPeaks[ch2] = v;
                        }
                    }
                    for (var ch2 = 0; ch2 < 3; ch2++) {
                        chAmps[base + ch2].push(chPeaks[ch2]);
                        if (chPeaks[ch2] > frameMax) frameMax = chPeaks[ch2];
                    }
                } else {
                    var vA = (src[8] & 0xf) / 15;
                    var vB = (src[9] & 0xf) / 15;
                    var vC = (src[10] & 0xf) / 15;
                    chAmps[base].push(vA);
                    chAmps[base + 1].push(vB);
                    chAmps[base + 2].push(vC);
                    if (vA > frameMax) frameMax = vA;
                    if (vB > frameMax) frameMax = vB;
                    if (vC > frameMax) frameMax = vC;
                }
            }
            allAmps.push(frameMax);
            f++;
        } while (f < fc && (self.performance && performance.now ? performance.now() : Date.now()) - t0 < 100);
        postMessage({ type: 'progress', id: req.id, p: Math.min(f / fc, 1) });
        if (f < fc) {
            setTimeout(step, 0);
        } else {
            var endIdx = fc - 1;
            var waveAmps = allAmps.slice(0, endIdx + 1);
            var bo = _waveBin(waveAmps);
            var gm = 0.001;
            for (var i = 0; i < bo.length; i++) if (bo[i] > gm) gm = bo[i];
            var data = bo.map(function(v) { return v / gm; });
            var channels = chAmps.map(function(chArr) {
                var sliced = chArr.slice(0, endIdx + 1);
                var b = _waveBin(sliced);
                var cgm = 0.001;
                for (var i = 0; i < b.length; i++) if (b[i] > cgm) cgm = b[i];
                var d = new Array(2000);
                for (var i = 0; i < 1000; i++) { d[2 * i] = 0; d[2 * i + 1] = b[i] / cgm; }
                return d;
            });
            postMessage({ type: 'done', id: req.id, fnBase: req.fnBase, data: data, channels: channels, endFrame: endIdx });
        }
    }
    step();
}

var _waveCurrent = null;
self.onmessage = function(e) {
    var m = e.data;
    if (!m) return;
    if (m.type === 'gen') {
        if (_waveCurrent && _waveCurrent._cancel) _waveCurrent._cancel();
        _waveCurrent = m;
        _waveGen(m);
    } else if (m.type === 'cancel') {
        if (_waveCurrent && _waveCurrent._cancel) _waveCurrent._cancel();
        _waveCurrent = null;
    }
};
