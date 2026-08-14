### ASSISTANT
Да, теперь картина полная — и это очень хорошо. У тебя архитектура уже **в целом правильная для мобильного**:

- `streamer.js` рендерит аудио заранее в Web Worker;
- `player_worklet.js` просто воспроизводит готовые чанки;
- основной поток не обязан успевать генерировать каждый семпл.

То есть **сам по себе троттлинг основного потока не должен ускорять звук**. Максимум — должен быть underrun/тишина, если чанков не хватило.

Но в присланном коде есть **конкретные места, которые действительно могут давать ускорение/скачки темпа на мобильном**.

---

# Главная проблема: catch-up есть прямо в `processor.js`

В `processor.js`, внутри `process()`, у тебя есть такой блок:

```js
if (this._lastProcessTime >= 0 && !this.finished) {
    var gap = Date.now() - this._lastProcessTime;
    var expectedGap = (left.length || 128) / sampleRate * 1000;

    if (gap > expectedGap * 2) {
        var missedFrames = Math.round((gap - expectedGap) / 1000 * this.frameRate);

        if (missedFrames > 0) {
            this.pos += missedFrames;

            if (this.pos >= this.dumpLen - 1) {
                this.finished = true;
                if (this.repeat) {
                    this.pos = this.loopFrame;
                    this.finished = false;
                }
            }
        }
    }
}

this._lastProcessTime = Date.now();
```

Это и есть **catch-up в чистом виде**.

Он делает следующее:

- если между вызовами `process()` прошло больше времени, чем ожидается;
- процессор решает, что он «отстал»;
- и начинает пропускать кадры:

```js
this.pos += missedFrames;
```

Для оффлайн-рендера в `streamer.js` это **нельзя делать вообще**.

---

## Почему это особенно опасно у тебя

В `streamer.js` ты рендеришь чанки не в реальном времени, а сильно быстрее реального времени:

```js
while (i < ch) {
    var n = Math.min(128, ch - i);
    proc.process(...);
    i += n;
}
```

То есть `process()` вызывается подряд очень много раз.

Но на мобильном процесс может быть медленным, особенно если:

- 4 чипа;
- OPN;
- FIR включён;
- устройство слабое;
- браузер в энергосбережении;
- CPU throttling.

Один блок `128` семплов при 48 kHz длится:

```text
128 / 48000 * 1000 ? 2.67 ms
```

У тебя порог:

```js
gap > expectedGap * 2
```

То есть если блок рендерится дольше примерно `5.3 ms`, начинается:

```js
this.pos += missedFrames;
```

И это приводит к тому, что трек начинает «убегать вперёд».

Субъективно это может ощущаться как:

- звук стал быстрее;
- темп скачет;
- трек как будто «догоняет»;
- музыка ускоряется после нагрузки или блокировки экрана.

---

# Что сделать в `processor.js`

## 1. Удалить catch-up блок

Найди этот кусок:

```js
if (this._lastProcessTime >= 0 && !this.finished) {
    var gap = Date.now() - this._lastProcessTime;
    var expectedGap = (left.length || 128) / sampleRate * 1000;

    if (gap > expectedGap * 2) {
        var missedFrames = Math.round((gap - expectedGap) / 1000 * this.frameRate);

        if (missedFrames > 0) {
            this.pos += missedFrames;

            if (this.pos >= this.dumpLen - 1) {
                this.finished = true;
                if (this.repeat) {
                    this.pos = this.loopFrame;
                    this.finished = false;
                }
            }
        }
    }
}

this._lastProcessTime = Date.now();
```

И удали его полностью.

Если хочешь оставить хоть какую-то диагностическую переменную, можно заменить на:

```js
// Wall-clock catch-up disabled: offline rendering must never skip frames
// because of Date.now() gaps.
```

Но лучше вообще не трогать `this.pos` на основании времени.

---

## 2. Убрать зависимость от `_lastProcessTime`

В `streamer.js` и `streamer.compact.js` у тебя есть:

