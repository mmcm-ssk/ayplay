# AY Player — онлайн-плеер для ZX Spectrum AY-музыки

Веб-плеер (vanilla JavaScript, без сборщиков и фреймворков) для воспроизведения 8-битной музыки ZX Spectrum в форматах PT3, VT2, PSG, FYM, STC, MTC, AY, PT2, SND, ASC и др. Работает полностью в браузере: файлы загружаются через HTTP, эмуляция и синтез выполняются на клиенте (JS + Web Audio).

Адрес проекта: https://ayplay.ru/

---

## Возможности

- **Плейлист по коллекции** — треки сканируются из каталога `chiptunes/` (по подпапкам авторов), плейлист отдаётся PHP-скриптом `api/playlist.php` и кэшируется в `localStorage` на сутки.
- **Множество форматов** — PT3, VT2, PSG, FYM, STC, MTC, AY, PT2, SND, ASC, TFC (детекция и чтение — в `player/*.js`).
- **Синтез звука** — AY-8910 (эмуляция ayumi), FM-микросхема YM2203 (OPN, порт ZXTune), двойной/тройной чин (два и более AY в одной записи, MTC/STC).
- **Чанковый потоковый рендеринг** — Web Worker (`streamer.js`) рендерит дамп регистров в PCM-чанки быстрее реального времени, AudioWorklet (`player_worklet.js`) играет их без пропусков, даже когда вкладка в фоне/экрана нет.
- **Waveform-визуализация** — осциллограмма/волновая форма текущего трека, выбор позиции по клику.
- **Микшер** — громкость, фейды при переключении треков, каналы (1–12 для мультичипа), повтор (повтор трека), воспроизведение по одному и в цикле.
- **Настройки воспроизведения** — выбор частоты (clock) AY (обычно 1.77 МГц), turbo-режим, частота кадров (frame rate), эквалайзер/тональные опции.
- **Избранное и последние** — сохранение в `localStorage`.
- **Прямые ссылки** — поддержка перехода по URL к конкретному треку (`tryPlayTrackFromUrl`).
- **Экспорт** — сохранение трека в WAV (node-скрипт `player/export_wav.js`).
- **Статистика** — счётчик посещений и флаги стран по IP (`api/counter.php`, `api/flags.php`).
- **Адаптивный тёмный интерфейс** — `player/ayPlayer.css`.

---

## Структура проекта

