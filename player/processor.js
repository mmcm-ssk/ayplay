const Ayumi = globalThis.Ayumi;
const OPN = globalThis.OPN;
const OPN_SCALE = 1 / 32768;
const DECIMATE_FACTOR = globalThis.DECIMATE_FACTOR;
const FIR_SIZE = globalThis.FIR_SIZE;
const DC_FILTER_SIZE = globalThis.DC_FILTER_SIZE;
const AY_DAC_TABLE = globalThis.AY_DAC_TABLE;
const YM_DAC_TABLE = globalThis.YM_DAC_TABLE;

const ENV_SHAPES = [
  [0,3],[0,3],[0,3],[0,3],
  [1,3],[1,3],[1,3],[1,3],
  [0,0],[0,3],[0,1],[0,2],
  [1,1],[1,2],[1,0],[1,3]
];

Ayumi.prototype.setEnvelopeShape = function(shape) {
  this.envelopeShape = shape & 0x0f;
  this.envelopeCounter = 0;
  this.envelopeSegment = 0;
  this.envType = ENV_SHAPES[this.envelopeShape][0];
  this.envelope = (this.envType === 0 || this.envType === 2) ? 31 : 0;
};

Ayumi.prototype.process = function() {
  var ch0 = this.channels[0], ch1 = this.channels[1], ch2 = this.channels[2];
  var dac = this.dacTable;
  var cLeft = this.interpolatorLeft.c;
  var yLeft = this.interpolatorLeft.y;
  var cRight = this.interpolatorRight.c;
  var yRight = this.interpolatorRight.y;
  var firOffset = FIR_SIZE - this.firIndex * DECIMATE_FACTOR;
  var firLeft = this.firLeft.subarray(firOffset);
  var firRight = this.firRight.subarray(firOffset);
  this.firIndex = (this.firIndex + 1) % (FIR_SIZE / DECIMATE_FACTOR - 1);
  for (var i = DECIMATE_FACTOR - 1; i >= 0; i--) {
    this.x += this.step;
    if (this.x >= 1) {
      this.x--;
      yLeft[0] = yLeft[1]; yLeft[1] = yLeft[2]; yLeft[2] = yLeft[3];
      yRight[0] = yRight[1]; yRight[1] = yRight[2]; yRight[2] = yRight[3];
      if (++this.noiseCounter >= (this.noisePeriod + 1)) {
        this.noiseCounter = 0;
        var bit0x3 = (this.noise ^ (this.noise >> 3)) & 1;
        this.noise = (this.noise >> 1) | (bit0x3 << 16);
      }
      var noise = this.noise & 1;
      if (++this.envelopeCounter >= this.envelopePeriod) {
        this.envelopeCounter = 0;
        if (this.envType === 0) {
          if (--this.envelope < 0) {
            this.envelopeSegment ^= 1;
            this.envType = ENV_SHAPES[this.envelopeShape][this.envelopeSegment];
            this.envelope = (this.envType === 0 || this.envType === 2) ? 31 : 0;
          }
        } else if (this.envType === 1) {
          if (++this.envelope > 31) {
            this.envelopeSegment ^= 1;
            this.envType = ENV_SHAPES[this.envelopeShape][this.envelopeSegment];
            this.envelope = (this.envType === 0 || this.envType === 2) ? 31 : 0;
          }
        }
      }
      var envelope = this.envelope;
      if (++ch0.toneCounter >= ch0.tonePeriod) { ch0.toneCounter = 0; ch0.tone ^= 1; }
      var out0 = (ch0.tone | ch0.tOff) & (noise | ch0.nOff);
      out0 *= ch0.eOn ? envelope : ch0.volume * 2 + 1;
      var amp0 = dac[out0];
      this.chanRaw[0] = amp0;
      var L = amp0 * ch0.panLeft;
      var R = amp0 * ch0.panRight;
      if (++ch1.toneCounter >= ch1.tonePeriod) { ch1.toneCounter = 0; ch1.tone ^= 1; }
      var out1 = (ch1.tone | ch1.tOff) & (noise | ch1.nOff);
      out1 *= ch1.eOn ? envelope : ch1.volume * 2 + 1;
      var amp1 = dac[out1];
      this.chanRaw[1] = amp1;
      L += amp1 * ch1.panLeft;
      R += amp1 * ch1.panRight;
      if (++ch2.toneCounter >= ch2.tonePeriod) { ch2.toneCounter = 0; ch2.tone ^= 1; }
      var out2 = (ch2.tone | ch2.tOff) & (noise | ch2.nOff);
      out2 *= ch2.eOn ? envelope : ch2.volume * 2 + 1;
      var amp2 = dac[out2];
      this.chanRaw[2] = amp2;
      L += amp2 * ch2.panLeft;
      R += amp2 * ch2.panRight;
      this.left = L;
      this.right = R;
      yLeft[3] = L;
      yRight[3] = R;
      var y1 = yLeft[2] - yLeft[0];
      cLeft[0] = 0.5 * yLeft[1] + 0.25 * (yLeft[0] + yLeft[2]);
      cLeft[1] = 0.5 * y1;
      cLeft[2] = 0.25 * (yLeft[3] - yLeft[1] - y1);
      y1 = yRight[2] - yRight[0];
      cRight[0] = 0.5 * yRight[1] + 0.25 * (yRight[0] + yRight[2]);
      cRight[1] = 0.5 * y1;
      cRight[2] = 0.25 * (yRight[3] - yRight[1] - y1);
    }
    firLeft[i] = (cLeft[2] * this.x + cLeft[1]) * this.x + cLeft[0];
    firRight[i] = (cRight[2] * this.x + cRight[1]) * this.x + cRight[0];
  }
  if (this.firEnabled === false) {
    var sumL = 0, sumR = 0;
    for (var i = 0; i < DECIMATE_FACTOR; i++) { sumL += firLeft[i]; sumR += firRight[i]; }
    this.left = sumL / DECIMATE_FACTOR;
    this.right = sumR / DECIMATE_FACTOR;
  } else {
    this.left = this.decimate(firLeft);
    this.right = this.decimate(firRight);
  }
};