```js
proc._lastProcessTime = -1;
```

После удаления catch-up это уже не нужно.

Можешь удалить строки:

```js
proc._lastProcessTime = -1;
```

из:

```js
handleLoad()
handleWaveform()
tick()
```

Но это не критично, если сам catch-up удалён.

---

# Вторая вероятная причина: рассинхрон sampleRate между streamer и player_worklet

У тебя в `player_worklet.js`:

```js
this._srcRate = 48000; // chunks are always rendered at this rate
```

И дальше:

```js
const step = srcRate / outRate;
```

Это правильно, **если чанки всегда рендерятся в 48000 Hz**.

Но в `streamer.js` есть:

```js
if (msg.sampleRate) self.sampleRate = msg.sampleRate;
```

И в `streamer.compact.js` то же самое.

Если основной код присылает:

```js
sampleRate: audioCtx.sampleRate
```

и `audioCtx.sampleRate` равен, например, `44100`, то получится:

- streamer рендерит в `44100`;
- player_worklet думает, что чанки в `48000`;
- playback будет быстрее примерно на:

```text
48000 / 44100 ? 1.088
```

То есть ускорение примерно на **8.8%**.

Это очень похоже на мобильную проблему, потому что на разных устройствах `AudioContext.sampleRate` может быть:

```text
44100
48000
96000
```

---

## Что сделать в `streamer.js`

У тебя комментарий уже говорит:

```js
/* Chunked audio stream renderer (Web Worker).
Chunks are always rendered at 48000 Hz ...
*/
```

Значит нужно реально запретить менять sampleRate.

### Вариант A: жёстко зафиксировать 48000

Замени:

```js
self.sampleRate = 48000;
```

на:

```js
const RENDER_SAMPLE_RATE = 48000;
self.sampleRate = RENDER_SAMPLE_RATE;
```

И в `handleLoad()` убери:

```js
if (msg.sampleRate) self.sampleRate = msg.sampleRate;
```

или замени на:

```js
self.sampleRate = RENDER_SAMPLE_RATE;
```

То же самое в `handleWaveform()`:

```js
self.sampleRate = RENDER_SAMPLE_RATE;
```

---

### Вариант B: если хочешь поддерживать другой render rate

Тогда нужно сообщить `player_worklet.js`, с каким sampleRate реально пришли чанки.

В `streamer.js` после load можно отправить main thread:

```js
self.postMessage({
    type: 'renderSampleRate',
    gen: curGen,
    rate: self.sampleRate
});
```

А main thread должен переслать это в player worklet:

```js
playerNode.port.postMessage({
    type: 'srcRate',
    rate: msg.rate
});
```

И в `player_worklet.js` добавить:

```js
} else if (m.type === 'srcRate') {
    this._srcRate = m.rate || 48000;
}
```

Но проще и надёжнее — **всегда рендерить в 48000**.

---

# Третья проблема: `player_worklet.js` может зависнуть или терять точность на границе чанков

У тебя есть ресемплер:

```js
const remaining = srcLen - this._qi;
const availOut = Math.floor(remaining / step);
const takeOut = Math.min(n - ti, availOut);
```

Если `availOut === 0`, но чанк ещё неshifted, возможен бесконечный цикл, потому что:

- `ti` не увеличивается;
- `this._qi` не увеличивается;
- чанк не удаляется.

Это может произойти, когда в конце чанка осталось меньше source-семплов, чем `step`.

Например:

```text
step = 48000 / 44100 ? 1.088
remaining = 1.05
availOut = 0
```

И цикл застревает.

---

## Исправленный ресемплер для `player_worklet.js`

Замени блок потребления чанков на более надёжный.

Пример:

```js
process(inputs, outputs) {
    const out = outputs[0];
    const left = out && out[0];
    const right = out && out[1];

    if (!left || !right) return true;

    const n = left.length;
    const outRate = sampleRate;
    const srcRate = this._srcRate;
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

        for (let i = 0; i < n; i++) {
            left[i] = 0;
            right[i] = 0;
        }

        this._reportPos();
        return true;
    }

    this._underflow = false;
    this._underflowCount = 0;

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

        // Если осталось меньше одного выходного шага, всё равно нужно
        // произвести один sample, чтобы не застрять и не потерять хвост.
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

    for (; ti < n; ti++) {
        left[ti] = 0;
        right[ti] = 0;
    }

    if (this._xfEnabled) this._applyXf(left, right, n);

    this._reportPos();

    return true;
}
```

Здесь важны три момента:

1. Нет бесконечного цикла при `availOut === 0`.
2. Есть перенос дробной позиции в следующий чанк:

```js
const carry = this._qi - srcLen;
this._qi = carry;
```

3. Чанк считается потреблённым только когда реально закончился.

---

# Четвёртая проблема: `setTimeout` в worker тоже может троттлиться

В `streamer.js`:

```js
setTimeout(function() { tick(curGen); }, 0);
```

и в `streamer.compact.js` то же самое.

В Web Worker `setTimeout` тоже может замедляться на мобильном, особенно если страница неактивна.

Это не должно ускорять звук, но может вызывать:

- underrun;
- тишину;
- остановку подгрузки чанков;
- возобновление рывками.

---

## Что можно сделать

### 1. Убрать `setTimeout` и вызывать `tick()` напрямую

В `streamer.js`:

Было:

```js
setTimeout(function() { tick(curGen); }, 0);
```

Можно заменить на:

```js
tick(curGen);
```

Например, в конце `handleLoad()`:

```js
self.postMessage({ type: 'loaded', gen: curGen });
tick(curGen);
```

И в обработчике `go`:

Было:

```js
} else if (msg.type === 'go') {
    if (waiting) {
        waiting = false;
        setTimeout(function() { tick(curGen); }, 0);
    }
}
```

Стало:

```js
} else if (msg.type === 'go') {
    if (waiting) {
        waiting = false;
        tick(curGen);
    }
}
```

Так как это Web Worker, синхронный рендер одного чанка обычно допустим.

---

### 2. Увеличить prebuffer

Если у тебя чанки по 5 секунд, это хорошо. Но на мобильном лучше держать больший запас.

Если main thread управляет подгрузкой, старайся держать очередь, например:

```text
10–20 секунд аудио
```

или больше, если память позволяет.

Если очередь маленькая, при блокировке экрана worker может не успеть/не смочь пополнить её, и начнётся underrun.

---

### 3. Перед уходом в фон можно рендерить больше

На main thread можно добавить:

```js
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // попросить worker заранее отрендерить больше чанков,
        // если это поддерживается в твоём main code
    }
});
```

Но для этого нужна поддержка в main-коде, которого я не вижу.

---

# Пятая проблема: `finished` может отправляться многократно

В `processor.js` есть:

```js
if (this.finished) {
    for (var i = 0; i < left.length; i++) {
        left[i] = 0;
        if (right) right[i] = 0;
    }

    if (this.finished) this.port.postMessage({ type: 'finished' });

    return true;
}
```

Если `process()` продолжат вызывать после окончания, `finished` будет отправляться снова и снова.

В `streamer.js` это, скорее всего, не приведёт к ускорению, но может спамить сообщениями.

Лучше сделать флаг:

В `_reset()`:

```js
this._finishedSent = false;
```

В `load` тоже сбрасывать:

```js
this._finishedSent = false;
```

И отправлять один раз:

```js
if (this.finished) {
    for (var i = 0; i < left.length; i++) {
        left[i] = 0;
        if (right) right[i] = 0;
    }

    if (!this._finishedSent) {
        this._finishedSent = true;
        this.port.postMessage({ type: 'finished' });
    }

    return true;
}
```

И в конце `process()` тоже:

```js
if (this.finished) {
    if (!this._finishedSent) {
        this._finishedSent = true;
        this.port.postMessage({ type: 'finished' });
    }
}
```

