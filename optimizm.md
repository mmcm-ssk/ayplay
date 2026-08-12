# AY Player — Mobile Performance Optimization

## ЦЕЛЬ

Провести полноценную оптимизацию AY Player для мобильных устройств Android/iOS.

Главная цель:

> PT3 должен проигрываться плавно, без заиканий, щелчков, пропусков аудио и рывков интерфейса даже на среднем/слабом мобильном устройстве.

При этом необходимо сохранить текущий дизайн и функциональность плеера.

НЕ делать полный редизайн.

НЕ переписывать аудиодвижок без доказанной необходимости.

---

# 1. ОБЯЗАТЕЛЬНО: СНАЧАЛА ИССЛЕДОВАТЬ ПРОЕКТ

Перед изменением кода полностью изучи архитектуру проекта.

Особенно внимательно проверь:

- `player/ayPlayer.js`
- `player/ayPlayer.css`
- `player/processor.js`
- `player/player_worklet.js`

А также все связанные JS-файлы.

Найди:

1. PT3 parser;
2. AY emulator;
3. AudioWorklet;
4. Worker;
5. playback loop;
6. `requestAnimationFrame`;
7. waveform generation;
8. waveform rendering;
9. scope rendering;
10. playlist rendering;
11. position updates;
12. timer updates;
13. `postMessage`;
14. TypedArray allocations;
15. Canvas rendering;
16. DOM mutations;
17. CSS animations;
18. audio buffer creation;
19. memory cleanup при смене трека.

НЕ начинай оптимизацию, пока не понял поток данных.

Сначала составь внутреннюю модель:

```text
PT3
 v
parser
 v
emulator
 v
Worker / AudioWorklet
 v
audio output

и отдельно:

audio telemetry
 v
main thread
 v
waveform
scope
playhead
timer
UI
2. КРИТИЧЕСКОЕ ПРАВИЛО
AUDIO НЕ ДОЛЖЕН ЗАВИСЕТЬ ОТ UI

Аудио должно продолжать работать независимо от того, насколько быстро браузер рисует интерфейс.

Правильная архитектура:

                    PT3
                     ¦
                     Ў
                  Worker
                     ¦
                     Ў
               AudioWorklet
                     ¦
                     Ў
                   AUDIO
                     ¦
                  speakers


UI / VISUALIZATION

Audio telemetry
      ¦
      +--------------¬
      Ў              Ў
  Playhead         Scope
  30–60 FPS       20–30 FPS

Waveform
   ¦
   L-- static
       rendered once
       per track

Нельзя делать:

audio processing
       v
main thread
       v
heavy Canvas rendering
       v
DOM
       v
audio timing

AudioWorklet должен остаться основой realtime audio.

НЕ использовать ScriptProcessorNode.

3. ПЕРВЫЙ ГЛАВНЫЙ BOTTLENECK — WAVEFORM

Найди:

drawWaveform()

и ВСЕ места, где она вызывается.

Особенно проверь:

requestAnimationFrame(...)
updateProgress(...)

Если во время каждого playback frame происходит:

drawWaveform()

это необходимо исправить.

Неправильно
60 FPS
 v
updateProgress()
 v
drawWaveform()
 v
clear Canvas
 v
create paths
 v
draw waveform
Правильно
TRACK LOAD
    v
generate waveform
    v
draw waveform ONCE
    v
STATIC CANVAS


PLAYBACK
    v
move playhead only

Во время проигрывания waveform не должен полностью перерисовываться.

4. PLAYHEAD

Создать отдельный лёгкий элемент:

<div class="waveform-progress-line"></div>

или использовать отдельный lightweight Canvas layer.

Предпочтительно:

transform: translate3d(...);

а не:

left: ...;

Цель:

waveform = static
playhead = animated

Playhead может обновляться:

desktop: 60 FPS
mobile: 30 FPS
5. REQUESTANIMATIONFRAME

Найди основной:

rafLoop()

Раздели его обязанности.

RAF НЕ должен каждый кадр:

перерисовывать весь waveform;
перерисовывать playlist;
создавать большие массивы;
делать тяжёлые вычисления;
обновлять десятки DOM-элементов;
запускать waveform generation.

RAF должен выполнять только лёгкие визуальные операции.

6. TIMER

Если сейчас время трека обновляется 60 раз/сек — уменьшить.

Например:

10 FPS

или обновлять только при изменении отображаемой секунды.

Пример:

const timeText = getTimeDisplay();

if (timeText !== previousTimeText) {
    previousTimeText = timeText;
    timeElement.textContent = timeText;
}

Аудио clock при этом НЕ менять.

7. PLAYBACK CLOCK

Точное положение трека должно определяться аудиодвижком / playback frame.

Не использовать:

setInterval()

для точного audio timing.

UI может быть менее точным:

audio timing: realtime
playhead: 30–60 FPS
timer: ~10 FPS
8. SCOPE

Найди:

drawScope()

и путь:

AudioWorklet
 v
postMessage
 v
scope data
 v
drawScope()

Scope — это только визуализация.

Не нужно рисовать его с частотой audio processing.

Рекомендуемые значения:

desktop:
30–60 FPS

mobile:
20–30 FPS

Рекомендуемый mobile default:

30 FPS

Аудио при этом НЕ должно становиться 30 FPS.

9. SCOPE DATA

Особенно внимательно найти:

new Float32Array(...)
new Float64Array(...)
Array.from(...)
slice(...)
splice(...)

в realtime visual path.

Например, если существует:

new Float64Array(msg.data)

проверь, действительно ли необходимо создавать копию.

Не создавать новый массив на каждом frame, если можно переиспользовать буфер.

Предпочтительно:

reuse TypedArray
reuse buffers
reuse objects
10. SCOPE BUFFER

Если в rafLoop() есть что-то вроде:

scopeBuf[ch].splice(...)

или другие операции очистки/копирования массивов каждый кадр — убрать это из RAF.

Предпочтительно использовать:

fixed-size buffer

или:

ring buffer

Но если полная переделка buffer architecture рискованна, сделать минимальное изменение.

Главное:

Не менять audio data path ради оптимизации визуализации.

11. AUDIOWORKLET > MAIN THREAD

Найти все:

port.postMessage(...)

в AudioWorklet.

Разделить сообщения на:

Critical
audio state
playback state
Visual
scope
VU
channel levels
position telemetry

Visual telemetry должна быть ограничена по частоте.

Например:

scope: 20–30 messages/sec
position: 10–30 messages/sec
timer: 10/sec

Не отправлять огромные массивы данных на main thread без необходимости.

12. WORKER > MAIN THREAD

Проверить Worker.

Найти:

postMessage()

и посмотреть, какие данные передаются.

Если передаются большие:

ArrayBuffer
TypedArray
PCM buffers
waveform arrays

проверить возможность использовать:

Transferable ArrayBuffer

вместо копирования.

Но НЕ ломать ownership буферов, которые используются AudioWorklet.

13. WAVEFORM GENERATION

Найти функцию генерации waveform.

Если waveform создаётся через AY emulator/Ayumi:

не выполнять огромную непрерывную задачу в main thread.

Если уже используется chunked generation:

chunk
 v
yield
 v
chunk
 v
yield

сохранить эту архитектуру.

Для mobile можно уменьшить CPU budget:

desktop: примерно 8–12 ms
mobile: примерно 4–6 ms

Но сначала измерить реальную стоимость.

14. WAVEFORM DOWNSAMPLING

Не рисовать миллионы samples.

Если Canvas имеет:

1000 px

нет смысла рисовать:

1000000 points

Использовать downsampling.

Предпочтительно:

raw waveform
      v
min/max envelope
      v
~1–2 values per pixel
      v
Canvas

На мобильных можно использовать ещё меньшую resolution.

Внешний вид waveform должен остаться практически тем же.

15. WAVEFORM CACHE

В проекте уже может существовать:

waveformCache

Если он есть — использовать его.

Цель:

PT3
 v
waveform generated once
 v
cache

При повторном открытии:

cache
 v
draw immediately

Не генерировать waveform заново.

16. INDEXEDDB CACHE

После основных оптимизаций можно рассмотреть:

IndexedDB

для хранения waveform.

Например:

PT3 filename/hash
        v
IndexedDB
        v
waveform

При повторном открытии:

PT3
 v
IndexedDB
 v
waveform

Но IndexedDB — P2.

Не усложнять проект до выполнения базовой оптимизации.

17. CANVAS

Проверить количество Canvas.

Если есть:

6 отдельных scope Canvas

не объединять их автоматически.

Сначала:

убрать лишние redraw;
ограничить FPS;
убрать allocations;
уменьшить DPR;
только потом рассмотреть объединение.

Если объединение Canvas изменит внешний вид или усложнит код — НЕ делать.

18. DEVICE PIXEL RATIO

Проверить:

window.devicePixelRatio

На мобильных Canvas может неожиданно стать огромным.

Например:

CSS:
360 ? 180

DPR 3:
1080 ? 540 physical pixels

Это значительно увеличивает стоимость Canvas rendering.

Использовать разумное ограничение:

const dpr = Math.min(window.devicePixelRatio || 1, 2);

Но проверить визуальное качество.

19. DOM

Найти все DOM операции во время playback:

textContent
innerHTML
style.left
style.top
style.width
style.height
classList
getBoundingClientRect
offsetWidth
offsetHeight

Особенно опасны операции, вызывающие layout/reflow.

Во время playback:

минимум DOM mutations

Для анимации предпочитать:

transform
opacity
20. PLAYLIST

В библиотеке много PT3-файлов.

Проверить, что используется virtualized playlist.

Нельзя создавать DOM для всех файлов одновременно.

Проверить функцию:

renderPlaylist()

Она не должна запускаться на каждый audio frame.

Playlist должен обновляться только при:

folder change
search
sort
selection

а не во время playback.

21. CSS

Проверить дорогие эффекты:

filter: blur(...)
backdrop-filter: ...
box-shadow: ...

и постоянные:

animation
transition

На мобильных можно отключить только реально дорогие декоративные эффекты.

НЕ удалять основной дизайн.

Waveform и scope должны остаться.

22. WILL-CHANGE

Не использовать:

will-change: transform;

на больших статичных Canvas без необходимости.

Также не использовать:

transform: translateZ(0);

просто как универсальную оптимизацию.

will-change оставить только для реально анимируемого playhead, если profiling показывает пользу.

23. MOBILE PERFORMANCE MODE

Добавить:

const isMobile =
    window.matchMedia('(max-width: 700px)').matches;

Можно дополнительно учитывать:

navigator.hardwareConcurrency

если доступно.

Но не делать агрессивных предположений о мощности устройства.

Например:

const performanceConfig = {
    isMobile,
    scopeFps: isMobile ? 30 : 60,
    timerFps: 10,
    playheadFps: isMobile ? 30 : 60,
    waveformFps: 0
};

Важно:

waveformFps = 0

во время playback, потому что waveform статичен.

24. ADAPTIVE FPS

После базовой оптимизации можно добавить адаптивный режим.

Например:

30 FPS
 v
20 FPS
 v
15 FPS

если main thread перегружен.

При восстановлении производительности:

15
 v
20
 v
30

Но:

AUDIO = NEVER THROTTLE

Adaptive FPS должен влиять только на визуализацию.

25. PERFORMANCE DEBUG MODE

Добавить временный debug overlay:

FPS: 29.8
RAF: 1.4 ms
Scope: 0.8 ms
Waveform: 0 ms
Messages: 21/sec
Memory: 72 MB

Нужны показатели:

FPS
main thread frame time
scope render time
waveform render time
message rate
memory

Debug UI можно выключить после тестирования.

26. MEMORY LEAKS

Особенно проверить смену треков.

При:

track A
 v
track B
 v
track C

не должны накапливаться:

RAF loops
setTimeout
event listeners
AudioNodes
AudioBuffers
Workers
scope buffers
waveform buffers

Проверить:

cancelAnimationFrame
clearTimeout
removeEventListener
disconnect
terminate

где это действительно необходимо.

Критически проверить, что при смене трека не запускается второй RAF поверх первого.

27. LONG PLAYBACK TEST

После оптимизации:

play PT3

минимум:

10 минут

Затем:

20–50 смен трека

Проверить:

audio glitches;
memory growth;
CPU;
FPS;
GC spikes;
audio drift;
накопление DOM;
накопление Worker/AudioWorklet сообщений.
28. MOBILE TESTING

Минимум проверить:

Android

Chrome Android.

Желательно:

средний Android
слабый Android
iOS

Safari iPhone.

Проверить:

play
pause
next
previous
seek
volume
mute
repeat
shuffle
scope
waveform
playlist
29. BEFORE / AFTER

До изменений снять базовые показатели.

Например:

                 BEFORE       AFTER

Mobile FPS       18           30
Main CPU         85%          42%
Scope FPS        60           30
Waveform/frame   8 ms         0 ms
Messages/sec     60           20
Memory           90 MB        70 MB
Audio glitches   YES          NO

Цифры НЕ выдумывать.

Использовать реальные значения profiling.

30. ОБЯЗАТЕЛЬНЫЕ ПРИОРИТЕТЫ
P0 — обязательно
Убрать drawWaveform() из playback RAF.
Сделать waveform static.
Сделать отдельный playhead.
Ограничить timer updates.
Ограничить scope FPS на mobile.
Убрать лишние allocations из realtime visual path.
Проверить AudioWorklet > main thread message rate.
Проверить отсутствие нескольких RAF после смены трека.
P1
Оптимизировать scope buffers.
Оптимизировать Worker messages.
Проверить Canvas DPR.
Проверить playlist virtualization.
Проверить CSS performance.
P2
Waveform downsampling.
IndexedDB waveform cache.
Adaptive FPS.
Performance debug overlay.
31. ЧТО ЗАПРЕЩЕНО МЕНЯТЬ БЕЗ ДОКАЗАННОЙ ПРИЧИНЫ

НЕ менять:

AY clock
PT3 timing
sample rate
audio buffer architecture
AY emulation algorithm
envelope behavior
tone generation
noise generation
channel mixing

НЕ:

переписывать весь AY Player;
переписывать AudioWorklet;
возвращать audio processing в main thread;
использовать ScriptProcessorNode;
ухудшать качество звука;
отключать waveform;
отключать scope;
отключать каналы;
менять дизайн;
удалять функциональность;
создавать DOM для всей библиотеки PT3;
использовать setInterval для audio timing.
32. КРИТИЧЕСКИЙ ПРИНЦИП

Главное разделение:

REALTIME AUDIO
      ?
VISUALIZATION

Audio:

AudioWorklet
realtime
high priority
не зависит от UI

Visual:

main thread
throttled
может пропустить frame
может снизить FPS

Если телефон перегружен:

scope = 20 FPS

но:

audio = unchanged
33. ОЖИДАЕМАЯ ФИНАЛЬНАЯ АРХИТЕКТУРА
                         PT3
                          ¦
                          Ў
                       Worker
                          ¦
                          Ў
                    AudioWorklet
                          ¦
                          Ў
                        AUDIO
                          ¦
                       speaker


                     TELEMETRY
                          ¦
              ------------+-----------¬
              ¦                       ¦
              Ў                       Ў
          PLAYHEAD                  SCOPE
          30–60 FPS               20–30 FPS


                        WAVEFORM
                            ¦
                            Ў
                      render once
                     per loaded track
34. ПОРЯДОК РАБОТЫ

Работай строго по этапам.

STEP 1

Исследовать код.

Не менять код.

Определить bottleneck'и.

STEP 2

Исправить waveform rendering.

STEP 3

Исправить playhead.

STEP 4

Ограничить timer.

STEP 5

Ограничить scope.

STEP 6

Оптимизировать realtime allocations.

STEP 7

Проверить AudioWorklet messages.

STEP 8

Проверить Worker messages.

STEP 9

Проверить Canvas/DPR.

STEP 10

Проверить playlist.

STEP 11

Профилирование.

STEP 12

Тест Android/iOS.

35. ПОСЛЕ КАЖДОГО ЭТАПА

Проверять:

npm/build
console errors
playback
pause
seek
next
previous
volume
scope
waveform
playlist

Не переходить к следующему этапу, если предыдущий сломал playback.

36. ФИНАЛЬНЫЙ ОТЧЁТ

После завершения предоставить:

Изменённые файлы
example:
player/ayPlayer.js
player/ayPlayer.css
player/processor.js

Только реальные файлы.

Изменения

Для каждого файла:

файл
 v
что изменено
 v
зачем
 v
какой performance bottleneck устранён
Performance

Показать:

BEFORE vs AFTER

с реальными измерениями.

Остаточные bottleneck'и

Если что-то осталось:

что
почему
насколько критично
что можно сделать дальше
37. ФИНАЛЬНОЕ ТРЕБОВАНИЕ

Не надо просто сделать:

scope = 15 FPS

и назвать это оптимизацией.

Нужно устранить архитектурные причины нагрузки.

Особенно:

? full waveform redraw every frame
? unnecessary TypedArray allocations
? excessive postMessage
? unnecessary DOM mutations
? repeated layout/reflow
? duplicate RAF loops
? unnecessary Canvas resolution
? playlist rendering during playback

Цель:

PT3 playback = realtime and stable

Waveform = static

Playhead = lightweight

Scope = throttled

Timer = throttled

Playlist = virtualized

UI = independent

Audio = independent
ГЛАВНАЯ ЦЕЛЬ ПРОЕКТА

Сделать AY Player максимально плавным на мобильных устройствах, сохранив текущий внешний вид, функциональность, PT3/AY-совместимость и качество звука.

Сначала измерить.

Потом оптимизировать.

После оптимизации снова измерить.

Не выдумывать результаты profiling.