function _updateState(renderer, r) {
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

class AYProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = this._onMessage.bind(this);
    this._reset();
  }

  _reset() {
    this.ayumi = null;
    this.ayumi2 = null;
    this.ayumi3 = null;
    this.ayumi4 = null;
    this.opn = null;
    this.opn2 = null;
    this.opn3 = null;
    this.opn4 = null;
    this.chipKinds = null;
    this.opnClock = 3500000;
    this._panData = null;
    this._chanRaw = new Float64Array(12);
    this._opnTmp = new Float64Array(3);
    this.dump = [];
    this.dumpLen = 0;
    this.pos = 0;
    this.isTurbo = false;
    this.chipCount = 1;
    this.volume = 1.0;
    this.repeat = false;
    this.finished = false;
    this.isYM = true;
    this.clock = 1750000;
    this.frameRate = 50;
    this.loopFrame = 0;
    this.isrStep = 0;
    this.isrCounter = 0;
    this._lastProcessTime = -1;
    this._silenceEnd = 0;

    this._scopeBuf = new Float64Array(256 * 12);
    this._scopeCount = 0;
    this._scopeSendSkip = 0;
    this._scopeSendThreshold = 6;
    this._cpuAccum = 0;
    this._cpuCount = 0;
    this._cpuSendSkip = 0;
    this._usePerf = false;
    this._useDate = false;
    try {
      if (typeof performance !== 'undefined') this._usePerf = typeof performance.now === 'function';
    } catch(e) {}
    if (!this._usePerf) {
      try {
        if (typeof self !== 'undefined' && self.performance) this._usePerf = typeof self.performance.now === 'function';
      } catch(e) {}
    }
    if (!this._usePerf) {
      try {
        if (typeof globalThis !== 'undefined' && globalThis.performance) this._usePerf = typeof globalThis.performance.now === 'function';
      } catch(e) {}
    }
    if (!this._usePerf) {
      try { var d = Date; this._useDate = typeof d.now === 'function'; } catch(e) {}
    }
    this._hasPerf = this._usePerf || this._useDate;
    this.port.postMessage({ type: 'loadTimer', usePerf: this._usePerf, useDate: this._useDate });
    this.firEnabled = true;
  }

  _onMessage(e) {
    var msg = e.data;
    switch (msg.type) {
      case 'load':
        this._lastProcessTime = -1;
        this._silenceEnd = 0;
        this.dump = msg.dump;
        this.dumpLen = msg.dump.length;
        this.isTurbo = msg.isTurbo;
        this.chipCount = msg.chipCount || (msg.isTurbo ? 2 : 1);
        this.isYM = msg.isYM;
        this.clock = msg.clock;
        this.frameRate = msg.frameRate;
        this.volume = msg.volume !== undefined ? msg.volume : this.volume;
        this.repeat = msg.repeat || false;
        this.loopFrame = msg.loopFrame || 0;
        console.log('Processor load: clock=' + this.clock + ' frameRate=' + this.frameRate + ' dumpLen=' + this.dumpLen);
        this.pos = 0;
        this.finished = false;
        this.isrStep = this.frameRate / sampleRate;
        this.isrCounter = 1.0;
        this.chipKinds = msg.chipKinds || null;
        this.opnClock = msg.opnClock || 3500000;
        this.ayumi = null;
        this.ayumi2 = null;
        this.ayumi3 = null;
        this.ayumi4 = null;
        this.opn = null;
        this.opn2 = null;
        this.opn3 = null;
        this.opn4 = null;
        this._panData = null;
        if (this.chipKinds && this.chipKinds[0] === 'opn') {
          this.opn = new OPN(this.opnClock, sampleRate);
        } else {
          this.ayumi = new Ayumi();
          this.ayumi.configure(this.isYM, this.clock, sampleRate);
          this.ayumi.firEnabled = this.firEnabled;
        }
        if (this.chipCount > 1) {
          if (this.chipKinds && this.chipKinds[1] === 'opn') {
            this.opn2 = new OPN(this.opnClock, sampleRate);
          } else {
            this.ayumi2 = new Ayumi();
            this.ayumi2.configure(this.isYM, this.clock, sampleRate);
            this.ayumi2.firEnabled = this.firEnabled;
          }
        }
        if (this.chipCount > 2) {
          if (this.chipKinds && this.chipKinds[2] === 'opn') {
            this.opn3 = new OPN(this.opnClock, sampleRate);
          } else {
            this.ayumi3 = new Ayumi();
            this.ayumi3.configure(this.isYM, this.clock, sampleRate);
            this.ayumi3.firEnabled = this.firEnabled;
          }
        }
        if (this.chipCount > 3) {
          if (this.chipKinds && this.chipKinds[3] === 'opn') {
            this.opn4 = new OPN(this.opnClock, sampleRate);
          } else {
            this.ayumi4 = new Ayumi();
            this.ayumi4.configure(this.isYM, this.clock, sampleRate);
            this.ayumi4.firEnabled = this.firEnabled;
          }
        }
        if (msg.pan) this._applyPan(msg.pan);
        this.port.postMessage({ type: 'loaded' });
        break;
      case 'volume':
        this.volume = msg.volume;
        break;
      case 'repeat':
        this.repeat = msg.repeat;
        break;
      case 'pan':
        this._applyPan(msg.pan);
        break;
      case 'setProgress':
        var k = msg.progress;
        this.pos = Math.round(k * this.dumpLen);
        if (this.pos >= this.dumpLen) this.pos = this.dumpLen - 1;
        if (this.pos < 0) this.pos = 0;
        this.finished = false;
        this._rebuildState();
        break;
      case 'chipType':
        if (this.ayumi) this.ayumi.setChip(msg.isYM);
        if (this.ayumi2) this.ayumi2.setChip(msg.isYM);
        if (this.ayumi3) this.ayumi3.setChip(msg.isYM);
        break;
      case 'clock':
        if (this.ayumi) this.ayumi.step = msg.clock / (sampleRate * 64);
        if (this.ayumi2) this.ayumi2.step = msg.clock / (sampleRate * 64);
        if (this.ayumi3) this.ayumi3.step = msg.clock / (sampleRate * 64);
        break;
      case 'frameRate':
        this.frameRate = msg.frameRate;
        this.isrStep = this.frameRate / sampleRate;
        break;
      case 'fir':
        this.firEnabled = msg.enabled;
        if (this.ayumi) this.ayumi.firEnabled = msg.enabled;
        if (this.ayumi2) this.ayumi2.firEnabled = msg.enabled;
        if (this.ayumi3) this.ayumi3.firEnabled = msg.enabled;
        break;
      case 'fps':
        var callsPerSec = sampleRate / 128;
        this._scopeSendThreshold = Math.max(1, Math.round(callsPerSec / msg.fps));
        break;
    }
  }

  _applyPan(pan) {
    this._panData = pan;
    if (this.ayumi) {
      for (var ch = 0; ch < 3; ch++) {
        this.ayumi.channels[ch].panLeft = pan[ch].left;
        this.ayumi.channels[ch].panRight = pan[ch].right;
      }
    }
    if (this.chipCount > 1 && this.ayumi2) {
      for (var ch = 0; ch < 3; ch++) {
        this.ayumi2.channels[ch].panLeft = pan[ch + 3].left;
        this.ayumi2.channels[ch].panRight = pan[ch + 3].right;
      }
    }
    if (this.chipCount > 2 && this.ayumi3) {
      for (var ch = 0; ch < 3; ch++) {
        this.ayumi3.channels[ch].panLeft = pan[ch + 6].left;
        this.ayumi3.channels[ch].panRight = pan[ch + 6].right;
      }
    }
    if (this.chipCount > 3 && this.ayumi4) {
      for (var ch = 0; ch < 3; ch++) {
        this.ayumi4.channels[ch].panLeft = pan[ch + 9].left;
        this.ayumi4.channels[ch].panRight = pan[ch + 9].right;
      }
    }
  }

  _isOpn(ci) {
    return !!(this.chipKinds && this.chipKinds[ci] === 'opn');
  }

  _rebuildState() {
    /* reconstruct full register state from frame 0 up to this.pos (no audio) */
    for (var f = 0; f < this.pos; f++) {
      var e = this.dump[f];
      if (!e) continue;
      var srcs = [e.a, e.b, e.c, e.d];
      for (var ci = 0; ci < this.chipCount; ci++) {
        var s = srcs[ci];
        if (!s) continue;
        if (this._isOpn(ci)) {
          var opn = this._getOpn(ci);
          for (var gi = 0; gi < s.length; gi++) opn.writeReg(s[gi][0], s[gi][1]);
        } else {
          _updateState(this._getAyumi(ci), s);
        }
      }
    }
  }

  _getAyumi(ci) {
    if (ci === 0) return this.ayumi;
    if (ci === 1) return this.ayumi2;
    if (ci === 2) return this.ayumi3;
    return this.ayumi4;
  }

  _getOpn(ci) {
    if (ci === 0) return this.opn;
    if (ci === 1) return this.opn2;
    if (ci === 2) return this.opn3;
    return this.opn4;
  }

  process(inputs, outputs, parameters) {
    var cpuStart;
    if (this._usePerf) cpuStart = performance.now();
    else if (this._useDate) cpuStart = Date.now();
    else cpuStart = -1;
    var output = outputs[0];
    var left = output[0];
    var right = output[1];
    if (!left || !right) return true;
    if (this._lastProcessTime >= 0 && !this.finished) {
      var gap = Date.now() - this._lastProcessTime;
      var expectedGap = (left.length || 128) / sampleRate * 1000;
      if (gap > expectedGap * 2) {
        var missedFrames = Math.round((gap - expectedGap) / 1000 * this.frameRate);
        if (missedFrames > 0) {
          this.pos += missedFrames;
          if (this.pos >= this.dumpLen - 1) {
            this.finished = true;
            if (this.repeat) { this.pos = this.loopFrame; this.finished = false; }
          }
        }
      }
    }
    this._lastProcessTime = Date.now();
    if ((!this.ayumi && !this.opn) || this.dumpLen === 0) {
      for (var i = 0; i < (left.length || 0); i++) { left[i] = 0; if (right) right[i] = 0; }
      return true;
    }

    this._scopeCount = 0;
    if (this.finished) {
      for (var i = 0; i < left.length; i++) { left[i] = 0; if (right) right[i] = 0; }
      if (this.finished) this.port.postMessage({ type: 'finished' });
      return true;
    }
    for (var i = 0; i < left.length; i++) {
      this.isrCounter += this.isrStep;
      if (this.isrCounter >= 1) {
        var e = this.dump[this.pos];
        if (e) {
          var srcs = [e.a, e.b, e.c, e.d];
          for (var ci = 0; ci < this.chipCount; ci++) {
            var s = srcs[ci];
            if (!s) continue;
            if (this._isOpn(ci)) {
              var opn = this._getOpn(ci);
              for (var gi = 0; gi < s.length; gi++) opn.writeReg(s[gi][0], s[gi][1]);
            } else {
              _updateState(this._getAyumi(ci), s);
            }
          }
        }
        if (this.pos >= this.dumpLen - 1) {
          this.finished = true;
          if (this.repeat) { this.pos = this.loopFrame; this.finished = false; }
        } else {
          this.pos++;
        }
        if (this.finished) {
          left[i] = 0;
          right[i] = 0;
          i++;
          for (; i < left.length; i++) { left[i] = 0; if (right) right[i] = 0; }
          this.port.postMessage({ type: 'finished' });
          return true;
        }
        this.isrCounter--;
      }
      var mixedLeft = 0;
      var mixedRight = 0;
      var pd = this._panData;
      for (var ci = 0; ci < this.chipCount; ci++) {
        var base = ci * 3;
        if (this._isOpn(ci)) {
          var opn = this._getOpn(ci);
          var c = opn.renderSample(this._opnTmp);
          for (var g = 0; g < 3; g++) {
            var amp = c[g] * OPN_SCALE;
            this._chanRaw[base + g] = amp;
            var p = pd ? pd[base + g] : null;
            mixedLeft += p ? amp * p.left : amp * 0.5;
            mixedRight += p ? amp * p.right : amp * 0.5;
          }
        } else {
          var aa = this._getAyumi(ci);
          aa.process();
          aa.removeDC();
          this._chanRaw[base] = aa.chanRaw[0];
          this._chanRaw[base + 1] = aa.chanRaw[1];
          this._chanRaw[base + 2] = aa.chanRaw[2];
          mixedLeft += aa.left;
          mixedRight += aa.right;
        }
      }
      var normFactor = Math.sqrt(this.chipCount);
      left[i] = (mixedLeft / normFactor) * this.volume;
      right[i] = (mixedRight / normFactor) * this.volume;
      if ((i & 7) === 0 && this._scopeCount < 256) {
        var sc = this.chipCount;
        var idx = this._scopeCount * sc * 3;
        for (var g2 = 0; g2 < sc * 3; g2++) this._scopeBuf[idx + g2] = this._chanRaw[g2];
        this._scopeCount++;
      }
    }
    if (this._scopeCount > 0) {
      this._scopeSendSkip++;
      if (this._scopeSendSkip >= this._scopeSendThreshold) {
        this._scopeSendSkip = 0;
        var buf = this._scopeBuf.slice(0, this._scopeCount * this.chipCount * 3);
        this.port.postMessage({ type: 'scope', data: buf.buffer, pos: this.pos }, [buf.buffer]);
      }
    }
    if (this.finished) this.port.postMessage({ type: 'finished' });

    if (cpuStart >= 0) {
      if (this._usePerf) this._cpuAccum += performance.now() - cpuStart;
      else this._cpuAccum += Date.now() - cpuStart;
    }
    if (cpuStart >= 0) this._cpuCount++;
    this._cpuSendSkip++;
    if (this._cpuSendSkip >= 100 && cpuStart >= 0 && this._cpuCount > 0) {
      this._cpuSendSkip = 0;
      var bufMs = 128 / sampleRate * 1000;
      var avg = this._cpuAccum / this._cpuCount;
      var pct = Math.round(avg / bufMs * 100);
      this.port.postMessage({ type: 'cpu', load: Math.min(pct, 999) });
      this._cpuAccum = 0;
      this._cpuCount = 0;
    }
    return true;
  }
}

registerProcessor('ay-processor', AYProcessor);
