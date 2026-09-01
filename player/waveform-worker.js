/* Off-main-thread waveform peak generation.
   Replicates the compute of generateDumpWaveform using Ayumi/OPN cores,
   which are loaded via importScripts with the same versions as the audio core. */
var _WAVE_AYUMI = null, _WAVE_OPN = null;

function _waveLoadCores() {
    if (_WAVE_AYUMI && _WAVE_OPN) return true;
    var awv = '';
    try { awv = new URLSearchParams(self.location.search).get('awv') || ''; } catch (e) {}
    try {
        if (awv) importScripts('ayumi.js?v=' + awv, 'opn.js?v=' + awv);
        else importScripts('ayumi.js', 'opn.js');
    } catch (e) { return false; }
    _WAVE_AYUMI = self.Ayumi;
    _WAVE_OPN = self.OPN;
    return !!(_WAVE_AYUMI && _WAVE_OPN);
}

function _waveUpdateState(renderer, r) {
    renderer.setTone(0, ((r[1] << 8) | r[0]) || 2);
    renderer.setTone(1, ((r[3] << 8) | r[2]) || 2);
    renderer.setTone(2, ((r[5] << 8) | r[4]) || 2);
    renderer.setNoise(r[6]);
    renderer.setMixer(0, r[7] & 1, (r[7] >> 3) & 1, r[8] >> 4);
    renderer.setMixer(1, (r[7] >> 1) & 1, (r[7] >> 4) & 1, r[9] >> 4);
    renderer.setMixer(2, (r[7] >> 2) & 1, (r[7] >> 5) & 1, r[10] >> 4);
    renderer.setVolume(0, r[8] & 0xf);
    renderer.setVolume(1, r[9] & 0xf);
    renderer.setVolume(2, r[10] & 0xf);
    renderer.setEnvelope((r[12] << 8) | r[11]);
    if (r[13] != 0xff) renderer.setEnvelopeShape(r[13]);
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

function _waveBinMin(arr) {
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
        if (arr[i] < d[idx]) d[idx] = arr[i];
    }
    return d;
}

function _waveGen(req) {
    if (!_waveLoadCores()) { postMessage({ type: 'fallback', id: req.id }); return; }
    var Ayumi = _WAVE_AYUMI, OPN = _WAVE_OPN;
    var dump = req.dump, fc = req.fc, clock = req.clock;
    var chipCount = req.chipCount, chipTypes = req.chipTypes, opnClk = req.opnClock || 3500000;
    var chCount = chipCount * 3;
    var samplesPerFrame = Math.max(2, Math.min(256, Math.floor(44100 / (req.fr || 50))));
    var allAmps = [], chMinAmps = [], chMaxAmps = [];
    for (var ch = 0; ch < chCount; ch++) { chMinAmps.push([]); chMaxAmps.push([]); }
    var ayGens = [], opnGens = [];
    for (var gi = 0; gi < chipCount; gi++) {
        if (chipTypes && chipTypes[gi] === 'opn') {
            opnGens.push(new OPN(opnClk, 44100));
            ayGens.push(null);
        } else {
            var agn = new Ayumi();
            agn.configure(false, clock, 44100);
            ayGens.push(agn);
            opnGens.push(null);
        }
    }
    var opnTmp = [0, 0, 0];
    var f = 0, cancelled = false;
    req._cancel = function() { cancelled = true; };

    function step() {
        if (cancelled) return;
        var t0 = (self.performance && performance.now) ? performance.now() : Date.now();
        var peaks = new Array(chCount * 3), fmin = new Array(chCount), fmax = new Array(chCount);
        do {
            var entry = dump[f];
            var srcs = [entry.a, entry.b, entry.c, entry.d];
            for (var ci = 0; ci < chipCount; ci++) {
                var src = srcs[ci];
                if (!src) continue;
                if (chipTypes && chipTypes[ci] === 'opn') {
                    var og = opnGens[ci];
                    for (var pr = 0; pr < src.length; pr++) og.writeReg(src[pr][0], src[pr][1]);
                } else {
                    _waveUpdateState(ayGens[ci], src);
                }
            }
            peaks.fill(0); fmin.fill(0); fmax.fill(0);
            for (var ci = 0; ci < chipCount; ci++) {
                var base = ci * 3;
                if (chipTypes && chipTypes[ci] === 'opn') {
                    var og = opnGens[ci];
                    for (var s2 = 0; s2 < samplesPerFrame; s2++) {
                        og.renderSample(opnTmp);
                        for (var ch = 0; ch < 3; ch++) {
                            var v = opnTmp[ch] / 32768;
                                var av = v < 0 ? -v : v;
                                if (av > peaks[base + ch]) peaks[base + ch] = av;
                                if (v > fmax[base + ch]) fmax[base + ch] = v;
                                if (v < fmin[base + ch]) fmin[base + ch] = v;
                        }
                    }
                } else {
                    var agn = ayGens[ci];
                    for (var s2 = 0; s2 < samplesPerFrame; s2++) {
                        agn.process();
                        for (var ch = 0; ch < 3; ch++) {
                            var v = agn.chanOut[ch].left;
                                var av = v < 0 ? -v : v;
                                if (av > peaks[base + ch]) peaks[base + ch] = av;
                                if (v > fmax[base + ch]) fmax[base + ch] = v;
                                if (v < fmin[base + ch]) fmin[base + ch] = v;
                        }
                    }
                }
            }
            var frameMax = 0;
            for (var ch = 0; ch < chCount; ch++) {
                if (peaks[ch] > frameMax) frameMax = peaks[ch];
                chMinAmps[ch].push(fmin[ch]);
                chMaxAmps[ch].push(fmax[ch]);
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
            var waveChMin = [], waveChMax = [];
            for (var ch = 0; ch < chCount; ch++) {
                waveChMin.push(chMinAmps[ch].slice(0, endIdx + 1));
                waveChMax.push(chMaxAmps[ch].slice(0, endIdx + 1));
            }
            var bo = _waveBin(waveAmps);
            var bcMin = waveChMin.map(_waveBinMin);
            var bcMax = waveChMax.map(_waveBin);
            var gm = 0.001;
            for (var i = 0; i < bo.length; i++) if (bo[i] > gm) gm = bo[i];
            var data = bo.map(function(v) { return v / gm; });
            var channels = bcMax.map(function(cmx, ch) {
                var cmn = bcMin[ch];
                var cgm = 0.001;
                for (var i = 0; i < cmx.length; i++) {
                    if (cmx[i] > cgm) cgm = cmx[i];
                    if (-cmn[i] > cgm) cgm = -cmn[i];
                }
                var d = new Array(2000);
                for (var i = 0; i < 1000; i++) { d[2 * i] = cmn[i] / cgm; d[2 * i + 1] = cmx[i] / cgm; }
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
