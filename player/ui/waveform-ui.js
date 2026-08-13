/* Waveform UI. Pure rendering helpers extracted from ayPlayer.js.
   Owns the offscreen static canvas cache and the playhead DOM state.
   Data (waveformData/waveformCh) and dimensions are passed in via a state
   object so this module has no coupling to the player engine. */

var AYWaveformUI = (function() {

    var _wfOff = null;
    var _wfOffCtx = null;
    var _wfOffValid = false;
    var _wfOffData = null;
    var _wfOffMode = null;
    var _playheadPx = -1;

    function drawWave(ctx, data, w, h, mid, color, invert, half) {
        var len = data.length;
        if (len < 4) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        var scale = half ? mid : mid * 2;
        var step = Math.max(1, (len / w) | 0);
        var n = Math.min(w, (len / step) | 0);
        for (var i = 0; i < n; i++) {
            var v = data[i * step];
            var x = (i * w / n) | 0;
            var y = invert ? mid + ((v * scale) | 0) : mid - ((v * scale) | 0);
            if (y < 1) y = 1; if (y > h - 1) y = h - 1;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    /* st: { containerId, hasData, cachedWidth } */
    function updatePlayhead(st, frac) {
        var line = document.getElementById(st.containerId + '_wavePlayhead');
        var shade = document.getElementById(st.containerId + '_wavePlayed');
        var shown = !!st.hasData && frac >= 0;
        var w = st.cachedWidth || (line ? line.parentNode.clientWidth : 0);
        var px = 0;
        if (shown) {
            px = Math.round(frac * w);
            if (px > w) px = w;
            if (px < 0) px = 0;
        }
        if (line) {
            if (!shown) { if (line.style.opacity !== '0') line.style.opacity = '0'; }
            else {
                if (px !== _playheadPx) { _playheadPx = px; line.style.transform = 'translate3d(' + px + 'px,0,0)'; }
                if (line.style.opacity !== '1') line.style.opacity = '1';
            }
        }
        if (shade) {
            if (!shown) { if (shade.style.opacity !== '0') shade.style.opacity = '0'; }
            else {
                var s = Math.max(0, Math.min(1, frac));
                shade.style.transform = 'scaleX(' + s.toFixed(4) + ')';
                if (shade.style.opacity !== '1') shade.style.opacity = '1';
            }
        }
    }

    /* st: { frameCount, endFrame, data, channels, mode } */
    function renderStatic(ctx, w, h, st) {
        var fc = st.frameCount || 0;
        ctx.fillStyle = '#001828';
        ctx.fillRect(0, 0, w, h);
        var wf = st.endFrame || fc;
        var waveEnd = fc > 0 ? Math.round(w * wf / fc) : w;
        if (waveEnd > w) waveEnd = w;
        var n = st.data.length;
        var step = waveEnd / n;
        var scale = 1.0;
        if (st.mode === 'mix') {
            var mid = h >> 1;
            ctx.fillStyle = 'rgba(0,180,220,0.5)';
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(0, mid);
            for (var i = 0; i < n; i++) {
                var sum = 0;
                for (var ch = 0; ch < st.channels.length; ch++) {
                    sum += st.channels[ch][i];
                }
                var amp = Math.min(sum, 1) * mid;
                ctx.lineTo(i * step, mid - amp);
            }
            ctx.lineTo(waveEnd, mid);
            ctx.lineTo(waveEnd, mid + 0.5);
            for (var i = n - 1; i >= 0; i--) {
                var sum = 0;
                for (var ch = 0; ch < st.channels.length; ch++) {
                    sum += st.channels[ch][i];
                }
                var amp = Math.min(sum, 1) * mid;
                ctx.lineTo(i * step, mid + amp);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            var chCount = st.channels.length || 3;
            var chColors = ['#44FF44', '#FFFF44', '#44AAFF', '#FF6644', '#CC66FF', '#44FFAA', '#FF88CC', '#88FF88', '#FFAA44'];
            var chNames = [];
            for (var ci = 0; ci < chCount; ci++) chNames.push(String.fromCharCode(65 + (ci % 3)) + (chCount > 3 ? Math.floor(ci / 3) + 1 : ''));
            var gap = 4;
            var padTB = 4;
            var bandH = (h - padTB * 2 - gap * (chCount - 1)) / chCount;
            for (var ch = 0; ch < chCount; ch++) {
                var y0 = Math.round(padTB + ch * (bandH + gap));
                var y1 = Math.round(padTB + (ch + 1) * (bandH + gap)) - gap;
                var bh = y1 - y0;
                var mid = bh >> 1;
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#001824';
                ctx.fillRect(0, y0, w, bh);
                ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, y0 + mid);
                ctx.lineTo(waveEnd, y0 + mid);
                ctx.stroke();
                var data = ch < st.channels.length ? st.channels[ch] : st.data;
                ctx.fillStyle = chColors[ch % chColors.length];
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.moveTo(0, y0 + mid);
                for (var i = 0; i < n; i++) {
                    var amp = data[i] * mid * scale;
                    ctx.lineTo(i * step, y0 + mid - amp);
                }
                ctx.lineTo(waveEnd, y0 + mid);
                ctx.lineTo(waveEnd, y0 + mid + 0.5);
                for (var i = n - 1; i >= 0; i--) {
                    var amp = data[i] * mid * scale;
                    ctx.lineTo(i * step, y0 + mid + amp);
                }
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '7px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(chNames[ch % chNames.length], 1, y0 + 1);
            }
        }
        ctx.globalAlpha = 1;
    }

    /* st: { containerId, data, channels, mode, frameCount, endFrame,
             cachedWidth, cachedHeight, lastK } */
    function draw(st) {
        var canvas = document.getElementById(st.containerId + '_waveCanvas');
        if (!canvas || !st.data) return;
        var ctx = canvas.getContext('2d');
        var w = st.cachedWidth || canvas.parentNode.clientWidth;
        var h = st.cachedHeight || canvas.parentNode.clientHeight || 186;
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; _wfOffValid = false; }
        var needStatic = !_wfOffValid || _wfOffData !== st.data || _wfOffMode !== st.mode;
        if (needStatic) {
            if (!_wfOff) { _wfOff = document.createElement('canvas'); _wfOffCtx = _wfOff.getContext('2d'); }
            if (_wfOff.width !== w || _wfOff.height !== h) { _wfOff.width = w; _wfOff.height = h; }
            renderStatic(_wfOffCtx, w, h, st);
            _wfOffData = st.data;
            _wfOffMode = st.mode;
            _wfOffValid = true;
        }
        ctx.drawImage(_wfOff, 0, 0);
        updatePlayhead(st, st.lastK >= 0 ? st.lastK / 100 : 0);
    }

    return {
        drawWave: drawWave,
        updatePlayhead: updatePlayhead,
        renderStatic: renderStatic,
        draw: draw
    };
})();