```
D:\Project AY Player\
├── index.html                — входная точка: подключение скриптов, загрузка плейлиста, статистика
├── favicon.ico / favicon.png — иконки
├── opencode.json             — конфигурация opencode (провайдер Ollama, локальная модель)
├── chiptunes.zip             — архив коллекции (бэкап)
│
├── chiptunes\                — коллекция музыки, подпапки = авторы (Aardbei, AceMan, Agent-X, ...)
│   ├── _Demo tracks\         — демо-треки
│   ├── _mtc\                 — мультичиповые MTC-записи
│   ├── _snd music BK0011M\   — SND-файлы
│   ├── _tfc\                 — TFC-файлы
│   └── <автор>\*.stc/.pt3/... — треки
│
├── player\                   — клиентский код плеера
│   ├── ayPlayer.js           — главный модуль (UI, плейлист, загрузка, звуковой конвейер) v=262
│   ├── ayPlayer.css          — стили интерфейса
│   ├── pt3.js  vt2.js  psg.js  fym.js  stc.js  pt2.js  asc.js  tfc.js
│   │                         — ридеры/эмуляторы форматов (дампы регистров AY)
│   ├── aym_reader.js         — ридер MTC (мультичип)
│   ├── ay.js                 — ридер формата AY (включая мультичиповые AY)
│   ├── z80core.js            — эмулятор Z80 (для PT3-эмуляции)
│   ├── ayumi.js              — эмулятор AY-8910 (Peter Sovietov / A. Kovalenko)
│   ├── opn.js                — эмулятор YM2203/OPN (порт ZXTune, Shiru)
│   ├── snd2psg.js            — парсер SND → дамп PSG
│   ├── processor.js          — синтез: дамп регистров → PCM (общий для worklet и воркера)
│   ├── player_worklet.js     — AudioWorklet-проигрыватель PCM-чанков
│   ├── streamer.js           — Web Worker: чанковый рендер дампа в PCM
│   ├── export_wav.js         — node-скрипт экспорта трека в WAV
│   ├── pako_inflate.min.js   — pako 0.2.8 (распаковка zlib-данных FYM/PSG)
│   ├── snd2psg2.js, snd2psg_fixtest.js — вспомогательные/dev-версии snd2psg
│   └── ayumi.js, opn.js      — ядра эмуляции
│
├── api\                      — серверная часть (PHP)
│   ├── playlist.php          — JSON-плейлист всей коллекции (с кэшем 5 мин)
│   ├── playlist.m3u          — M3U-плейлист, генерируется скриптом
│   ├── counter.php           — счётчик посещений (IP → страна по GeoIP)
│   ├── flags.php             — отдача флагов/статистики по странам
│   ├── ayPlayer_playlist_all.cache.json — кэш плейлиста
│   └── ayPlayer_counter.json — данные счётчика
│
├── scripts\                  — утилиты генерации
│   ├── generate-m3u-playlist.js / .bat — построение api/playlist.m3u из chiptunes/
│   ├── generate-playlist.js   — построение альтернативного плейлиста (playlist_DATA.js)
│   └── add-channels-to-listxml.php — правка channel-атрибутов в списках
│
├── tools\                    — скрипты для извлечения таблиц (тон/орнаменты) из исходников
│   └── extract_pt2_tables.js / extract_pt2_tone.js / extract_pt2_tone2.js /
│       extract_tables.js / extract_tone.js
│
└── formats\                  — справочные материалы и исходники форматов
    ├── PT2.txt, st3.txt, stc.txt, STP.txt, stp_.txt, ASC.txt, AY.txt — документация форматов
    ├── Format_ZX.zip, Format_ZX_extracted\ — документация ZX-форматов
    ├── STCPLAY12.ZIP, STDocs.7z — исходники/документация STC-проигрывателя
    ├── AyEmul.src, AYMakeR src — исходники AY-инструментов
```

---

## Как это работает (архитектура звукового конвейера)

1. **Загрузка** — файл трека скачивается XHR (`loadAndPlay` → `_doLoad`), ридер формата разбирает его в **дамп регистров AY** (регистры 0–13 + таймеры, кадры).
2. **Waveform** — дамп прогоняется через синтезатор (`processor.js` на том же ядре, что и воркер) для построения визуализации.
3. **Потоковая игра** — если трек в стрим-режиме:
   - `_streamLoad` отправляет дамп в `streamer.js` (Web Worker);
   - воркер рендерит дамп в **PCM-чанки** (лево/право) через `proc.process()` (ayumi/OPN);
   - чанки передаются в `player_worklet.js` (AudioWorklet), который играет их в реальном времени;
   - каждый чанк несёт `gen` (номер поколения рендера); `_handleStreamerMessage` принимает чанки только с текущим `_streamGen`, иначе отбрасывает.
4. **Управление воспроизведением** — `togglePlay` (пауза/возобновление), `_startFade`/`_applyFadeGain` (плавные фейды при переключении), `rafLoop` (анимация waveform).
5. **Ветки переключения треков** в `loadAndPlay`:
   - `skipContext` — следующий трек уже грузится, контекст переиспользуется;
   - `reuseCtx` — контекст работает: быстрый бесшовный переход без создания нового AudioContext;
   - `newCtx` — контекста нет/закрыт: создаётся новый AudioContext + worklet + воркер.
6. **Фоновый режим** — при скрытой вкладке waveform не рисуется, но стрим продолжается (`startDumpLoad hidden path`); при возврате на вкладку — `visibilitychange` возобновляет отрисовку.

