/* Scope oscilloscope UI. Pure rendering helpers extracted from ayPlayer.js.
   All shared state (buffers, canvases, chip config) is passed in explicitly,
   so this module has no coupling to the player engine. */

var AYScopeUI = (function() {

    function sizeCanvas(containerId, ch) {
        var c = document.getElementById(containerId + '_scope' + ch);
        if (!c) return null;
        var dpr = window.devicePixelRatio || 1;
        var cw = c.clientWidth || 48;
        var dw = Math.max(1, Math.round(cw * dpr));
        if (c.width !== dw) { c.width = dw; c.height = dw; }
        var ctx = c.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return ctx;
    }

    function resize(containerId, scopeCtx, after) {
        for (var ch = 0; ch < 12; ch++) {
            var c = document.getElementById(containerId + '_scope' + ch);
            if (c) scopeCtx[ch] = sizeCanvas(containerId, ch);
        }
        if (after) after();
    }

    function reset(scopeBuf) {
        for (var ch = 0; ch < 12; ch++) scopeBuf[ch] = [];
    }

    /* st: { muted, chipCount, chipKinds, colors, labels, fade } */
    function draw(scopeCtx, scopeBuf, st) {
        for (var ch = 0; ch < 12; ch++) {
            var ctx = scopeCtx[ch];
            if (!ctx) continue;
            var w = ctx.canvas.clientWidth || 48, h = ctx.canvas.clientHeight || 48;
            if (ch < st.chipCount * 3) {
                var isMuted = st.muted[ch];
                ctx.fillStyle = isMuted ? '#003850' : '#001020';
                ctx.fillRect(0, 0, w, h);
                if (!isMuted) {
                    var data = scopeBuf[ch];
                    var len = data.length;
                    if (len >= 4) {
                        ctx.strokeStyle = st.colors[ch];
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        var step = Math.max(1, (len / w) | 0);
                        var scale = (h - 2) * 0.85 * st.fade;
                        var n = Math.min(w, (len / step) | 0);
                        var y0 = h / 2;
                        var isOpn = !!(st.chipKinds && st.chipKinds[(ch / 3) | 0] === 'opn');
                        var dcOff = isOpn ? 0 : 0.5;
                        for (var i = 0; i < n; i++) {
                            var v = data[i * step];
                            var x = (i * w / n) | 0;
                            var y = y0 - (v - dcOff) * scale;
                            if (y < 0) y = 0; if (y > h - 1) y = h - 1;
                            if (i === 0) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        }
                        ctx.stroke();
                    }
                }
            } else {
                ctx.fillStyle = '#003850';
                ctx.fillRect(0, 0, w, h);
            }
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '10px sans-serif';
            ctx.fillText(st.labels[ch], 2, 10);
        }
    }

    return {
        sizeCanvas: sizeCanvas,
        resize: resize,
        reset: reset,
        draw: draw
    };
})();
