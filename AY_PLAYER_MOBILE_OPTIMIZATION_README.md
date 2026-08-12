# AY Player Mobile Optimization

This patch is intentionally conservative: it does not change the audio engine.

## Apply

Copy `apply_ayplayer_mobile_optimization.js` into the AY Player project root and run:

```bash
node apply_ayplayer_mobile_optimization.js
```

It expects:

```text
player/
  ayPlayer.js
  ayPlayer.css
```

A backup is created automatically:

```text
player/ayPlayer.js.bak
```

## What it changes

1. The large waveform is rendered only when the track/waveform changes.
2. During playback only a 1px DOM playhead is moved.
3. Time text and `onTimeUpdate` are limited to about 10 updates/sec.
4. The redundant per-frame `scopeBuf.splice()` is removed.
5. Mobile scope drawing is capped at 30 FPS.
6. AudioWorklet / Worker / streaming audio are not rewritten.

## Expected result

The biggest win should be on phones: the main thread no longer rebuilds the full waveform every animation frame.

If the phone still stutters after this patch, the next target should be the scope-message path and the mobile playlist/animation CSS. Do not disable audio quality first.
