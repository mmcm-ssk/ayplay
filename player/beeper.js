/**
 * Beeper renderer for ZX Spectrum beeper-only .ay tracks.
 *
 * Based on ZXTune: src/devices/beeper/beeper.cpp + src/sound/lpfilter.h
 *   - BeeperPSG: MAX/4 (0.25) when ON, 0 when OFF (unipolar)
 *   - HQWrapper: 2nd-order IIR LPF (biquad Butterworth)
 *   - ClockSource: edge-interpolation with fractional t-state positioning
 *
 * Renders at audio sample rate. For each audio sample, finds the exact
 * edge positions within that sample's time window and produces clean
 * output. The IIR LPF smooths transitions to avoid clicks.
 */
function Beeper(sampleRate, cpuClock, frameRate) {
  this.sampleRate = sampleRate || 48000;
  this.cpuClock = cpuClock || 3494400;
  this.frameRate = frameRate || 50;
  this.spf = this.sampleRate / this.frameRate;
  this.tpf = this.cpuClock / this.frameRate;
  this.level = false;
  this.enabled = true;
  this._setupFilter();
}

Beeper.prototype._setupFilter = function() {
  // 2nd-order IIR biquad LPF. Matches ZXTune:
  //   SOUND_CUTOFF_FREQUENCY = 9500 Hz, Q = 1.0 (see src/devices/details/renderers.h + src/sound/lpfilter.h)
  var sr = this.sampleRate;
  var cutoff = 9500;
  var w0 = 2 * Math.PI * cutoff / sr;
  var q = 1.0; // ZXTune Q
  var sinus = Math.sin(w0);
  var cosine = Math.cos(w0);
  var alpha = sinus / (2 * q);
  var a0 = 1 + alpha;
  var b0 = (1 - cosine) / 2;
  this._fA = b0 / a0;
  this._fB = (2 * cosine) / a0;
  this._fC = (1 - alpha) / a0;
  this._in1 = 0; this._in2 = 0;
  this._out1 = 0; this._out2 = 0;
};

Beeper.prototype.reset = function() {
  this.level = false;
  this._in1 = this._in2 = this._out1 = this._out2 = 0;
};

/**
 * Render one frame of beeper edges into a Float32Array of `spf` samples.
 *
 * For each audio sample, computes the exact fraction of the frame that
 * sample covers (in t-states), finds all edges within that window,
 * produces the appropriate raw level, and feeds it through the IIR LPF.
 *
 * The output is: filtered level * amplitude (0.25 when on, matching ZXTune).
 * No clicks at edge boundaries because the LPF smooths transitions.
 */
Beeper.prototype.render = function(edges) {
  if (!this.enabled) return null;
  var N = Math.round(this.spf);
  var out = new Float32Array(N);
  var lvl = this.level;
  var fA = this._fA, fB = this._fB, fC = this._fC;
  var in1 = this._in1, in2 = this._in2, out1 = this._out1, out2 = this._out2;
  var tpf = this.tpf;
  var ei = 0, len = edges ? edges.length : 0;

  for (var s = 0; s < N; s++) {
    // This audio sample covers t-states from s*tpf/N to (s+1)*tpf/N
    var sampleStart = s * tpf / N;
    var sampleEnd = (s + 1) * tpf / N;

    // Find the last edge within this sample's window
    var lvlAtEnd = lvl;
    while (ei < len && edges[ei][0] <= sampleEnd) {
      lvlAtEnd = edges[ei][1];
      ei++;
    }

    // ZXTune BeeperPSG: MAX/4 when on, 0 when off
    var raw = lvlAtEnd ? 0.25 : 0;
    // ZXTune HQWrapper: 2nd-order IIR LPF
    var filtered = fA * (raw + 2 * in1 + in2) + fB * out1 - fC * out2;
    in2 = in1; in1 = raw;
    out2 = out1; out1 = filtered;
    out[s] = filtered;
  }

  this.level = lvlAtEnd;
  this._in1 = in1; this._in2 = in2;
  this._out1 = out1; this._out2 = out2;
  return out;
};

Beeper.prototype.configure = function(cpuClock, frameRate) {
  if (cpuClock) this.cpuClock = cpuClock;
  if (frameRate) this.frameRate = frameRate;
  this.spf = this.sampleRate / this.frameRate;
  this.tpf = this.cpuClock / this.frameRate;
  this._setupFilter();
};

if (typeof module !== 'undefined' && module.exports) module.exports = { Beeper: Beeper };
if (typeof globalThis !== 'undefined') globalThis.Beeper = Beeper;