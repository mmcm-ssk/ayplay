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
        this._underflowCount = 0;
        this._maxUnderflow = 10;
        this._endOfTrack = false;  // streamer sent last chunk
        this._endedSent = false;
        this._xfEnabled = false;
        this._xf = {
            bufL: new Float32Array(2048),
            bufR: new Float32Array(2048),
            w: 0,
            delay: Math.min(Math.round(0.0004 * sampleRate), 2047),
            k: 0.24,
            lp: 0.3
        };
        this._xfLpfL = 0;
        this._xfLpfR = 0;
        this.port.onmessage = (e) => {
            const m = e.data;
            if (!m) return;
            if (m.type === 'audio') {
                this._q.push({ left: new Float32Array(m.left), right: new Float32Array(m.right) });
                this._underflowCount = 0;
            } else if (m.type === 'clear') {
                this._q.length = 0;
                this._qi = 0;
                this._total = 0;
                this._base = m.base || 0;
                this._underflow = false;
                this._underflowCount = 0;
                this._endOfTrack = false;
                this._endedSent = false;
            } else if (m.type === 'volume') {
                this._volume = m.volume;
            } else if (m.type === 'frameRate') {
                this._frameRate = m.frameRate || 50;
            } else if (m.type === 'fps') {
                var fps = Math.max(1, m.fps || 60);
                this._posInterval = 1 / fps;
            } else if (m.type === 'endOfTrack') {
                this._endOfTrack = true;
            } else if (m.type === 'xf') {
                this._xfEnabled = !!m.enabled;
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
            this._underflowCount++;
            if (!this._underflow && this._underflowCount >= this._maxUnderflow) {
                this._underflow = true;
                this.port.postMessage({ type: 'underflow' });
            }
            if (this._endOfTrack && !this._endedSent) {
                this._endedSent = true;
                this.port.postMessage({ type: 'ended' });
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

            if (!srcLen) {
                this._q.shift();
                this._qi = 0;
                continue;
            }

            if (this._qi >= srcLen) {
                this._qi -= srcLen;
                this._q.shift();
                this.port.postMessage({ type: 'chunkConsumed' });
                continue;
            }

            const remaining = srcLen - this._qi;

            let availOut = Math.floor(remaining / step);

            // If less than one full output step remains, still produce one
            // sample so we never stall and never drop the chunk tail.
            if (availOut <= 0) {
                availOut = 1;
            }

            const takeOut = Math.min(n - ti, availOut);

            for (let j = 0; j < takeOut; j++) {
                const pos = this._qi + j * step;

                let i0 = pos | 0;

                if (i0 >= srcLen) i0 = srcLen - 1;
                if (i0 < 0) i0 = 0;

                const i1 = (i0 + 1 < srcLen) ? (i0 + 1) : i0;
                const frac = pos - i0;

                left[ti + j] = (L[i0] + (L[i1] - L[i0]) * frac) * vol;
                right[ti + j] = (R[i0] + (R[i1] - R[i0]) * frac) * vol;
            }

            this._qi += takeOut * step;
            this._total += takeOut * step;
            ti += takeOut;

            if (this._qi >= srcLen) {
                const carry = this._qi - srcLen;

                this._q.shift();
                this._qi = carry;

                this.port.postMessage({ type: 'chunkConsumed' });
            }
        }
        for (; ti < n; ti++) { left[ti] = 0; right[ti] = 0; }
        if (this._xfEnabled) this._applyXf(left, right, n);
        this._reportPos();
        return true;
    }
    _applyXf(left, right, n) {
        const xf = this._xf;
        const N = xf.bufL.length;
        const k = xf.k;
        const lp = xf.lp;
        let w = xf.w;
        for (let i = 0; i < n; i++) {
            xf.bufL[w] = left[i];
            xf.bufR[w] = right[i];
            let ir = w - xf.delay;
            if (ir < 0) ir += N;
            const dL = xf.bufL[ir];
            const dR = xf.bufR[ir];
            this._xfLpfR += lp * (dL - this._xfLpfR);
            this._xfLpfL += lp * (dR - this._xfLpfL);
            left[i] = left[i] * (1 - k) + this._xfLpfL * k;
            right[i] = right[i] * (1 - k) + this._xfLpfR * k;
            w++;
            if (w >= N) w = 0;
        }
        xf.w = w;
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