---

# Шестая проблема: `MTCReader.getFrameRate()` всё ещё может давать неверный FPS

Это уже не связано напрямую с троттлингом, но влияет на скорость.

У тебя:

```js
this.getFrameRate = function() {
    return readers[0].getFrameRate();
};
```

Если в MTC первый ридер, например, 60 Hz, а второй должен быть 50 Hz, весь dump может быть собран с неправильным темпом.

Для диагностики временно сделай:

```js
this.getFrameRate = function() {
    var fps = readers[0].getFrameRate();
    console.log('[MTC] frameRate from first reader:', fps);
    return fps;
};
```

Если у тебя контент в основном PAL ZX Spectrum, можно временно проверить:

```js
this.getFrameRate = function() {
    return 50;
};
```

Если скорость станет стабильной — проблема в FPS контейнера/ридеров.

---

# Что именно я бы поправил первым делом

## Приоритет 1: удалить catch-up из `processor.js`

Удалить:

```js
if (this._lastProcessTime >= 0 && !this.finished) {
    ...
    this.pos += missedFrames;
    ...
}
this._lastProcessTime = Date.now();
```

Это самый вероятный источник самопроизвольного ускорения при нагрузке.

---

## Приоритет 2: запретить `msg.sampleRate` в `streamer.js`

Оставить всегда:

```js
self.sampleRate = 48000;
```

И не делать:

```js
if (msg.sampleRate) self.sampleRate = msg.sampleRate;
```

Если основной код всё-таки присылает `sampleRate`, нужно либо игнорировать его, либо синхронизировать с `player_worklet._srcRate`.

---

## Приоритет 3: исправить ресемплер в `player_worklet.js`

Особенно:

```js
availOut <= 0
```

и перенос дробной позиции:

```js
carry = this._qi - srcLen;
```

---

## Приоритет 4: убрать `setTimeout` в `streamer.js`

Заменить:

```js
setTimeout(function() { tick(curGen); }, 0);
```

на прямой вызов:

```js
tick(curGen);
```

или на self-message loop, если боишься длинных синхронных задач.

---

# Как проверить, что проблема была именно в catch-up

Добавь в `streamer.js` после рендера чанка временную проверку.

В `tick()` есть:

```js
var startPos = proc.pos;
...
var endPos = proc.pos;
```

Добавь:

```js
var renderedFrames = endPos - startPos;
var expectedFrames = ch * self.sampleRate ? 0 : 0;
```

Правильнее:

```js
var expectedFrames = ch * (proc.frameRate / self.sampleRate);

console.log('[streamer] chunk frames:', {
    startPos,
    endPos,
    renderedFrames,
    expectedFrames,
    diff: renderedFrames - expectedFrames
});
```

Норма:

```text
diff ? 0 или ±1
```

Плохо:

```text
diff = 10
diff = 80
diff = 300
```

Если до удаления catch-up были большие положительные `diff`, значит процессор пропускал кадры и ускорял трек.

---

# Итоговый минимальный патч

Если коротко, сделай три вещи.

---

## 1. `processor.js`

Удалить блок с:

```js
missedFrames
this.pos += missedFrames
Date.now()
```

---

## 2. `streamer.js` / `streamer.compact.js`

Запретить менять sampleRate:

```js
self.sampleRate = 48000;
```

и не использовать:

```js
if (msg.sampleRate) self.sampleRate = msg.sampleRate;
```

---

## 3. `player_worklet.js`

Исправить потребление чанков, чтобы не было `availOut = 0` infinite loop и чтобы дробная позиция переносилась между чанками.

---

После этих правок архитектура должна вести себя так:

- при троттлинге — возможная тишина/underrun, но **не ускорение**;
- при восстановлении — продолжение с той же скоростью;
- темп зависит только от `frameRate`, `clock`, `48000` и реального `AudioContext.sampleRate`, а не от `Date.now()` и задержек таймеров.