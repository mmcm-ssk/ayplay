/* Pass-through audio playback worklet for chunked streaming.
   Chunks are always rendered at 48000 Hz by streamer.js.
   The AudioContext sampleRate (available as the `sampleRate` global inside
   the AudioWorklet scope) may differ from 48000 Hz. We wrap the incoming
   chunk into a resampled accumulator: consume source samples at a rate
   proportional to 48000 / sampleRate so playback duration stays exact.
   frame position is reported in real frames (frameRate * consumed source
   samples / 48000), decoupling it from the output block size. */

class StreamPlayerProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._q = [];         // source chunks (Float32Array[2] at 48 kHz)
        this._qi = 0;         // read index into current chunk (float, source samples)
        this._total = 0;      // total source samples consumed since last clear
        this._base = 0;       // frame base at clear time (frames)
        this._frameRate = 50;
        this._volume = 1;
        this._underflow = false;
        this._lastPos = -1;
        this._posInterval = 1 / 60;
        this._srcRate = 48000; // chunks are always rendered at this rate
        this.port.onmessage = (e) => {
            const m = e.data;
            if (!m) return;
            if (m.type === 'audio') {
                this._q.push({ left: new Float32Array(m.left), right: new Float32Array(m.right) });
            } else if (m.type === 'clear') {
                this._q.length = 0;
                this._qi = 0;
                this._total = 0;
                this._base = m.base || 0;
                this._underflow = false;
            } else if (m.type === 'volume') {
                this._volume = m.volume;
            } else if (m.type === 'frameRate') {
                this._frameRate = m.frameRate || 50;
            } else if (m.type === 'fps') {
                var fps = Math.max(1, m.fps || 60);
                this._posInterval = 1 / fps;
            }
        };
    }
    process(inputs, outputs) {
        const out = outputs[0];
        const left = out && out[0];
        const right = out && out[1];
        if (!left || !right) return true;
        const n = left.length;
        const outRate = sampleRate; // AudioContext sample rate
        const srcRate = this._srcRate;
        // step = how many source samples we advance per output sample
        const step = srcRate / outRate;
        if (!this._q.length) {
            if (!this._underflow) {
                this._underflow = true;
                this.port.postMessage({ type: 'underflow' });
            }
            for (let i = 0; i < n; i++) { left[i] = 0; right[i] = 0; }
            this._reportPos();
            return true;
        }
        this._underflow = false;
        const vol = this._volume;
        let ti = 0;
        while (this._q.length && ti < n) {
            const chunk = this._q[0];
            const L = chunk.left;
            const R = chunk.right;
            const srcLen = L.length;
            // how many source samples remain in this chunk
            const remaining = srcLen - this._qi;
            // how many output samples can come from this chunk
            const availOut = Math.floor(remaining / step);
            const takeOut = Math.min(n - ti, availOut);
            for (let j = 0; j < takeOut; j++) {
                // nearest-sample (fast); could use linear interp later
                const idx = (this._qi + j * step) | 0;
                const safeIdx = idx < srcLen ? idx : srcLen - 1;
                left[ti + j] = L[safeIdx] * vol;
                right[ti + j] = R[safeIdx] * vol;
            }
            this._qi += takeOut * step;
            this._total += takeOut * step;
            ti += takeOut;
            if (this._qi >= srcLen - 1) {
                this._q.shift();
                this._qi = 0;
                this.port.postMessage({ type: 'chunkConsumed' });
            }
        }
        for (; ti < n; ti++) { left[ti] = 0; right[ti] = 0; }
        this._reportPos();
        return true;
    }
    _reportPos() {
        const now = currentTime;
        if (this._lastPos < 0 || now - this._lastPos >= this._posInterval) {
            this._lastPos = now;
            // _total is in source samples (48 kHz); divide by src rate then
            // multiply by frame rate
            const raw = this._base + (this._total / this._srcRate) * this._frameRate;
            this.port.postMessage({ type: 'pos', frame: Math.round(raw) });
        }
    }
}

registerProcessor('ay-player-processor', StreamPlayerProcessor);