### Важное про `gen` (решение бага «тишины после паузы+вкладки»)

Счётчик `_streamGen` в главном потоке и `curGen` в воркере должны совпадать, иначе чанки отбрасываются и звук замирает. При пересоздании воркера (`newCtx`, когда AudioContext закрыт) воркер стартует с нуля, поэтому главный поток передаёт текущий `_streamGen` прямо в load-сообщение:

```js
// ayPlayer.js (main): _streamLoad
_streamer.postMessage({ type: 'load', gen: _streamGen, ... });

// streamer.js (worker): handleLoad
curGen = (typeof msg.gen === 'number') ? msg.gen : curGen + 1;
```

Версии: `ayPlayer.js` (строка `var _awVersion`) и `streamer.js` (строка `var _AWV`) должны совпадать — URL воркера привязан к `_awVersion`, иначе браузерный кэш отдаст старый `streamer.js`.

---

## Форматы

| Расширение | Название | Ридер | Примечание |
|---|---|---|---|
| `.pt3` | ProTracker 3.x | `pt3.js` | Основной формат, включает эмуляцию Z80 |
| `.vt2` | Vortex Tracker 2 | `vt2.js` | |
| `.psg` | PSG (ST-Sound) | `psg.js` | + zlib (`pako`) |
| `.fym` | FYM | `fym.js` | zlib-дамп |
| `.stc` | Sound Tracker (STC) | `stc.js` | Секции, мультичип |
| `.mtc` | MTC (мультичип) | `aym_reader.js` | Несколько AY-чипов в одном файле |
| `.ay` | AY (Z80-заголовок) | `ay.js` | Один и несколько чипов |
| `.pt2` | ProTracker 2.x | `pt2.js` | |
| `.asc` | ASC Sound Master | `asc.js` | |
| `.snd` | SND (BK0011M) | `snd2psg.js` | Конвертация в PSG |
| `.tfc` | TFC | `tfc.js` | |

Описания форматов: `formats/*.txt`, `formats/Format_ZX.zip`.

---

## Запуск и обслуживание

### Требования
- Локально: любой статический сервер (т.к. используются fetch/воркеры/`api/*.php`, нужен HTTP, не `file://`). Например: `php -S localhost:8000` или `npx serve`.
- Node.js — для генерации плейлистов и экспорта WAV.
- PHP — для `api/playlist.php`, `api/counter.php`, `api/flags.php`.

### Сборка/генерация
```bash
# пересобрать M3U-плейлист из chiptunes/
node scripts/generate-m3u-playlist.js
# или
scripts\generate-m3u-playlist.bat
```

### Экспорт трека в WAV
```bash
node player/export_wav.js <путь к треку> [выходной.wav]
```

### После изменений кода плеера
Поднять версию в трёх местах (для обхода кэша):
1. `player/ayPlayer.js` → `var _awVersion = 'YYYYMMDD'`
2. `player/streamer.js` → `var _AWV = 'YYYYMMDD'` (должна совпадать с `_awVersion`)
3. `index.html` → `<script src="player/ayPlayer.js?v=N">`

---

## Диагностика

- Консоль браузера: логи загрузки и стриминга (ветки `loadAndPlay`, `_streamLoad`).
- Проверка звука в headless-режиме: `chrome --headless=new --enable-logging=stderr` + `--dump-dom` / `--virtual-time-budget` (консольные сообщения страницы попадают в stderr с `--enable-logging=stderr`).
- Известные нюансы: в headless с `--virtual-time-budget` воркер может не отдавать чанки (ограничение виртуального времени); WebSocket через Windows PowerShell 5.1 к CDP ограничен из-за проблем с `ArraySegment<byte>`.

---

## Лицензия и контакты

- Проект использует сторонние ядра: `ayumi.js` (Peter Sovietov, Alexander Kovalenko), `opn.js` (порт ZXTune/MAME, Shiru), `pako` (zlib).
- Контакты: studio@mmcm.ru
- © 2026 AY Player
