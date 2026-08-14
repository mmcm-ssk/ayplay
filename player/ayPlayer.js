var AYPlayer = (function() {

    var _folderCloseIco = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M0%201H6L9%204H16V14H0V1Z%22%20fill%3D%22%23D4AF37%22%2F%3E%3C%2Fsvg%3E';
    var _folderOpenIco = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M0%201H5L8%203H13V5H3.7457L2.03141%2011H4.11144L5.2543%207H16L14%2014H0V1Z%22%20fill%3D%22%23D4AF37%22%2F%3E%3C%2Fsvg%3E';

    var audioContext = null;
    var _workletNode = null;
    var _gainNode = null;
    var _roomNode = null;
    var _roomGain = null;
    var song = null;
    var isTurbo = false;
    var _chipCount = 1;
    var _dumpData = null;
    var _loopFrame = 0;
    var _chipKinds = null;
    var _opnClock = 0;
    var chipMode = 0;
    var isYM = true;
    var playlist = [];
    var currentId = 0;
    var restoredCurrentFile = null;
    var _urlTrackOverride = -1;
    var playing = false;
    var repeat = false;
    var shuffle = false;
    var shuffleOrder = [];
    var shuffleId = 0;
    var timeElapsed = true;
    var trackTotalTime = '';
    var waveformData = null;
    var _waveformProgress = -1;
    var waveformCh = [];
    var waveformCache = {};
    var waveformLoadingFile = null;

    var _WAVE_DB_VER = 1;
    var _waveformDB = null;
    var _waveformDBReady = false;
    var _waveformDBFailed = false;
    var _waveformDBWaiters = [];
    function _waveformDBFlush(db) {
        var w = _waveformDBWaiters;
        _waveformDBWaiters = [];
        for (var i = 0; i < w.length; i++) {
            try { w[i](db); } catch (e) {}
        }
    }
    function _withWaveformDB(cb) {
        if (_waveformDBFailed) { cb(null); return; }
        if (_waveformDBReady && _waveformDB) { cb(_waveformDB); return; }
        _waveformDBWaiters.push(cb);
        if (_waveformDBWaiters.length === 1 && !_waveformDB && typeof indexedDB !== 'undefined' && indexedDB) {
            try {
                var req = indexedDB.open('ayp_waveforms', 1);
                req.onupgradeneeded = function(e) {
                    var db = e.target.result;
                    if (!db.objectStoreNames.contains('w')) db.createObjectStore('w');
                };
                req.onsuccess = function(e) {
                    _waveformDB = e.target.result;
                    _waveformDBReady = true;
                    _waveformDBFlush(_waveformDB);
                };
                req.onerror = function() {
                    _waveformDBFailed = true;
                    _waveformDBFlush(null);
                };
            } catch (e) {
                _waveformDBFailed = true;
                _waveformDBFlush(null);
            }
        }
    }
    function _waveKey(fn, clock, chipKinds) {
        var ck = '';
        if (chipKinds) ck = Array.isArray(chipKinds) ? chipKinds.join(',') : String(chipKinds);
        return 'w' + _WAVE_DB_VER + '|' + (fn || '') + '|' + (clock || 0) + '|' + ck;
    }
    function _getWaveformDB(key, cb) {
        _withWaveformDB(function(db) {
            if (!db) { cb(null); return; }
            try {
                var tx = db.transaction('w', 'readonly');
                var rq = tx.objectStore('w').get(key);
                rq.onsuccess = function() { cb(rq.result || null); };
                rq.onerror = function() { cb(null); };
            } catch (e) { cb(null); }
        });
    }
    function _putWaveformDB(key, rec) {
        _withWaveformDB(function(db) {
            if (!db) return;
            try {
                var tx = db.transaction('w', 'readwrite');
                tx.objectStore('w').put(rec, key);
            } catch (err) {}
        });
    }
    function _restoreWaveformDB(key, fn, cb) {
        _getWaveformDB(key, function(rec) {
            if (rec && rec.data && rec.data.length) {
                if (!(playlist[currentId] && playlist[currentId].file === fn)) { cb(false); return; }
                waveformData = rec.data;
                waveformCh = rec.channels || [];
                endFrame = rec.endFrame || 0;
                waveformCache[fn] = { data: waveformData, channels: waveformCh, endFrame: endFrame };
                drawWaveform();
                cb(true);
            } else {
                cb(false);
            }
        });
    }
    var _cachedWaveWidth = 0;
    var _cachedWaveHeight = 0;
    var _waveformContainer = null;
    var onTrackChange = null;
    var onPlayStateChange = null;
    var onTimeUpdate = null;
    var containerId = null;
    var muted = [false, false, false, false, false, false, false, false, false, false, false, false];
    var savedVol = localStorage.getItem('ayPlayer_volume');
    var volume = (savedVol !== null && !isNaN(parseFloat(savedVol))) ? parseFloat(savedVol) : 1.0;
    var favorites = JSON.parse(localStorage.getItem('ayPlayer_favorites') || '{}');
    var favoritesOnly = false;
    var firEnabled = false;
    var xfEnabled = false;
    var roomEnabled = false;
    var showFormat = true;
    var showChannels = true;
    var _notFound = {};
    var _initialView = true;
    var filterFormat = 'all';
    var chFilter = 'all';
    var alphaFilter = 'all';
    var folderAlphaFilter = 'all';
    var alphaMode = 'track';
    var searchTerm = '';

    var STATE_KEY = 'ayPlayer_state';

    function _matchesSearch(entry) {
        if (!searchTerm) return true;
        var terms = searchTerm.toLowerCase().split(/\s+/);
        var name = _trackDisplay(entry).toLowerCase();
        var author = (entry.author || '').toLowerCase();
        var file = (entry.file || '').toLowerCase();
        for (var t = 0; t < terms.length; t++) {
            var term = terms[t];
            if (!term) continue;
            if (name.indexOf(term) === -1 && author.indexOf(term) === -1 && file.indexOf(term) === -1) return false;
        }
        return true;
    }

    var _itemMeta = null;
    var _folderIds = null;
    var _folderItemCount = {};
    var _visibleCount = 0;
    var _filterVersion = 0;
    var _computedFilterVersion = -1;

    function _bumpFilterVersion() {
        _filterVersion++;
    }

    function _ensureItemMeta() {
        if (_itemMeta && _itemMeta.length === playlist.length) return;
        var arr = new Array(playlist.length);
        for (var mi = 0; mi < playlist.length; mi++) {
            var me = playlist[mi];
            var mfile = me.file || '';
            var mPt3 = /\.pt3$/i.test(mfile);
            var mVt2 = isVt2File(mfile);
            var mPsg = isPsgFile(mfile);
            var mSnd = isSndFile(mfile);
            var mStc = isStcFile(mfile);
            var mAy = isAyFile(mfile);
            var mPt2 = isPt2File(mfile);
            var mAsc = isAscFile(mfile);
            var mMtc = isMtcFile(mfile);
            var mTfc = isTfcFile(mfile);
            var mStp = isStpFile(mfile);
            var mPt1 = isPt1File(mfile);
            var mDisp = _trackDisplay(me);
            var mfc = mDisp.charAt(0).toUpperCase();
            arr[mi] = {
                fmt: mPt3 ? 'pt3' : (mVt2 ? 'vt2' : (mPsg ? 'psg' : (mSnd ? 'snd' : (mStc ? 'stc' : (mAy ? 'ay' : (mPt2 ? 'pt2' : (mAsc ? 'asc' : (mTfc ? 'tfc' : (mStp ? 'stp' : (mPt1 ? 'pt1' : (mMtc ? 'mtc' : 'fym'))))))))))),
                pt3: mPt3, vt2: mVt2, psg: mPsg, snd: mSnd, stc: mStc, ay: mAy, pt2: mPt2, asc: mAsc, mtc: mMtc, tfc: mTfc, stp: mStp, pt1: mPt1,
                alpha: (mfc >= 'A' && mfc <= 'Z') ? mfc : '0',
                dir: me.author || (function(f) { var s = f.lastIndexOf('/'); return s > 0 ? f.substring(0, s) : '/'; })(mfile),
                disp: mDisp,
                ch: me.channels || 3,
                year: me.year || '',
                section: me.section || '',
                time: me.time || ''
            };
        }
        _itemMeta = arr;
    }

    function _ensureFiltered() {
        if (_folderIds && _computedFilterVersion === _filterVersion) return;
        _computedFilterVersion = _filterVersion;
        _ensureItemMeta();
        var folders = {};
        var itemCount = {};
        var count = 0;
        var noFmt = filterFormat === 'all';
        var noAlpha = alphaFilter === 'all';
        var noCh = chFilter === 'all';
        var hasQ = searchTerm ? searchTerm.trim() !== '' : false;
        for (var fi = 0; fi < playlist.length; fi++) {
            if (favoritesOnly && !favorites[fi]) continue;
            var fm = _itemMeta[fi];
            if (!noFmt) {
                if (filterFormat === 'fym') { if (fm.fmt !== 'fym') continue; }
                else if (fm.fmt !== filterFormat) continue;
            }
            if (!noAlpha && fm.alpha !== alphaFilter) continue;
            if (!noCh && fm.ch !== parseInt(chFilter)) continue;
            if (hasQ && !_matchesSearch(playlist[fi])) continue;
            var fdir = fm.dir;
            if (!folders[fdir]) folders[fdir] = [];
            folders[fdir].push(fi);
            itemCount[fdir] = (itemCount[fdir] || 0) + 1;
            count++;
        }
        var fNames = Object.keys(folders);
        var out = {};
        for (var fi2 = 0; fi2 < fNames.length; fi2++) {
            var fd = fNames[fi2];
            var fids = folders[fd];
            if (fids.length > 1) {
                fids.sort(function(a, b) {
                    var ma = _itemMeta[a], mb = _itemMeta[b];
                    var sa = ma.section, sb = mb.section;
                    if (!sa && sb) return -1;
                    if (sa && !sb) return 1;
                    if (sa && sb) {
                        if (sa < sb) return -1;
                        if (sa > sb) return 1;
                    }
                    return a - b;
                });
            }
            out[fd] = fids;
        }
        _folderIds = out;
        _folderItemCount = itemCount;
        _visibleCount = count;
    }

    function sndGetAuthor(data) {
        try {
            var b = new Uint8Array(data);
            var bodyStart = 0o3006;
            if (b.length < bodyStart + 6) return '';
            var chainOff = b[bodyStart + 2] + b[bodyStart + 3] * 256;
            if (chainOff < 20) return '';
            var idStart = bodyStart + chainOff - 20;
            if (idStart + 20 > b.length) return '';
            var s = '';
            for (var i = idStart; i < idStart + 20; i++) {
                var c = b[i];
                if (c >= 32 && c <= 126) s += String.fromCharCode(c);
            }
            return s.trim();
        } catch(e) { return ''; }
    }

    function saveState() {
        try {
            var state = {
                filterFormat: filterFormat,
                chFilter: chFilter,
                alphaFilter: alphaFilter,
                folderAlphaFilter: folderAlphaFilter,
                shuffle: shuffle,
                repeat: repeat,
                favoritesOnly: favoritesOnly,
                firEnabled: firEnabled,
                xfEnabled: xfEnabled,
                roomEnabled: roomEnabled,
                showFormat: showFormat,
                showChannels: showChannels,
                isMono: isMono,
                chipMode: chipMode,
                isYM: isYM,
                currentId: currentId,
                playing: playing,
                clockSelect: clockSelect,
                intFreqSelect: intFreqSelect,
                waveformMode: waveformMode,
                waveformScale: waveformScale,
                scopeFps: scopeFps,
                scopeEnabled: scopeEnabled,
                currentFile: (playlist[currentId] && playlist[currentId].file) || null
            };
            localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch(e) {}
    }

    function restoreState() {
        try {
            var raw = localStorage.getItem(STATE_KEY);
            if (!raw) return;
            var state = JSON.parse(raw);
            if (state.filterFormat !== undefined) filterFormat = state.filterFormat;
            if (state.chFilter !== undefined) chFilter = state.chFilter;
            if (state.alphaFilter !== undefined) alphaFilter = state.alphaFilter;
            if (state.folderAlphaFilter !== undefined) folderAlphaFilter = state.folderAlphaFilter;
            if (state.shuffle !== undefined) shuffle = state.shuffle;
            if (state.repeat !== undefined) repeat = state.repeat;
            if (state.favoritesOnly !== undefined) favoritesOnly = state.favoritesOnly;
            _bumpFilterVersion();
            if (state.firEnabled !== undefined) firEnabled = state.firEnabled;
            if (state.xfEnabled !== undefined) xfEnabled = state.xfEnabled;
            if (state.roomEnabled !== undefined) roomEnabled = state.roomEnabled;
            if (state.showFormat !== undefined) showFormat = state.showFormat;
            if (state.showChannels !== undefined) showChannels = state.showChannels;
            if (state.isMono !== undefined) isMono = state.isMono;
            if (state.chipMode !== undefined) chipMode = state.chipMode;
            if (state.isYM !== undefined) isYM = state.isYM;
            if (state.currentId !== undefined) currentId = state.currentId;
            if (state.playing !== undefined) playing = state.playing;
            if (state.clockSelect !== undefined) clockSelect = state.clockSelect;
            if (state.intFreqSelect !== undefined) intFreqSelect = state.intFreqSelect;
            if (state.waveformMode !== undefined) waveformMode = state.waveformMode;
            if (state.waveformScale !== undefined) waveformScale = state.waveformScale;
            if (state.scopeFps !== undefined) scopeFps = state.scopeFps;
            _adaptiveFps = scopeFps;
            if (state.scopeEnabled !== undefined) scopeEnabled = state.scopeEnabled;
            if (state.currentFile !== undefined) restoredCurrentFile = String(state.currentFile).replace(/%23/g, '#');
        } catch(e) {}
    }

    function shuffleArray(a) {
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var x = a[i]; a[i] = a[j]; a[j] = x;
        }
    }

    function _getPanData() {
        var pan = [];
        var panChCount = _chipCount * 3;
        if (isMono) {
            for (var ch = 0; ch < panChCount; ch++) {
                var v = muted[ch] ? 0 : 0.55;
                pan.push({ left: v, right: v });
            }
        } else {
            var a = 0.25, b = 0.5, c = 0.75;
            var mode = chipMode % 6;
            var table = [[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]];
            for (var ch = 0; ch < panChCount; ch++) {
                if (muted[ch]) {
                    pan.push({ left: 0, right: 0 });
                } else {
                    var p = table[mode][ch % 3];
                    pan.push({ left: 1 - p, right: p });
                }
            }
        }
        return pan;
    }

    function _makeRoomIR(ctx) {
        var sr = ctx.sampleRate;
        var len = Math.floor(sr * 0.9);
        var buffer = ctx.createBuffer(2, len, sr);
        for (var ch = 0; ch < 2; ch++) {
            var data = buffer.getChannelData(ch);
            for (var i = 0; i < len; i++) {
                var env = Math.pow(1 - i / len, 2.5);
                data[i] = (Math.random() * 2 - 1) * env * 0.6;
            }
            data[Math.floor(sr * 0.011)] += 0.45;
            data[Math.floor(sr * 0.018)] += 0.32;
            data[Math.floor(sr * 0.027)] += 0.24;
            data[Math.floor(sr * 0.039)] += 0.17;
            data[Math.floor(sr * 0.053)] += 0.12;
        }
        return buffer;
    }

    function _applyRoomGain() {
        if (_roomGain && audioContext) {
            _roomGain.gain.setValueAtTime(roomEnabled ? 0.3 : 0, audioContext.currentTime);
        }
    }

    function updatePan() {
        var pan = _getPanData();
        if (_workletNode) {
            _workletNode.port.postMessage({ type: 'pan', pan: pan });
        }
        if (_streamMode) _streamReRender();
    }

    function updateState(renderer, r) {
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

    function encodePath(p) {
        return String(p).split('/').map(function(seg) { return encodeURIComponent(seg); }).join('/');
    }

    var rafId = null;
    var endCheckInterval = null;
    var wakeLockRef = null;
    var scopeBuf = [[],[],[],[],[],[],[],[],[],[],[],[]];
    var scopeMax = 64;
    var _scopeDirty = false;
    var _scopePosFrame = 0;
    var _scopePosTime = -1;
    var _scopeFade = 1.0;
    var _fadeTarget = -1;
    var _fadeStartVal = 1.0;
    var _fadeDuration = 0;
    var _fadeStartTime = 0;
    var _fadeOnDone = null;
    var _isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    var scopeFps = _isMobile ? 30 : 60;
    var _adaptiveFps = scopeFps;
    var _lastRafT = 0;
    var _lastScopeDrawT = 0;
    var ADAPTIVE_MIN = 10;
    var scopeEnabled = true;
    var _debug = /[?&]debug\b/.test(location.search) || (typeof localStorage !== 'undefined' && localStorage.getItem('ayp_debug') === '1');
    var _dbgFps = 0;
    var _dbgFpsLast = 0;
    var _dbgFrames = 0;
    var _dbgMainMs = 0;
    var _dbgScopeMs = 0;
    var _dbgWaveMs = 0;
    var _dbgMsgCount = 0;
    var _dbgMsgRate = 0;
    var _dbgMsgWindow = 0;
    var _dbgPanel = null;
    var _dbgLastUpdate = 0;
    var scopeFrame = 0;
    var _lastClockT = 0;
    var scopeColors = ['#44FF44', '#FFFF44', '#44AAFF', '#FF6644', '#CC66FF', '#44FFAA', '#FF88CC', '#88FF88', '#FFAA44', '#66FFFF', '#FF9944', '#B4FF44'];
    var trackEndedFlag = false;
    var _seekTarget = -1;
    var _seekTime = 0;

    function startEndCheck() {
        stopEndCheck();
        endCheckInterval = setInterval(function() {
            if (trackEndedFlag && !loadingNext) {
                trackEndedFlag = false;
                loadingNext = true;
                api.next();
            }
            if (!playing && endCheckInterval) {
                stopEndCheck();
            }
        }, 100);
    }

    function stopEndCheck() {
        if (endCheckInterval) {
            clearInterval(endCheckInterval);
            endCheckInterval = null;
        }
    }

    function requestWakeLock() {
        if (!navigator.wakeLock || wakeLockRef) return;
        navigator.wakeLock.request('screen').then(function(wl) {
            wakeLockRef = wl;
            wl.addEventListener('release', function() {
                wakeLockRef = null;
            });
        }).catch(function() {});
    }

    function releaseWakeLock() {
        if (wakeLockRef) {
            wakeLockRef.release().catch(function() {});
            wakeLockRef = null;
        }
    }
    var playlistRenderPending = false;

    var scopeCtx = [null, null, null, null, null, null, null, null, null, null, null, null];
    var endFrame = 0;
    var pt3FrameCount = 0;
    var loadingNext = false;
    var playFrame = 0;

    var _streamer = null;
    var _streamMode = false;
    var _streamGen = 0;
    var _streamerDumpRef = null;
    var _waveWorker = null;
    var _waveGen = 0;
    var _streamRenderDone = false;
    var _streamEndFrame = 0;
    var _streamInQueue = 0;
    var _streamMaxChunks = 4;
    var _streamUnderflowShown = false;
    var _streamChunkCount = 0;
    var _chunkQueue = [];
    var _renderSR = 48000;
    var _renderFrameRate = 50;
    var _renderChunkSeconds = 5;
    var _renderFirstChunkSeconds = 2;

    var _SILENCE_SKIP_MS = 5000;
    var _SILENCE_PEAK = 0.002;
    var _silenceRunMs = 0;
    var _silenceLastCheck = -1;
    var _silenceHeard = false;
    var _silenceSkipDone = false;

    var soloedIdx = -1;
    var isMono = false;
    var waveformMode = 'channels'; // 'channels' or 'mix'
    var waveformScale = 1.5;
    var clockSelect = 0; // 0=auto, 1773400=ZX Spectrum, 1750000=Pentagon, 2000000=Atari ST, 1000000=Amstrad CPC
    var intFreqSelect = 0; // 0=auto, 50=ZX Spectrum, 48.828=Pentagon 128k
    var _autoIntFreq = false; // true = frame rate chosen automatically from track name

    function _syncIntFreqUI() {
        var btns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-int]');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('active', parseFloat(btns[i].dataset.int) === intFreqSelect);
        }
        var input = document.getElementById(containerId + '_intInput');
        if (input) input.value = intFreqSelect ? String(intFreqSelect) : '';
    }

    function _trackDisplay(entry) {
        var s = (entry && (entry.title || entry.name)) || '';
        if (s) return s.replace(/%20/g, ' ');
        var f = (entry && entry.file) || '';
        f = f.replace(/%20/g, ' ');
        var i = f.lastIndexOf('/');
        if (i >= 0) f = f.substring(i + 1);
        return f.replace(/\.(fym|pt3|vt2|psg|stc|ay|pt2|pt1|snd|asc|mtc|tfc|stp)$/i, '');
    }

    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        var bar = document.getElementById(containerId + '_searchBar');
        if (bar && bar.offsetParent !== null) return;
        var key = e.key;
        if (key.length === 1 && key.match(/[a-zA-Zа-яА-Я0-9]/)) {
            e.preventDefault();
            AYPlayer.toggleSearch();
            var input = document.getElementById(containerId + '_searchInput');
            if (input) {
                input.value = key;
                AYPlayer.onSearchInput(key);
            }
        }
    });

    function initScope() {
        for (var ch = 0; ch < 12; ch++) scopeBuf[ch] = [];
        for (var ch = 0; ch < 12; ch++) {
            var c = document.getElementById(containerId + '_scope' + ch);
            if (c) {
                scopeCtx[ch] = sizeScopeCanvas(ch);
                c.style.cursor = 'pointer';
                c.addEventListener('click', (function(idx) {
                    return function(e) {
                        if (idx >= _chipCount * 3) return;
                        muted[idx] = !muted[idx];
                        soloedIdx = -1;
                        updatePan();
                        drawScope();
                    };
                })(ch));
                c.addEventListener('contextmenu', (function(idx) {
                    return function(e) {
                        e.preventDefault();
                        if (idx >= _chipCount * 3) return;
                        if (soloedIdx === idx) {
                            for (var i = 0; i < _chipCount * 3; i++) muted[i] = false;
                            soloedIdx = -1;
                        } else {
                            for (var i = 0; i < _chipCount * 3; i++) muted[i] = (i !== idx);
                            soloedIdx = idx;
                        }
                        updatePan();
                        drawScope();
                    };
                })(ch));
            }
        }
    }



    function sizeScopeCanvas(ch) {
        return AYScopeUI.sizeCanvas(containerId, ch);
    }

    function resizeScope() {
        AYScopeUI.resize(containerId, scopeCtx, function() {
            if (!document.hidden) drawScope();
        });
    }

    function isTrackVisible(id) {
        var entry = playlist[id];
        if (!entry) return false;
        if (filterFormat !== 'all') {
            var pt3 = /\.pt3$/i.test(entry.file);
            var vt2 = isVt2File(entry.file);
            var psg = isPsgFile(entry.file);
            var snd = isSndFile(entry.file);
            var stc = isStcFile(entry.file);
            var ay = isAyFile(entry.file);
            var pt2 = isPt2File(entry.file);
            var asc = isAscFile(entry.file);
            var mtc = isMtcFile(entry.file);
            var tfc = isTfcFile(entry.file);
            var stp = isStpFile(entry.file);
            var pt1 = isPt1File(entry.file);
            if (filterFormat === 'fym' && (pt3 || vt2 || psg || snd || stc || ay || pt2 || asc || mtc || tfc || stp || pt1)) return false;
            if (filterFormat === 'pt3' && !pt3) return false;
            if (filterFormat === 'vt2' && !vt2) return false;
            if (filterFormat === 'psg' && !psg) return false;
            if (filterFormat === 'stc' && !stc) return false;
            if (filterFormat === 'ay' && !ay) return false;
            if (filterFormat === 'pt2' && !pt2) return false;
            if (filterFormat === 'snd' && !snd) return false;
            if (filterFormat === 'asc' && !asc) return false;
            if (filterFormat === 'mtc' && !mtc) return false;
            if (filterFormat === 'tfc' && !tfc) return false;
            if (filterFormat === 'stp' && !stp) return false;
            if (filterFormat === 'pt1' && !pt1) return false;
        }
        if (chFilter !== 'all' && (entry.channels || 3) !== parseInt(chFilter)) return false;
        if (alphaFilter !== 'all') {
            var display = _trackDisplay(entry);
            var fc = display.charAt(0).toUpperCase();
            var alpha = (fc >= 'A' && fc <= 'Z') ? fc : '0';
            if (alpha !== alphaFilter) return false;
        }
        if (!_matchesSearch(entry)) return false;
        return true;
    }

    function resetScope() {
        AYScopeUI.reset(scopeBuf);
    }

    var _lastTimeText = '';
    var _waveformLastK = -1;
    var _waveformRendered = false;
    function _updatePlayhead(frac) {
        AYWaveformUI.updatePlayhead({ containerId: containerId, hasData: !!waveformData, cachedWidth: _cachedWaveWidth }, frac);
    }

    function updatePlayhead() {
        if (!song) return;
        var fc = pt3FrameCount || song.getFrameCount();
        var progress = fc > 0 ? playFrame / fc : 0;
        if (progress > 1) progress = 1;
        var k = Math.round(progress * 10000) * 0.01;
        if (waveformData && k !== _waveformLastK) {
            _waveformLastK = k;
            _updatePlayhead(k / 100);
        }
    }

    function updateClock() {
        if (!song) return;
        var time = document.getElementById(containerId + '_trackTime');
        var timeM = document.getElementById(containerId + '_trackTimeM');
        if (time || timeM) {
            var txt = getTimeDisplay();
            if (txt !== _lastTimeText) {
                _lastTimeText = txt;
                if (time) time.textContent = txt;
                if (timeM) timeM.textContent = txt;
            }
        }
        if (onTimeUpdate) onTimeUpdate(getTimeDisplay());
    }

    function updateProgress() {
        if (!song || document.hidden) return;
        updatePlayhead();
        updateClock();
    }

    function drawWave(ctx, data, w, h, mid, color, invert, half) {
        AYWaveformUI.drawWave(ctx, data, w, h, mid, color, invert, half);
    }

    var scopeLabels = ['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3', 'A4', 'B4', 'C4'];

    function drawScope() {
        AYScopeUI.draw(scopeCtx, scopeBuf, {
            muted: muted,
            chipCount: _chipCount,
            chipKinds: _chipKinds,
            colors: scopeColors,
            labels: scopeLabels,
            fade: _scopeFade
        });
    }

    function rafLoop() {
        if (document.hidden) { rafId = null; resetScope(); return; }
        var _loopStart = performance.now();
        var now = _loopStart;
        if (_lastRafT > 0) {
            var _adt = now - _lastRafT;
            if (_adt > 0) {
                var _tInt = 1000 / _adaptiveFps;
                if (_adt > _tInt * 1.4 && _adaptiveFps > ADAPTIVE_MIN) {
                    _adaptiveFps = Math.max(ADAPTIVE_MIN, _adaptiveFps - 5);
                    if (_workletNode && _workletNode.port) _workletNode.port.postMessage({ type: 'fps', fps: _adaptiveFps });
                } else if (_adt < _tInt * 0.65 && _adaptiveFps < scopeFps) {
                    _adaptiveFps = Math.min(scopeFps, _adaptiveFps + 5);
                    if (_workletNode && _workletNode.port) _workletNode.port.postMessage({ type: 'fps', fps: _adaptiveFps });
                }
            }
        }
        _lastRafT = now;
        if (_fadeTarget >= 0) {
            var elapsed = now - _fadeStartTime;
            var t = _fadeDuration > 0 ? Math.min(1, elapsed / _fadeDuration) : 1;
            _scopeFade = _fadeStartVal + (_fadeTarget - _fadeStartVal) * t;
            _applyFadeGain();
            drawScope();
            if (t >= 1) {
                _scopeFade = _fadeTarget;
                _applyFadeGain();
                drawScope();
                _fadeTarget = -1;
                var cb = _fadeOnDone;
                _fadeOnDone = null;
                if (cb) cb();
            }
        }
        updatePlayhead();
        if (now - _lastClockT > 100) {
            _lastClockT = now;
            updateClock();
        }
        scopeFrame++;
        var doScopeFrame = (now - _lastScopeDrawT) >= (1000 / _adaptiveFps) - 1;
        if (doScopeFrame && _streamMode && playing && _scopePosTime >= 0 && _seekTarget < 0) {
            var _curF = _wrapStreamFrame(_scopePosFrame + (performance.now() - _scopePosTime) / 1000 * (_renderFrameRate || 50));
            _paceScope(_curF);
        }
        if (_scopeDirty && doScopeFrame && (scopeEnabled || !_isMobile)) {
            var _sd0 = performance.now();
            drawScope(); _scopeDirty = false;
            _lastScopeDrawT = performance.now();
            if (_debug) _dbgScopeMs = _dbgScopeMs * 0.8 + (performance.now() - _sd0) * 0.2;
        }
        if (playing || _fadeTarget >= 0) rafId = requestAnimationFrame(rafLoop);
        if (_debug) _updateDebug(_loopStart, now);
    }

    function _updateDebug(startT, endT) {
        var now = performance.now();
        _dbgFrames++;
        _dbgMainMs = _dbgMainMs * 0.9 + (now - startT) * 0.1;
        if (now - _dbgFpsLast >= 500) {
            _dbgFps = Math.round(_dbgFrames * 1000 / (now - _dbgFpsLast));
            _dbgFrames = 0;
            _dbgFpsLast = now;
        }
        if (now - _dbgMsgWindow >= 1000) {
            _dbgMsgRate = _dbgMsgCount;
            _dbgMsgCount = 0;
            _dbgMsgWindow = now;
        }
        if (now - _dbgLastUpdate >= 250) {
            _dbgLastUpdate = now;
            if (!_dbgPanel) _initDebugPanel();
            var mem = (typeof performance !== 'undefined' && performance.memory) ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' MB' : 'n/a';
            _dbgPanel.textContent =
                'FPS ' + _dbgFps +
                '  afps ' + _adaptiveFps +
                '  main ' + _dbgMainMs.toFixed(2) + ' ms' +
                '  scope ' + _dbgScopeMs.toFixed(2) + ' ms' +
                '  wave ' + _dbgWaveMs.toFixed(1) + ' ms' +
                '  msg/s ' + _dbgMsgRate +
                '  mem ' + mem;
        }
    }

    function _initDebugPanel() {
        var p = document.createElement('div');
        p.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:99999;background:rgba(0,0,0,.75);color:#0f0;' +
            'font:11px/1.3 monospace;padding:4px 6px;border-radius:4px;pointer-events:none;white-space:nowrap;';
        document.body.appendChild(p);
        _dbgPanel = p;
    }

    function handleWorkletMessage(e) {
        var msg = e.data;
        if (_debug) _dbgMsgCount++;
        if (_streamMode) {
            if (msg.type === 'pos') {
                var frame = _wrapStreamFrame(msg.frame);
                if (_seekTarget >= 0) {
                    if (frame >= _seekTarget) _seekTarget = -1;
                    else if (performance.now() - _seekTime > 2000) _seekTarget = -1;
                }
                if (_seekTarget < 0) {
                    if (isFinite(frame)) playFrame = frame;
                    _scopePosFrame = frame;
                    _scopePosTime = performance.now();
                    _paceScope(frame);
                    _checkStreamEnd(frame);
                    _checkSilenceSkip(frame);
                }
            } else if (msg.type === 'underflow') {
                if (!_streamUnderflowShown) {
                    _streamUnderflowShown = true;
                    showToast('Буферизация\u2026');
                }
            } else if (msg.type === 'ended') {
                if (!repeat && !loadingNext) {
                    loadingNext = true;
                    trackEndedFlag = false;
                    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
                    api.next();
                }
            } else if (msg.type === 'chunkConsumed') {
                _streamInQueue--;
                if (_streamInQueue < 0) _streamInQueue = 0;
                _streamGo();
            }
            return;
        }
        if (msg.type === 'scope') {
            var data = new Float32Array(msg.data);
            var chCount = _chipCount * 3;
            var count = data.length / chCount;
            if (count !== (count | 0) || count < 1) return;
            for (var ch = 0; ch < chCount; ch++) {
                var buf = scopeBuf[ch];
                buf.length = count;
                for (var j = 0; j < count; j++) {
                    buf[j] = data[j * chCount + ch];
                }
            }
            _scopeDirty = true;
            if (_seekTarget >= 0) {
                if (msg.pos >= _seekTarget) _seekTarget = -1;
                else if (performance.now() - _seekTime > 2000) _seekTarget = -1;
                // else ignore stale pre-seek scope messages
            }
            if (_seekTarget < 0) playFrame = msg.pos;
        } else if (msg.type === 'finished') {
            if (!repeat && !loadingNext) {
                loadingNext = true;
                trackEndedFlag = false;
                if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
                api.next();
            }
        } else if (msg.type === 'loaded') {
            loadingNext = false;
        } else if (msg.type === 'cpu') {
            var cpuEl = document.getElementById(containerId + '_playlistLoad');
            if (cpuEl) cpuEl.textContent = msg.load + '%';
        } else if (msg.type === 'loadTimer') {
            console.log('Load timer: perf=' + msg.usePerf + ' date=' + msg.useDate);
        }
    }

    function isVt2File(file) { return /\.vt2$/i.test(file); }
    function isPsgFile(file) { return /\.psg$/i.test(file); }
    function isSndFile(file) { return /\.snd$/i.test(file); }
    function isStcFile(file) { return /\.stc$/i.test(file); }
    function isAyFile(file) { return /\.ay$/i.test(file); }
    function isPt2File(file) { return /\.pt2$/i.test(file); }
    function isAscFile(file) { return /\.asc$/i.test(file); }
    function isMtcFile(file) { return /\.mtc$/i.test(file); }
    function isTfcFile(file) { return /\.tfc$/i.test(file); }
    function isStpFile(file) { return /\.stp$/i.test(file); }
    function isPt1File(file) { return /\.pt1$/i.test(file); }

    function updateFilterDisplay() {
        var el = document.getElementById(containerId + '_playlistItems');
        if (!el) return;

        // count visible items
        var visibleCount = 0;
        for (var ci = 0; ci < playlist.length; ci++) {
            if (favoritesOnly && !favorites[ci]) continue;
            if (filterFormat !== 'all') {
                var pt3 = /\.pt3$/i.test(playlist[ci].file);
                var vt2 = isVt2File(playlist[ci].file);
                var psg = isPsgFile(playlist[ci].file);
                var snd = isSndFile(playlist[ci].file);
                var stc = isStcFile(playlist[ci].file);
                var ay = isAyFile(playlist[ci].file);
                var pt2 = isPt2File(playlist[ci].file);
                var asc = isAscFile(playlist[ci].file);
                var mtc = isMtcFile(playlist[ci].file);
                var tfc = isTfcFile(playlist[ci].file);
                var stp = isStpFile(playlist[ci].file);
                var pt1 = isPt1File(playlist[ci].file);
                if (filterFormat === 'fym' && (pt3 || vt2 || psg || snd || stc || ay || pt2 || asc || mtc || tfc || stp || pt1)) continue;
                if (filterFormat === 'pt3' && !pt3) continue;
                if (filterFormat === 'vt2' && !vt2) continue;
                if (filterFormat === 'psg' && !psg) continue;
                if (filterFormat === 'stc' && !stc) continue;
                if (filterFormat === 'ay' && !ay) continue;
                if (filterFormat === 'pt2' && !pt2) continue;
                if (filterFormat === 'snd' && !snd) continue;
                if (filterFormat === 'asc' && !asc) continue;
                if (filterFormat === 'mtc' && !mtc) continue;
                if (filterFormat === 'tfc' && !tfc) continue;
                if (filterFormat === 'stp' && !stp) continue;
                if (filterFormat === 'pt1' && !pt1) continue;
            }
            if (chFilter !== 'all' && (playlist[ci].channels || 3) !== parseInt(chFilter)) continue;
            if (alphaFilter !== 'all') {
                var display = _trackDisplay(playlist[ci]);
                var fc = display.charAt(0).toUpperCase();
                var alpha = (fc >= 'A' && fc <= 'Z') ? fc : '0';
                if (alpha !== alphaFilter) continue;
            }
            if (!_matchesSearch(playlist[ci])) continue;
            visibleCount++;
        }
        var count = document.getElementById(containerId + '_playlistCount');
        if (count) count.textContent = visibleCount;

        var indicator = document.getElementById(containerId + '_filterIndicator');
        if (indicator) {
            var parts = [];
            if (folderAlphaFilter !== 'all') parts.push('Folder: ' + folderAlphaFilter);
            if (alphaFilter !== 'all') parts.push('Track: ' + alphaFilter);
            indicator.textContent = parts.join(', ');
        }

        var display = document.getElementById(containerId + '_filterDisplay');
        if (display) {
            var mod = filterFormat === 'all' ? '-' : filterFormat.toUpperCase();
            var ch = chFilter === 'all' ? '-' : chFilter + 'ch';
            var fol = folderAlphaFilter === 'all' ? '-' : (folderAlphaFilter === '0' ? '#' : folderAlphaFilter);
            var trk = alphaFilter === 'all' ? '-' : (alphaFilter === '0' ? '#' : alphaFilter);
            display.innerHTML = '<span class="ayPlayer-filter-display-val' + (filterFormat !== 'all' ? ' active' : '') + '">' + mod + '</span>&nbsp;&nbsp;<span class="ayPlayer-filter-display-val' + (chFilter !== 'all' ? ' active' : '') + '">' + ch + '</span>';
        }

        // toggle filter btn states
        var filterBtns = document.querySelectorAll('#' + containerId + '_playlist .ayPlayer-filter-btn');
        for (var fb = 0; fb < filterBtns.length; fb++) {
            var btn = filterBtns[fb];
            if (btn.dataset.filter === filterFormat) btn.classList.add('active');
            else btn.classList.remove('active');
        }

        // toggle alpha btn states
        var alphaBtns = document.querySelectorAll('#' + containerId + '_playlist .ayPlayer-alpha-btn');
        for (var ab = 0; ab < alphaBtns.length; ab++) {
            var abtn = alphaBtns[ab];
            if (abtn.dataset.alpha === alphaFilter) abtn.classList.add('active');
            else abtn.classList.remove('active');
        }

        el.className = 'ayPlayer-playlist-items filter-' + filterFormat + ' ch-' + chFilter + ' alpha-' + alphaFilter + (favoritesOnly ? ' fav-only' : '');

        // count visible items per folder from playlist data (not DOM, which only has viewport subset)
        var folderCounts = {};
        for (var ci = 0; ci < playlist.length; ci++) {
            if (favoritesOnly && !favorites[ci]) continue;
                var pt3 = /\.pt3$/i.test(playlist[ci].file);
                var vt2 = isVt2File(playlist[ci].file);
                var psg = isPsgFile(playlist[ci].file);
                var snd = isSndFile(playlist[ci].file);
                var stc = isStcFile(playlist[ci].file);
                var ay = isAyFile(playlist[ci].file);
                var pt2 = isPt2File(playlist[ci].file);
                var asc = isAscFile(playlist[ci].file);
                var mtc = isMtcFile(playlist[ci].file);
                var tfc = isTfcFile(playlist[ci].file);
                var stp = isStpFile(playlist[ci].file);
                var pt1 = isPt1File(playlist[ci].file);
                if (filterFormat === 'fym' && (pt3 || vt2 || psg || snd || stc || ay || pt2 || asc || mtc || tfc || stp || pt1)) continue;
                if (filterFormat === 'pt3' && !pt3) continue;
                if (filterFormat === 'vt2' && !vt2) continue;
                if (filterFormat === 'psg' && !psg) continue;
                if (filterFormat === 'stc' && !stc) continue;
                if (filterFormat === 'ay' && !ay) continue;
                if (filterFormat === 'pt2' && !pt2) continue;
                if (filterFormat === 'snd' && !snd) continue;
                if (filterFormat === 'asc' && !asc) continue;
                if (filterFormat === 'mtc' && !mtc) continue;
                if (filterFormat === 'tfc' && !tfc) continue;
                if (filterFormat === 'stp' && !stp) continue;
                if (filterFormat === 'pt1' && !pt1) continue;
            if (chFilter !== 'all' && (playlist[ci].channels || 3) !== parseInt(chFilter)) continue;
            if (alphaFilter !== 'all') {
                var display = _trackDisplay(playlist[ci]);
                var fc = display.charAt(0).toUpperCase();
                var alpha = (fc >= 'A' && fc <= 'Z') ? fc : '0';
                if (alpha !== alphaFilter) continue;
            }
            if (!_matchesSearch(playlist[ci])) continue;
            var cDir = playlist[ci].author || (function(f) { var s = f.lastIndexOf('/'); return s > 0 ? f.substring(0, s) : '/'; })(playlist[ci].file);
            folderCounts[cDir] = (folderCounts[cDir] || 0) + 1;
        }
        var folders = el.querySelectorAll('.ayPlayer-playlist-folder');
        var anyVisible = false;
        for (var f = 0; f < folders.length; f++) {
            var fDir = folders[f].getAttribute('data-dir') || '';
            var fCount = folderCounts[fDir] || 0;
            folders[f].style.display = fCount > 0 ? '' : 'none';
            if (fCount > 0) anyVisible = true;
        }

        var emptyMsg = el.querySelector('.ayPlayer-playlist-empty');
        if (!anyVisible) {
            if (!emptyMsg) {
                var msg = document.createElement('div');
                msg.className = 'ayPlayer-playlist-empty';
                msg.textContent = favoritesOnly ? 'No favorite tracks' : 'No tracks match the filter';
                el.appendChild(msg);
            }
        } else if (emptyMsg) {
            emptyMsg.remove();
        }
    }

    function showToast(msg) {
        var el = document.getElementById(containerId + '_toast');
        if (!el) {
            el = document.createElement('div');
            el.id = containerId + '_toast';
            el.className = 'ayPlayer-toast';
            var root = document.getElementById(containerId + '_playlist');
            if (root) root.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add('active');
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(function() { el.classList.remove('active'); }, 2000);
    }

    function renderPlaylist(forceRebuild) {
        var el = document.getElementById(containerId + '_playlistItems');
        if (!el) return;

        // update visible count
        _ensureFiltered();
        var visibleCount = _visibleCount;
        var folderItemCount = _folderItemCount;
        var count = document.getElementById(containerId + '_playlistCount');
        if (count) count.textContent = visibleCount;

        var indicator = document.getElementById(containerId + '_filterIndicator');
        if (indicator) {
            var parts = [];
            if (folderAlphaFilter !== 'all') parts.push('Folder: ' + folderAlphaFilter);
            if (alphaFilter !== 'all') parts.push('Track: ' + alphaFilter);
            indicator.textContent = parts.join(', ');
        }

        var display = document.getElementById(containerId + '_filterDisplay');
        if (display) {
            var mod = filterFormat === 'all' ? '-' : filterFormat.toUpperCase();
            var ch = chFilter === 'all' ? '-' : chFilter + 'ch';
            var fol = folderAlphaFilter === 'all' ? '-' : (folderAlphaFilter === '0' ? '#' : folderAlphaFilter);
            var trk = alphaFilter === 'all' ? '-' : (alphaFilter === '0' ? '#' : alphaFilter);
            display.innerHTML = '<span class="ayPlayer-filter-display-val' + (filterFormat !== 'all' ? ' active' : '') + '">' + mod + '</span>&nbsp;&nbsp;<span class="ayPlayer-filter-display-val' + (chFilter !== 'all' ? ' active' : '') + '">' + ch + '</span>';
        }

        // toggle filter btn states
        var filterBtns = document.querySelectorAll('#' + containerId + '_playlist .ayPlayer-filter-btn');
        for (var fb = 0; fb < filterBtns.length; fb++) {
            var btn = filterBtns[fb];
            if (btn.dataset.filter === filterFormat) btn.classList.add('active');
            else btn.classList.remove('active');
        }

        // toggle alpha btn states
        var alphaBtns = document.querySelectorAll('#' + containerId + '_playlist .ayPlayer-alpha-btn');
        for (var ab = 0; ab < alphaBtns.length; ab++) {
            var abtn = alphaBtns[ab];
            if (abtn.dataset.alpha === alphaFilter) abtn.classList.add('active');
            else abtn.classList.remove('active');
        }

        // --- fast path: CSS handles format/alpha/ch/fav filtering, JS only updates state ---
        var hasItems = forceRebuild ? false : el.querySelectorAll('.ayPlayer-playlist-item').length > 0;
        if (hasItems) {
            el.className = 'ayPlayer-playlist-items filter-' + filterFormat + ' ch-' + chFilter + ' alpha-' + alphaFilter + (favoritesOnly ? ' fav-only' : '');
            if (typeof _lastActiveId === 'undefined') _lastActiveId = null;
            var prevActive = el.querySelector('.ayPlayer-playlist-item.active');
            if (prevActive) {
                prevActive.classList.remove('active');
                if (playlist[currentId] && playlist[currentId].channels) {
                    var chEl = prevActive.querySelector('.ayPlayer-playlist-ch');
                    if (chEl) { chEl.textContent = playlist[currentId].channels + 'ch'; chEl.className = 'ayPlayer-playlist-format ayPlayer-playlist-ch ayPlayer-ch-' + playlist[currentId].channels; }
                }
            }
            if (currentId >= 0) {
                var nfItem = el.querySelector('.ayPlayer-playlist-item[data-id="' + currentId + '"]');
                if (nfItem) nfItem.classList.toggle('not-found', !!_notFound[currentId]);
            }
            if (playing && currentId >= 0) {
                var newActive = el.querySelector('.ayPlayer-playlist-item[data-id="' + currentId + '"]');
                if (newActive) {
                    newActive.classList.add('active');
                    newActive.classList.remove('not-found');
                    if (playlist[currentId] && playlist[currentId].channels) {
                        var chEl2 = newActive.querySelector('.ayPlayer-playlist-ch');
                        if (chEl2 && chEl2.textContent !== playlist[currentId].channels + 'ch') {
                            chEl2.textContent = playlist[currentId].channels + 'ch';
                            chEl2.className = 'ayPlayer-playlist-format ayPlayer-playlist-ch ayPlayer-ch-' + playlist[currentId].channels;
                        }
                    }
                }
            }
            updateSepHighlight(el);
            _lastActiveId = (playing && currentId >= 0) ? currentId : _lastActiveId;
            var anyVisible = false;
            var folders = el.querySelectorAll('.ayPlayer-playlist-folder');
            for (var f = 0; f < folders.length; f++) {
                var fDir = folders[f].getAttribute('data-dir') || '';
                if (folderAlphaFilter !== 'all') {
                    var displayDir = fDir === '/' ? 'chiptunes' : fDir.replace(/^chiptunes\//, '');
                    var fc = displayDir.charAt(0).toUpperCase();
                    var fa = (fc >= 'A' && fc <= 'Z') ? fc : '0';
                    if (fa !== folderAlphaFilter) {
                        folders[f].style.display = 'none';
                        continue;
                    }
                }
                var fCount = folderItemCount[fDir] || 0;
                var fCountEl = folders[f].querySelector('.ayPlayer-playlist-folder-count');
                if (fCountEl) fCountEl.textContent = '(' + fCount + ')';
                var fItems = folders[f].querySelector('.ayPlayer-playlist-folder-items');
                if (!fItems || fItems.style.display !== 'block') {
                    folders[f].style.display = fCount > 0 ? '' : 'none';
                    if (fCount > 0) anyVisible = true;
                    continue;
                }
                folders[f].style.display = fCount > 0 ? '' : 'none';
                if (fCount > 0) anyVisible = true;
            }
            var emptyMsg = el.querySelector('.ayPlayer-playlist-empty');
            if (!anyVisible) {
                if (!emptyMsg) {
                    var msg = document.createElement('div');
                    msg.className = 'ayPlayer-playlist-empty';
                    msg.textContent = favoritesOnly ? 'No favorite tracks' : 'No tracks match the filter';
                    el.appendChild(msg);
                }
            } else if (emptyMsg) {
                emptyMsg.remove();
            }
            return;
        }

        // --- full rebuild (cache HTML, inject on folder open) ---
        var openDirs = {};
        var existingFolders = el.querySelectorAll('.ayPlayer-playlist-folder');
        for (var fd = 0; fd < existingFolders.length; fd++) {
            var fdItems = existingFolders[fd].querySelector('.ayPlayer-playlist-folder-items');
            if (fdItems && fdItems.style.display === 'block') {
                openDirs[existingFolders[fd].getAttribute('data-dir')] = true;
            }
        }

        var folders = _folderIds;
        _folderSlots = {};
        _folderSlotTops = {};
        _folderTotalHeight = {};
        _folderChunks = {};
        _folderFullyLoaded = {};
        _folderLoadingDir = null;
        if (_folderRAF) { cancelAnimationFrame(_folderRAF); _folderRAF = null; }
        var scrollPos = el.scrollTop;
        var html = '';
        var anyVisible = false;
        var dirNames = Object.keys(folders).sort(function(a, b) {
            var ua = a.charAt(0) === '_' ? 0 : 1;
            var ub = b.charAt(0) === '_' ? 0 : 1;
            if (ua !== ub) return ua - ub;
            var la = a.toLowerCase(), lb = b.toLowerCase();
            if (la < lb) return -1;
            if (la > lb) return 1;
            return a < b ? -1 : (a > b ? 1 : 0);
        });
        for (var di = 0; di < dirNames.length; di++) {
            var dir = dirNames[di];
            var ids = folders[dir];
            if (ids.length === 0) continue;
            ids.sort(function(a, b) {
                var sa = playlist[a].section || '';
                var sb = playlist[b].section || '';
                if (!sa && sb) return -1;
                if (sa && !sb) return 1;
                if (sa && sb) {
                    if (sa < sb) return -1;
                    if (sa > sb) return 1;
                }
                return a - b;
            });
            var displayDir = dir === '/' ? 'chiptunes' : dir.replace(/^chiptunes\//, '');
            var isOpen = !!openDirs[dir];
            var filteredIds = ids;
            var fCount = folderItemCount[dir] || 0;
            var folderHidden = fCount === 0;
            if (!folderHidden && folderAlphaFilter !== 'all') {
                var faFc = displayDir.charAt(0).toUpperCase();
                var fa = (faFc >= 'A' && faFc <= 'Z') ? faFc : '0';
                if (fa !== folderAlphaFilter) folderHidden = true;
            }
            var slots = buildFolderSlots(filteredIds);
            _folderSlots[dir] = slots;
            var tops = [], totalH = 0;
            for (var si = 0; si < slots.length; si++) {
                tops[si] = totalH;
                totalH += slots[si].h;
            }
            _folderSlotTops[dir] = tops;
            _folderTotalHeight[dir] = totalH;
            if (!folderHidden) anyVisible = true;
            html += '<div class="ayPlayer-playlist-folder"' +
                ' data-dir="' + dir.replace(/"/g, '&quot;') + '"' +
                (folderHidden ? ' style="display:none"' : '') + '>' +
                '<div class="ayPlayer-playlist-folder-header" onclick="AYPlayer.toggleFolder(this)">' +
                '<span class="ayPlayer-playlist-folder-arrow' + (isOpen ? ' open' : '') + '">' +
                '<img class="ayPlayer-playlist-folder-ico ayPlayer-playlist-folder-close-ico" src="' + _folderCloseIco + '" alt="">' +
                '<img class="ayPlayer-playlist-folder-ico ayPlayer-playlist-folder-open-ico" src="' + _folderOpenIco + '" alt="">' +
                '</span> ' +
                displayDir + ' <span class="ayPlayer-playlist-folder-count">(' + fCount + ')</span>' +
                '</div>' +
                '<div class="ayPlayer-playlist-folder-items"' + (isOpen ? ' style="display:block"' : ' style="display:none"') + '"></div></div>';
        }

        el.innerHTML = html;
        el.style.display = '';
        el.className = 'ayPlayer-playlist-items filter-' + filterFormat + ' ch-' + chFilter + ' alpha-' + alphaFilter + (favoritesOnly ? ' fav-only' : '');
        el.scrollTop = scrollPos;

        var emptyMsg = el.querySelector('.ayPlayer-playlist-empty');
        if (!anyVisible) {
            if (!emptyMsg) {
                var msg = document.createElement('div');
                msg.className = 'ayPlayer-playlist-empty';
                msg.textContent = favoritesOnly ? 'No favorite tracks' : 'No tracks match the filter';
                el.appendChild(msg);
            }
        } else if (emptyMsg) {
            emptyMsg.remove();
        }

        if (_initialView) {
            el.scrollTop = 0;
        } else {
            var currentDir = '';
            if (playlist && currentId >= 0 && currentId < playlist.length) {
                currentDir = playlist[currentId].author || (function(f) { var s = f.lastIndexOf('/'); return s > 0 ? f.substring(0, s) : '/'; })(playlist[currentId].file);
            }
            var folderEls = el.querySelectorAll('.ayPlayer-playlist-folder');
            for (var fe = 0; fe < folderEls.length; fe++) {
                var fEl = folderEls[fe];
                if (fEl.style.display === 'none') continue;
                var fDir = fEl.getAttribute('data-dir');
                var fItems = fEl.querySelector('.ayPlayer-playlist-folder-items');
                if (fItems && (fItems.style.display === 'block' || fDir === currentDir)) {
                    fItems.style.display = 'block';
                    if (_folderSlots[fDir] && (!fItems.hasChildNodes() || !_folderFullyLoaded[fDir])) openFolderItems(fItems, fDir);
                    var arrow = fEl.querySelector('.ayPlayer-playlist-folder-arrow');
                    if (arrow) arrow.classList.add('open');
                }
            }
            if (currentDir) {
                var curItem = el.querySelector('.ayPlayer-playlist-item[data-id="' + currentId + '"]');
                if (curItem) curItem.scrollIntoView({block:'nearest'});
            }

            // open folder containing current track and scroll to it
            if (playlist && currentId >= 0 && currentId < playlist.length) {
                var curItem = el.querySelector('.ayPlayer-playlist-item[data-id="' + currentId + '"]');
                if (curItem) {
                    var folderItems = curItem.closest('.ayPlayer-playlist-folder-items');
                    if (folderItems) {
                        var folderDiv = folderItems.closest('.ayPlayer-playlist-folder');
                        if (folderDiv && folderDiv.style.display !== 'none' && folderItems.style.display !== 'block') {
                            var fh = folderItems.previousElementSibling;
                            if (fh) {
                                var arrow = fh.querySelector('.ayPlayer-playlist-folder-arrow');
                                if (arrow) arrow.classList.add('open');
                            }
                            folderItems.style.display = 'block';
                        }
                    }
                    curItem.scrollIntoView({block:'nearest'});
                }
            }
        }

        // apply folder alpha filter after full rebuild
        if (folderAlphaFilter !== 'all') {
            var allFolders2 = el.querySelectorAll('.ayPlayer-playlist-folder');
            var anyAlphaVisible = false;
            for (var af = 0; af < allFolders2.length; af++) {
                var fDir2 = allFolders2[af].getAttribute('data-dir') || '';
                var displayDir2 = fDir2 === '/' ? 'chiptunes' : fDir2.replace(/^chiptunes\//, '');
                var fc2 = displayDir2.charAt(0).toUpperCase();
                var fa2 = (fc2 >= 'A' && fc2 <= 'Z') ? fc2 : '0';
                if (fa2 !== folderAlphaFilter) {
                    allFolders2[af].style.display = 'none';
                } else {
                    anyAlphaVisible = true;
                }
            }
            var emptyMsg2 = el.querySelector('.ayPlayer-playlist-empty');
            if (!anyAlphaVisible) {
                if (!emptyMsg2) {
                    var msg2 = document.createElement('div');
                    msg2.className = 'ayPlayer-playlist-empty';
                    msg2.textContent = 'No tracks match the filter';
                    el.appendChild(msg2);
                }
            } else if (emptyMsg2) {
                emptyMsg2.remove();
            }
        }

        if (!html) {
            var msg = document.createElement('div');
            msg.className = 'ayPlayer-playlist-empty';
            msg.textContent = favoritesOnly ? 'No favorite tracks' : 'No tracks match the filter';
            el.appendChild(msg);
        }
    }

    function updateTrackDisplay() {
        var info = getTrackInfo();
        function displayTrackInfo(el) {
            if (!el) return;
            var info = getTrackInfo();
            el.innerHTML = '';
            var line1 = document.createElement('div');
            line1.className = 'ayPlayer-trackAuthor';
            var line2 = document.createElement('div');
            line2.className = 'ayPlayer-trackTitle';
            var entry = playlist[currentId];
            var isPT3 = entry && /\.pt3$/i.test(entry.file);
            var isMTC = entry && /\.mtc$/i.test(entry.file);
            if (isMTC) {
                line1.textContent = '\u00A0';
                line2.textContent = _trackDisplay(entry) || info.fileName || '';
            } else if (info.author) {
                line1.appendChild(document.createTextNode(info.author));
                line2.textContent = info.title;
            } else {
                var display = isPT3
                    ? ((info.title || info.fileName) || '').replace(/%20/g, ' ').replace(/\.(fym|pt3|vt2|psg|stc|ay|snd|asc|pt1|stp)$/i, '')
                    : (_trackDisplay(entry) || info.fileName || '').replace(/%20/g, ' ');
                var sub = '';
                if (entry) {
                    if (entry.section) sub = entry.section;
                    else if (entry.file) {
                        var parts = entry.file.split('/');
                        parts.pop();
                        if (parts.length > 1) sub = parts[parts.length - 1];
                    }
                }
                if (sub) {
                    line1.textContent = sub;
                    line2.textContent = display;
                } else {
                    line1.appendChild(document.createTextNode(display));
                    line2.textContent = '\u00A0';
                }
            }
            el.appendChild(line1);
            el.appendChild(line2);
            fitTrackInfo(el);
        }
        displayTrackInfo(document.getElementById(containerId + '_trackName'));
        displayTrackInfo(document.querySelector('#' + containerId + '_trackName2 .ayPlayer-trackName-mobile'));
        if (onTrackChange) onTrackChange(info);
        updatePlaylistActive();
    }

    function fitTrackInfo(el) {
        if (!el) return;
        var lines = el.querySelectorAll('.ayPlayer-trackAuthor, .ayPlayer-trackTitle');
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            line.style.whiteSpace = 'nowrap';
            line.style.fontSize = '';
            var fs = 15;
            while (fs > 8 && line.scrollWidth > line.clientWidth) {
                fs -= 0.5;
                line.style.fontSize = fs + 'px';
            }
        }
    }

    function updateSepHighlight(list) {
        var seps = (list || document.getElementById(containerId + '_playlistItems')).querySelectorAll('.ayPlayer-playlist-year-sep, .ayPlayer-playlist-auth-sep');
        for (var si = 0; si < seps.length; si++) seps[si].classList.remove('active');
        var activeEl = (list || document.getElementById(containerId + '_playlistItems')).querySelector('.ayPlayer-playlist-item.active');
        if (activeEl) {
            var sib = activeEl.previousElementSibling;
            var foundSep = false;
            while (sib) {
                if (sib.classList.contains('ayPlayer-playlist-year-sep') || sib.classList.contains('ayPlayer-playlist-auth-sep')) {
                    sib.classList.add('active');
                    foundSep = true;
                } else if (sib.classList.contains('ayPlayer-playlist-item') && foundSep) {
                    break;
                }
                sib = sib.previousElementSibling;
            }
        }
    }

    function revealCurrentFolder() {
        var list = document.getElementById(containerId + '_playlistItems');
        if (!list) return null;
        var entry = playlist[currentId];
        if (!entry) return null;
        var f = entry.file;
        var s = f.lastIndexOf('/');
        var dir = entry.author || (s > 0 ? f.substring(0, s) : '/');
        var folderEl = list.querySelector('.ayPlayer-playlist-folder[data-dir="' + dir.replace(/"/g, '&quot;') + '"]');
        if (!folderEl || folderEl.style.display === 'none') return null;
        var items = folderEl.querySelector('.ayPlayer-playlist-folder-items');
        var arrow = folderEl.querySelector('.ayPlayer-playlist-folder-arrow');
        if (items && items.style.display === 'none') {
            var allItems = list.querySelectorAll('.ayPlayer-playlist-folder-items');
            for (var i = 0; i < allItems.length; i++) allItems[i].style.display = 'none';
            var allArrows = list.querySelectorAll('.ayPlayer-playlist-folder-arrow');
            for (var i = 0; i < allArrows.length; i++) allArrows[i].classList.remove('open');
            items.style.display = 'block';
            if (!items.hasChildNodes() || !_folderFullyLoaded[dir]) {
                if (_folderSlots[dir]) openFolderItems(items, dir);
            }
            if (arrow) arrow.classList.add('open');
        }
        return items;
    }

    function updatePlaylistActive() {
        var list = document.getElementById(containerId + '_playlistItems');
        if (!list) return;
        if (typeof _lastActiveId === 'undefined') _lastActiveId = null;
        if (_lastActiveId !== null && _lastActiveId !== currentId) {
            var oldEl = list.querySelector('.ayPlayer-playlist-item[data-id="' + _lastActiveId + '"]');
            if (oldEl) {
                oldEl.classList.remove('active');
            }
        }
        _lastActiveId = currentId;
        var newEl = list.querySelector('.ayPlayer-playlist-item[data-id="' + currentId + '"]');
        if (!newEl) {
            var fItems = revealCurrentFolder();
            if (fItems && fItems._virtualDir) {
                var fr = fItems.getBoundingClientRect();
                var cr = list.getBoundingClientRect();
                if (fr.bottom < cr.top || fr.top > cr.bottom) {
                    var folderEl = fItems.parentNode;
                    if (folderEl) folderEl.scrollIntoView({ block: 'start' });
                }
                var cRect = list.getBoundingClientRect();
                renderVirtualFolder(fItems, fItems._virtualDir, list, cRect);
                newEl = list.querySelector('.ayPlayer-playlist-item[data-id="' + currentId + '"]');
            }
        }
        if (newEl) {
            var isActive = playing;
            newEl.classList.toggle('active', isActive);
            newEl.scrollIntoView({ block: 'nearest' });
        }
        updateSepHighlight(list);
    }

    function playBuffer(fym, fileName, cont) {
        if (!playlist[currentId] || playlist[currentId].file !== fileName) { loadingNext = false; return; }
        trackEndedFlag = false;
        resetScope();
        drawScope();
        muted = [false, false, false, false, false, false, false, false, false, false, false, false];
        pt3FrameCount = 0;
        var isPT3 = /\.pt3$/i.test(fileName);
        var isVT2 = /\.vt2$/i.test(fileName);
        var isPSG = /\.psg$/i.test(fileName);
        var isSND = /\.snd$/i.test(fileName);
        var isSTC = /\.stc$/i.test(fileName);
        var isAY = /\.ay$/i.test(fileName);
        var isPT2 = /\.pt2$/i.test(fileName);
        var isASC = /\.asc$/i.test(fileName);
        var isMTC = /\.mtc$/i.test(fileName);
        var isTFC = /\.tfc$/i.test(fileName);
        var isSTP = /\.stp$/i.test(fileName);
        var isPT1 = /\.pt1$/i.test(fileName);
        var dump = [];
        var dumpLen = 0;
        var fr = 50, clock = 1773400, turbo = false, chipCount = 1;
        var chipTypes = null, opnClock = 0;
        var trackName = '', authorName = '', trackFileName = '';
        var lf = -1;
        var numPos = 0, loopPos = -1;
        var loopStartFrame = -1;

        function startAudio() {
            if (!playlist[currentId] || playlist[currentId].file !== fileName) { loadingNext = false; return; }
            clockSelect = 0;
            var _btns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-clock]');
            for (var _bi = 0; _bi < _btns.length; _bi++) {
                _btns[_bi].classList.toggle('active', parseInt(_btns[_bi].dataset.clock) === clockSelect);
            }
            saveState();
            isTurbo = turbo;
            _chipCount = chipCount;
            var loopStartFraction = (numPos && numPos > 0 && loopPos >= 0) ? loopPos / numPos : 0;
            _loopFrame = loopStartFrame >= 0 ? loopStartFrame : Math.round(loopStartFraction * dumpLen);
            song = {
                getFrameCount: function() { return dumpLen; },
                getFrameRate: function() { return intFreqSelect || fr; },
                getClockRate: function() { return clock; },
                getTurbo: function() { return turbo; },
                getTrackName: function() { return trackName; },
                getAuthorName: function() { return authorName; },
                getTrackFileName: function() { return trackFileName; },
                setProgress: function(k) {
                    if (_streamMode) { _streamSeek(k); return; }
                    if (_workletNode) {
                        _workletNode.port.postMessage({ type: 'setProgress', progress: k });
                    }
                }
            };
            _dumpData = { dump: dump, dumpLen: dumpLen, isTurbo: turbo, chipCount: chipCount, isYM: isYM, clock: clockSelect || clock, frameRate: intFreqSelect || fr, loopFrame: _loopFrame, chipKinds: chipTypes, opnClock: opnClock };
            playFrame = 0;
            _silenceRunMs = 0;
            _silenceLastCheck = -1;
            _silenceHeard = false;
            _silenceSkipDone = false;
            for (var _mc = 0; _mc < 12; _mc++) muted[_mc] = false;
            soloedIdx = -1;
            if (playlist[currentId] && chipCount > 0) {
                var realCh = chipCount * 3;
                if (playlist[currentId].channels !== realCh) {
                    playlist[currentId].channels = realCh;
                    var _aEl = document.querySelector('.ayPlayer-playlist-item.active .ayPlayer-playlist-ch');
                    if (_aEl) {
                        _aEl.textContent = realCh + 'ch';
                        _aEl.className = 'ayPlayer-playlist-format ayPlayer-playlist-ch ayPlayer-ch-' + realCh;
                        var _aI = _aEl.closest('.ayPlayer-playlist-item');
                        if (_aI) _aI.setAttribute('data-ch', realCh);
                    }
                }
            }
            var pan = _getPanData();
            if (_streamMode) {
                _streamLoad(0);
            } else if (_workletNode) {
                _workletNode.port.postMessage({
                    type: 'load',
                    dump: dump,
                    isTurbo: turbo,
                    chipCount: chipCount,
                    isYM: isYM,
                    clock: clockSelect || clock,
                    frameRate: intFreqSelect || fr,
                    volume: volume,
                    repeat: repeat,
                    loopFrame: _loopFrame,
                    chipKinds: chipTypes,
                    opnClock: opnClock,
                    pan: pan
                });
            }
            if (!rafId) rafId = requestAnimationFrame(rafLoop);
            startEndCheck();
            requestWakeLock();
            updateTrackDisplay();
            var totalEl = document.getElementById(containerId + '_totalTime');
            var totalElM = document.getElementById(containerId + '_totalTimeM');
            var totalTxt = trackTotalTime || getTotalTime();
            if (totalEl) totalEl.textContent = totalTxt;
            if (totalElM) totalElM.textContent = totalTxt;
            if (onTimeUpdate) onTimeUpdate(getTimeDisplay());
            updatePlayBtn();
            _showAutoplayPrompt();
            _requestAccurateWaveform(fileName);
        }

        function startDumpLoad(reader, maxFc, formatDumpFn, onComplete) {
            var wc = document.getElementById(containerId + '_waveCanvas');
            if (wc) wc.classList.remove('visible');
            var lf = -1;
            var di = 0;
            var localDump = [];
            if (document.hidden) {
                for (; di < maxFc; di++) {
                    var r = reader.getNextFrame();
                    if (r[r.length - 1] && lf < 0) lf = di;
                    if (lf >= 0) break;
                    formatDumpFn(localDump, r);
                }
                onComplete(localDump, lf, di);
                return;
            }
            function dumpChunk() {
                var curEntry = playlist[currentId];
                if (!curEntry || curEntry.file !== fileName) return;
                var t0 = performance.now();
                for (; di < maxFc && performance.now() - t0 < 12; di++) {
                    var r = reader.getNextFrame();
                    if (r[r.length - 1] && lf < 0) lf = di;
                    if (lf >= 0) break;
                    formatDumpFn(localDump, r);
                }
                if (lf >= 0 || di >= maxFc) {
                    onComplete(localDump, lf, di);
                } else {
                    setWaveformLoadingText('Dumping frames (' + di + '/' + maxFc + ')');
                    requestAnimationFrame(dumpChunk);
                }
            }
            requestAnimationFrame(dumpChunk);
        }

        if (isPT3) {
            var reader = new PT3Reader(fym, fileName);
            var estFc = reader.getFrameCount();
            fr = reader.getFrameRate();
            clock = reader.getClockRate();
            turbo = reader.getTurbo();
            chipCount = reader.getNumChips ? reader.getNumChips() : (turbo ? 2 : 1);
            trackName = reader.getTrackName();
            authorName = reader.getAuthorName();
            trackFileName = reader.getTrackFileName().replace(/:(A|B)$/, '');
            numPos = reader.getNumPositions();
            loopPos = reader.getLoopPos();
            var maxFc = Math.max(estFc * 5, fr * 120);
            startDumpLoad(reader, maxFc, function(dump, r) {
                dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [], c: r[2] ? r[2].slice() : [] });
            }, function(localDump, lf, di) {
                dump = localDump;
                dumpLen = dump.length;
                if (lf >= 0) {
                    var effectiveEnd = Math.min(dumpLen, lf);
                    if (effectiveEnd < dumpLen) { dump.length = effectiveEnd; dumpLen = effectiveEnd; }
                } else if (dumpLen > estFc) {
                    dump.length = estFc; dumpLen = estFc;
                }
                pt3FrameCount = dumpLen;
                if (reader.getLoopStartFrame) loopStartFrame = reader.getLoopStartFrame();
                var effectiveClock = clockSelect || clock;
                generatePt3Waveform(dump, dumpLen, fr, effectiveClock, chipCount, fileName, lf, numPos, loopPos, reader.getDelay(), false, startAudio);
            });
        } else if (isVT2) {
            var reader = new VT2Player(fym, fileName);
            chipCount = reader.getNumChips ? reader.getNumChips() : 1;
            var estFc = reader.getFrameCount();
            fr = reader.getFrameRate();
            clock = reader.getClockRate();
            turbo = chipCount > 1;
            trackName = reader.getTrackName();
            authorName = reader.getAuthorName();
            trackFileName = reader.getTrackFileName();
            numPos = reader.getNumPositions();
            loopPos = reader.getLoopPos();
            var maxFc = Math.max(estFc * 5, fr * 120);
            startDumpLoad(reader, maxFc, function(dump, r) {
                dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [], c: r[2] ? r[2].slice() : [] });
            }, function(localDump, lf, di) {
                dump = localDump;
                dumpLen = dump.length;
                if (lf >= 0) {
                    var effectiveEnd = Math.min(dumpLen, lf);
                    if (effectiveEnd < dumpLen) { dump.length = effectiveEnd; dumpLen = effectiveEnd; }
                } else if (dumpLen > estFc) {
                    dump.length = estFc; dumpLen = estFc;
                }
                pt3FrameCount = dumpLen;
                if (reader.getLoopStartFrame) loopStartFrame = reader.getLoopStartFrame();
                var effectiveClock = clockSelect || clock;
                generatePt3Waveform(dump, dumpLen, fr, effectiveClock, chipCount, fileName, lf, numPos, loopPos, reader.getDelay(), false, startAudio);
            });
        } else if (isPSG) {
            var reader = new PSGReader(fym, fileName);
            if (reader.error) { showError(reader.error); return; }
            fr = reader.getFrameRate();
            clock = reader.getClockRate();
            turbo = false;
            chipCount = 1;
            trackName = reader.getTrackName();
            authorName = reader.getAuthorName();
            trackFileName = reader.getTrackFileName();
            var psgFc = reader.getFrameCount();
            startDumpLoad(reader, psgFc, function(dump, r) {
                dump.push({ a: r[0].slice(), b: [] });
            }, function(localDump, lf, di) {
                dump = localDump;
                dumpLen = dump.length;
                pt3FrameCount = dumpLen;
                generatePt3Waveform(dump, dumpLen, fr, clock, chipCount, fileName, -1, 0, -1, 0, false, startAudio);
            });
        } else if (isSND) {
            var fileBytes = new Int8Array(fym);
            var sndParser = new SndToPsg(fileBytes);
            var psgArray = sndParser.exec;
            var psgBuf = new Uint8Array(psgArray).buffer;
            var reader = new PSGReader(psgBuf, fileName.replace(/\.snd$/i, '.psg'));
            if (reader.error) { showError(reader.error); return; }
            fr = reader.getFrameRate();
            clock = 1714285;
            turbo = false;
            chipCount = 1;
            trackName = reader.getTrackName();
            authorName = sndGetAuthor(fym) || reader.getAuthorName();
            trackFileName = reader.getTrackFileName();
            var psgFc = reader.getFrameCount();
            startDumpLoad(reader, psgFc, function(dump, r) {
                dump.push({ a: r[0].slice(), b: [] });
            }, function(localDump, lf, di) {
                dump = localDump;
                dumpLen = dump.length;
                pt3FrameCount = dumpLen;
                generatePt3Waveform(dump, dumpLen, fr, clock, chipCount, fileName, -1, 0, -1, 0, false, startAudio);
            });
        } else if (isSTC) {
            var reader = new STCReader(fym, fileName);
            if (reader.error) { showError(reader.error); return; }
            fr = reader.getFrameRate();
            clock = reader.getClockRate();
            turbo = false;
            chipCount = 1;
            trackName = reader.getTrackName();
            authorName = reader.getAuthorName();
            trackFileName = reader.getTrackFileName();
            numPos = reader.getNumPositions();
            loopPos = reader.getLoopPos();
            var estFc = reader.getFrameCount();
            var maxFc = Math.max(estFc * 5, fr * 120);
            startDumpLoad(reader, maxFc, function(dump, r) {
                dump.push({ a: r[0].slice(), b: [] });
            }, function(localDump, lf, di) {
                dump = localDump;
                dumpLen = dump.length;
                if (lf >= 0) {
                    var effectiveEnd = Math.min(dumpLen, lf);
                    if (effectiveEnd < dumpLen) { dump.length = effectiveEnd; dumpLen = effectiveEnd; }
                } else if (dumpLen > estFc) {
                    dump.length = estFc; dumpLen = estFc;
                }
                pt3FrameCount = dumpLen;
                var effectiveClock = clockSelect || clock;
                generatePt3Waveform(dump, dumpLen, fr, effectiveClock, chipCount, fileName, lf, numPos, loopPos, reader.getDelay(), false, startAudio);
            });
        } else if (isPT2) {
            var reader = new PT2Reader(fym, fileName);
            fr = reader.getFrameRate();
            clock = reader.getClockRate();
            turbo = false;
            chipCount = 1;
            trackName = reader.getTrackName();
            authorName = reader.getAuthorName();
            trackFileName = reader.getTrackFileName();
            numPos = reader.getNumPositions();
            loopPos = reader.getLoopPos();
            var estFc = reader.getFrameCount();
            var maxFc = Math.max(estFc * 5, fr * 120);
            startDumpLoad(reader, maxFc, function(dump, r) {
                dump.push({ a: r[0].slice(), b: [] });
            }, function(localDump, lf, di) {
                dump = localDump;
                dumpLen = dump.length;
                if (lf >= 0) {
                    var effectiveEnd = Math.min(dumpLen, lf);
                    if (effectiveEnd < dumpLen) { dump.length = effectiveEnd; dumpLen = effectiveEnd; }
                } else if (dumpLen > estFc) {
                    dump.length = estFc; dumpLen = estFc;
                }
                pt3FrameCount = dumpLen;
                var effectiveClock = clockSelect || clock;
                generatePt3Waveform(dump, dumpLen, fr, effectiveClock, chipCount, fileName, lf, numPos, loopPos, reader.getDelay(), false, startAudio);
            });
        } else if (isASC) {
            var reader = new ASCReader(fym, fileName);
            fr = reader.getFrameRate();
            clock = reader.getClockRate();
            turbo = false;
            chipCount = 1;
            trackName = reader.getTrackName();
            authorName = reader.getAuthorName();
            trackFileName = reader.getTrackFileName();
            numPos = reader.getNumPositions();
            loopPos = reader.getLoopPos();
            var estFc = reader.getFrameCount();
            var maxFc = Math.max(estFc * 5, fr * 120);
            startDumpLoad(reader, maxFc, function(dump, r) {
                dump.push({ a: r[0].slice(), b: [] });
            }, function(localDump, lf, di) {
                dump = localDump;
                dumpLen = dump.length;
                if (lf >= 0) {
                    var effectiveEnd = Math.min(dumpLen, lf);
                    if (effectiveEnd < dumpLen) { dump.length = effectiveEnd; dumpLen = effectiveEnd; }
                } else if (dumpLen > estFc) {
                    dump.length = estFc; dumpLen = estFc;
                }
                pt3FrameCount = dumpLen;
                var effectiveClock = clockSelect || clock;
                generatePt3Waveform(dump, dumpLen, fr, effectiveClock, chipCount, fileName, lf, numPos, loopPos, reader.getDelay(), false, startAudio);
            });
        } else if (isAY) {
            var wc = document.getElementById(containerId + '_waveCanvas');
            if (wc) wc.classList.remove('visible');
            var ayGen = _loadGen;
            setTimeout(function() {
                if (ayGen !== _loadGen) return;
                if (!playlist[currentId] || playlist[currentId].file !== fileName) return;
                var reader = new AYReader(fym, fileName);
                if (reader.error) { if (onTrackChange) onTrackChange({ author: 'Error', title: reader.error }); return; }
                if (ayGen !== _loadGen) return;
                fr = reader.getFrameRate();
                clock = reader.getClockRate();
                turbo = false;
                chipCount = 1;
                trackName = reader.getTrackName();
                authorName = reader.getAuthorName();
                trackFileName = reader.getTrackFileName();
                reader.run(function(p, total) {
                    setWaveformLoadingText('Z80 processing (' + p + '/' + total + ')');
                }, function() {
                var totalFc = reader.getFrameCount();
                var localDump = [];
                if (document.hidden) {
                    for (var i = 0; i < totalFc; i++) {
                        var rr = reader.getNextFrame();
                        localDump.push({ a: rr[0].slice(), b: [] });
                    }
                    dump = localDump;
                    dumpLen = dump.length;
                    pt3FrameCount = dumpLen;
                    generatePt3Waveform(dump, dumpLen, fr, clock, chipCount, fileName, reader.getLoopFrame(), 0, -1, 0, false, function() { startAudio(); });
                    return;
                }
                var di = 0;
                function buildAyDumpChunk() {
                    if (ayGen !== _loadGen) return;
                    if (!playlist[currentId] || playlist[currentId].file !== fileName) return;
                    var t0 = performance.now();
                    for (; di < totalFc && performance.now() - t0 < 12; di++) {
                        var r = reader.getNextFrame();
                        localDump.push({ a: r[0].slice(), b: [] });
                    }
                    setWaveformLoadingText('Z80 processing (' + di + '/' + totalFc + ')');
                    if (di >= totalFc) {
                        dump = localDump;
                        dumpLen = dump.length;
                        pt3FrameCount = dumpLen;
                        generatePt3Waveform(dump, dumpLen, fr, clock, chipCount, fileName, reader.getLoopFrame(), 0, -1, 0, false, function() { startAudio(); });
                    } else {
                        requestAnimationFrame(buildAyDumpChunk);
                    }
                }
                requestAnimationFrame(buildAyDumpChunk);
                }, function() { return ayGen !== _loadGen || !playlist[currentId] || playlist[currentId].file !== fileName; });
            }, 50);
        } else if (isMTC) {
            if (typeof MTCReader === 'undefined') { showToast('Модуль MTC заблокирован рекламным блокировщиком — добавьте ayplay.ru в исключения'); return; }
            var reader = new MTCReader(fym, fileName);
            if (reader.error) { showToast(reader.error); return; }
            fr = reader.getFrameRate();
            clock = reader.getClockRate();
            turbo = reader.getTurbo();
            chipCount = reader.getNumChips ? reader.getNumChips() : 1;
            chipTypes = reader.getChipTypes ? reader.getChipTypes() : null;
            opnClock = reader.getOpnClockRate ? reader.getOpnClockRate() : 0;
            trackName = reader.getTrackName();
            authorName = reader.getAuthorName();
            trackFileName = reader.getTrackFileName();
            var mtcFc = reader.getFrameCount();
            startDumpLoad(reader, mtcFc, function(dump, r) {
                dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [], c: r[2] ? r[2].slice() : [], d: (r.length > 4 && r[3]) ? r[3].slice() : [] });
            }, function(localDump, lf, di) {
                dump = localDump;
                dumpLen = dump.length;
                pt3FrameCount = dumpLen;
                _chipKinds = chipTypes;
                _opnClock = opnClock;
                var effectiveClock = clockSelect || clock;
                generatePt3Waveform(dump, dumpLen, fr, effectiveClock, chipCount, fileName, -1, 0, -1, 0, false, startAudio);
            });
        } else if (isTFC) {
            var reader = new TFCReader(fym, fileName);
            if (reader.error) { showError(reader.error); return; }
            fr = reader.getFrameRate();
            clock = reader.getClockRate();
            turbo = reader.getTurbo();
            chipCount = reader.getNumChips ? reader.getNumChips() : 2;
            chipTypes = ['opn', 'opn'];
            opnClock = reader.getClockRate();
            trackName = reader.getTrackName();
            authorName = reader.getAuthorName();
            trackFileName = reader.getTrackFileName();
            numPos = reader.getFrameCount();
            loopPos = reader.getLoopFrame();
            var tfcFc = reader.getFrameCount();
            startDumpLoad(reader, tfcFc, function(dump, r) {
                dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [] });
            }, function(localDump, lf, di) {
                dump = localDump;
                dumpLen = dump.length;
                pt3FrameCount = dumpLen;
                _chipKinds = chipTypes;
                _opnClock = opnClock;
                var effectiveClock = clockSelect || clock;
                generatePt3Waveform(dump, dumpLen, fr, effectiveClock, chipCount, fileName, reader.getLoopFrame(), numPos, loopPos, 0, false, startAudio);
            });
        } else if (isSTP) {
            var reader = new STPReader(fym, fileName);
            if (reader.error) { showError(reader.error); return; }
            fr = reader.getFrameRate();
            clock = reader.getClockRate();
            turbo = reader.getTurbo();
            chipCount = reader.getNumChips ? reader.getNumChips() : 1;
            trackName = reader.getTrackName();
            authorName = reader.getAuthorName();
            trackFileName = reader.getTrackFileName();
            numPos = reader.getNumPositions();
            loopPos = reader.getLoopPos();
            var stpFc = reader.getFrameCount();
            var stpMaxFc = Math.max(stpFc * 2, fr * 120);
            startDumpLoad(reader, stpMaxFc, function(dump, r) {
                dump.push({ a: r[0].slice(), b: [] });
            }, function(localDump, lf, di) {
                dump = localDump;
                dumpLen = dump.length;
                if (lf >= 0) {
                    var effectiveEnd = Math.min(dumpLen, lf);
                    if (effectiveEnd < dumpLen) { dump.length = effectiveEnd; dumpLen = effectiveEnd; }
                } else if (dumpLen > stpFc) {
                    dump.length = stpFc; dumpLen = stpFc;
                }
                pt3FrameCount = dumpLen;
                var effectiveClock = clockSelect || clock;
                generatePt3Waveform(dump, dumpLen, fr, effectiveClock, chipCount, fileName, lf, numPos, loopPos, reader.getDelay(), false, startAudio);
            });
        } else if (isPT1) {
            var reader = new PT1Reader(fym, fileName);
            if (reader.error) { showError(reader.error); return; }
            fr = reader.getFrameRate();
            clock = reader.getClockRate();
            turbo = reader.getTurbo();
            chipCount = reader.getNumChips ? reader.getNumChips() : 1;
            trackName = reader.getTrackName();
            authorName = reader.getAuthorName();
            trackFileName = reader.getTrackFileName();
            numPos = reader.getNumPositions();
            loopPos = reader.getLoopPos();
            var pt1Fc = reader.getFrameCount();
            var pt1MaxFc = Math.max(pt1Fc * 2, fr * 120);
            startDumpLoad(reader, pt1MaxFc, function(dump, r) {
                dump.push({ a: r[0].slice(), b: [] });
            }, function(localDump, lf, di) {
                dump = localDump;
                dumpLen = dump.length;
                if (lf >= 0) {
                    var effectiveEnd = Math.min(dumpLen, lf);
                    if (effectiveEnd < dumpLen) { dump.length = effectiveEnd; dumpLen = effectiveEnd; }
                } else if (dumpLen > pt1Fc) {
                    dump.length = pt1Fc; dumpLen = pt1Fc;
                }
                pt3FrameCount = dumpLen;
                var effectiveClock = clockSelect || clock;
                generatePt3Waveform(dump, dumpLen, fr, effectiveClock, chipCount, fileName, lf, numPos, loopPos, reader.getDelay(), false, startAudio);
            });
        } else {
            var fymReader = new FYMReader(fym, fileName);
            fr = fymReader.getFrameRate();
            clock = fymReader.getClockRate();
            turbo = fymReader.getTurbo();
            chipCount = turbo ? 2 : 1;
            trackName = fymReader.getTrackName();
            authorName = fymReader.getAuthorName();
            trackFileName = fymReader.getTrackFileName();
            dumpLen = fymReader.getFrameCount();
            for (var i = 0; i < dumpLen; i++) {
                var r = fymReader.getNextFrame();
                dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [] });
            }
            pt3FrameCount = dumpLen;
            generateFymWaveform(fym, fileName, startAudio);
        }
    }

    var _loadGen = 0;
    var _playlistClickTimer = null;
    var _xhr = null;
    var _folderChunks = {};
    var _folderRAF = null;
    var _folderFullyLoaded = {};
    var _folderLoadingDir = null;
    var _folderSlots = {};
    var _folderSlotTops = {};
    var _folderTotalHeight = {};
    var _virtualScrollAttached = false;
    var _vsRAF = null;
    var FOLDER_CHUNK_SIZE = 50;

    function splitIntoChunks(html, chunkSize) {
        var chunks = [];
        var re = /<div class="ayPlayer-playlist-item[\s\S]*?<\/div>/g;
        var match;
        var current = '';
        var count = 0;
        var lastIdx = 0;
        while ((match = re.exec(html)) !== null) {
            current += html.substring(lastIdx, match.index + match[0].length);
            lastIdx = match.index + match[0].length;
            count++;
            if (count >= chunkSize) {
                chunks.push(current);
                current = '';
                count = 0;
            }
        }
        if (lastIdx < html.length) current += html.substring(lastIdx);
        if (current) chunks.push(current);
        return chunks.length ? chunks : [html];
    }

    function hideEmptySeparators(itemsEl) {
        var fseps = itemsEl.querySelectorAll('.ayPlayer-playlist-year-sep, .ayPlayer-playlist-auth-sep');
        for (var si = 0; si < fseps.length; si++) {
            var sep = fseps[si];
            var next = sep.nextElementSibling;
            var sepHasVisible = false;
            while (next) {
                if (next.classList.contains('ayPlayer-playlist-year-sep') || next.classList.contains('ayPlayer-playlist-auth-sep')) break;
                if (next.classList.contains('ayPlayer-playlist-item') && getComputedStyle(next).display !== 'none') { sepHasVisible = true; break; }
                next = next.nextElementSibling;
            }
            sep.style.display = sepHasVisible ? '' : 'none';
        }
    }

    function injectFolderChunks(container, chunks, idx, dir, callback) {
        if (idx >= chunks.length) {
            _folderFullyLoaded[dir] = true;
            _folderLoadingDir = null;
            requestAnimationFrame(function() { hideEmptySeparators(container); });
            if (callback) callback();
            return;
        }
        container.insertAdjacentHTML('beforeend', chunks[idx]);
        _folderRAF = requestAnimationFrame(function() {
            injectFolderChunks(container, chunks, idx + 1, dir, callback);
        });
    }

    function findSlotByOffset(tops, offset) {
        var lo = 0, hi = tops.length - 1;
        while (lo <= hi) {
            var mid = (lo + hi) >> 1;
            if (tops[mid] <= offset) lo = mid + 1;
            else hi = mid - 1;
        }
        return Math.min(lo, tops.length - 1);
    }

    function onVirtualScroll() {
        if (_vsRAF) return;
        _vsRAF = requestAnimationFrame(function() {
            _vsRAF = null;
            var el = document.getElementById(containerId + '_playlistItems');
            if (!el) return;
            var folders = el.querySelectorAll('.ayPlayer-playlist-folder-items');
            var containerRect = el.getBoundingClientRect();
            for (var i = 0; i < folders.length; i++) {
                var f = folders[i];
                if (f.style.display === 'none' || f._virtualDir === undefined) continue;
                var dir = f._virtualDir;
                if (dir && _folderSlots[dir]) renderVirtualFolder(f, dir, el, containerRect);
            }
        });
    }

    function ensureVirtualScroll() {
        if (_virtualScrollAttached) return;
        var el = document.getElementById(containerId + '_playlistItems');
        if (!el) return;
        el.addEventListener('scroll', onVirtualScroll, { passive: true });
        _virtualScrollAttached = true;
    }

    function renderVirtualFolder(itemsEl, dir, playlistEl, containerRect) {
        var slots = _folderSlots[dir];
        var tops = _folderSlotTops[dir];
        var totalH = _folderTotalHeight[dir];
        if (!slots || !slots.length) return;

        if (!playlistEl) {
            playlistEl = itemsEl.parentNode;
            while (playlistEl && !playlistEl.classList.contains('ayPlayer-playlist-items')) {
                playlistEl = playlistEl.parentNode;
            }
            if (!playlistEl) return;
            containerRect = playlistEl.getBoundingClientRect();
        }

        var folderRect = itemsEl.getBoundingClientRect();
        var folderStart = folderRect.top - containerRect.top + playlistEl.scrollTop;
        var scrollTop = playlistEl.scrollTop;
        var viewH = playlistEl.clientHeight;

        if (folderStart > scrollTop + viewH || folderStart + totalH < scrollTop) {
            if (itemsEl.children.length > 0) itemsEl.innerHTML = '';
            return;
        }

        var visibleStart = Math.max(0, scrollTop - folderStart);
        var visibleEnd = Math.min(totalH, scrollTop + viewH - folderStart);

        var startIdx = findSlotByOffset(tops, visibleStart);
        var endIdx = findSlotByOffset(tops, visibleEnd);

        var BUFFER = 400;
        while (startIdx > 0 && tops[startIdx - 1] > visibleStart - BUFFER) startIdx--;
        while (endIdx < slots.length - 1 && tops[endIdx + 1] + slots[endIdx + 1].h < visibleEnd + BUFFER) endIdx++;

        // ensure current item is always in DOM
        for (var ci = 0; ci < slots.length; ci++) {
            if (slots[ci].type === 'item' && slots[ci].id === currentId) {
                if (ci < startIdx) startIdx = ci;
                if (ci > endIdx) endIdx = ci;
                break;
            }
        }

        // build a map of existing children by slot index
        var children = itemsEl.children;
        var existing = {};
        var toRemove = [];
        for (var i = 0; i < children.length; i++) {
            var ch = children[i];
            var si = parseInt(ch.getAttribute('data-si'));
            if (!isNaN(si)) {
                if (si < startIdx || si > endIdx) toRemove.push(ch);
                else existing[si] = ch;
            }
        }
        for (var r = 0; r < toRemove.length; r++) toRemove[r].remove();

        // insert missing slots
        var frag = document.createDocumentFragment();
        var prevSib = null;
        for (var si = startIdx; si <= endIdx; si++) {
            if (existing[si]) { prevSib = existing[si]; continue; }
            var tmp = document.createElement('div');
            var slotHtml = slots[si].html;
            tmp.innerHTML = typeof slotHtml === 'function' ? slotHtml() : slotHtml;
            var el = tmp.firstChild;
            el.setAttribute('data-si', si);
            el.style.position = 'absolute';
            el.style.top = tops[si] + 'px';
            el.style.left = '0';
            el.style.right = '0';
            var shouldBeActive = playing && slots[si].type === 'item' && slots[si].id === currentId;
            el.classList.toggle('active', shouldBeActive);
            if (prevSib) {
                itemsEl.insertBefore(el, prevSib.nextSibling);
            } else if (itemsEl.firstChild) {
                itemsEl.insertBefore(el, itemsEl.firstChild);
            } else {
                itemsEl.appendChild(el);
            }
            prevSib = el;
        }
    }

    function openFolderItems(itemsEl, dir) {
        if (_folderRAF) { cancelAnimationFrame(_folderRAF); _folderRAF = null; }

        var slots = _folderSlots[dir];
        var tops = _folderSlotTops[dir];
        var totalH = _folderTotalHeight[dir];
        if (!slots || !slots.length) { itemsEl.innerHTML = ''; return; }

        itemsEl.innerHTML = '';
        itemsEl.style.position = 'relative';
        itemsEl.style.height = totalH + 'px';
        itemsEl._virtualDir = dir;

        _folderFullyLoaded[dir] = true;
        ensureVirtualScroll();
        var playlistEl = document.getElementById(containerId + '_playlistItems');
        var containerRect = playlistEl ? playlistEl.getBoundingClientRect() : null;
        renderVirtualFolder(itemsEl, dir, playlistEl, containerRect);
    }

    function buildItemHtml(ii, prevIi) {
        var _mi = _itemMeta[ii] || {};
        var iisPt3 = !!_mi.pt3;
        var iisVt2 = !!_mi.vt2;
        var iisPsg = !!_mi.psg;
        var iisSnd = !!_mi.snd;
        var iisStc = !!_mi.stc;
        var iisAy = !!_mi.ay;
        var iisPt2 = !!_mi.pt2;
        var iisAsc = !!_mi.asc;
        var iisMtc = !!_mi.mtc;
        var iisTfc = !!_mi.tfc;
        var iisStp = !!_mi.stp;
        var iisPt1 = !!_mi.pt1;
        var idisplay = _trackDisplay(playlist[ii]);
        var iactive = (ii === currentId && playing) ? ' active' : '';
        var ifirstChar = idisplay.charAt(0).toUpperCase();
        var ialpha = (ifirstChar >= 'A' && ifirstChar <= 'Z') ? ifirstChar : '0';
        var iformat = iisPt3 ? 'pt3' : (iisVt2 ? 'vt2' : (iisPsg ? 'psg' : (iisSnd ? 'snd' : (iisStc ? 'stc' : (iisAy ? 'ay' : (iisPt2 ? 'pt2' : (iisAsc ? 'asc' : (iisTfc ? 'tfc' : (iisStp ? 'stp' : (iisPt1 ? 'pt1' : (iisMtc ? 'mtc' : 'fym')))))))))));
        var slots = [];
        if (playlist[ii].year && (prevIi === null || playlist[prevIi].year !== playlist[ii].year)) {
            slots.push({ type: 'year-sep', h: 28, html: '<div class="ayPlayer-playlist-year-sep" data-alpha="' + ialpha + '">' + playlist[ii].year + ' <span class="ayPlayer-playlist-year-line"></span></div>' });
        }
        if (playlist[ii].section && (prevIi === null || playlist[prevIi].section !== playlist[ii].section)) {
            slots.push({ type: 'auth-sep', h: 28, html: '<div class="ayPlayer-playlist-auth-sep" data-alpha="' + ialpha + '">' + playlist[ii].section + '</div>' });
        }
        var iplayIcon = '';
        var itimeStr = playlist[ii].time ? '<span class="ayPlayer-playlist-time">' + playlist[ii].time + '</span>' : '';
        var iisFav = favorites[ii] ? ' active' : '';
        var ifavStar = '<span class="ayPlayer-playlist-fav-star' + iisFav + '" onclick="event.stopPropagation(); AYPlayer.toggleFavorite(' + ii + ')"></span>';
        var iformatLabel = showFormat ? '<span class="ayPlayer-playlist-format">' + (iisPt3 ? 'PT3' : (iisVt2 ? 'VT2' : (iisPsg ? 'PSG' : (iisSnd ? 'SND' : (iisStc ? 'STC' : (iisAy ? 'AY' : (iisPt2 ? 'PT2' : (iisAsc ? 'ASC' : (iisTfc ? 'TFC' : (iisStp ? 'STP' : (iisPt1 ? 'PT1' : (iisMtc ? 'MTC' : 'FYM')))))))))))) + '</span>' : '';
        var ichLabel = (showChannels && playlist[ii].channels) ? '<span class="ayPlayer-playlist-format ayPlayer-playlist-ch ayPlayer-ch-' + playlist[ii].channels + '">' + playlist[ii].channels + 'ch</span>' : '';
            var istemBtn = '<button class="ayPlayer-stems-btn" onclick="event.stopPropagation(); AYPlayer.exportStems(' + ii + ')" title="Export stems (WAV 48kHz/24bit)"><img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2010584%209535%22%20fill%3D%22%23FFFFFF%22%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22M5272.36%207413.11c-228.26%2C0%20-398.8%2C-160.84%20-468.37%2C-321.9%20-98.64%2C-228.36%20-9.34%2C-453.08%20120.55%2C-583.13%20321.21%2C-321.61%20894.49%2C-92.78%20894.49%2C381.58%200%2C276.9%20-232.49%2C523.45%20-505.21%2C523.45l-41.45%200zm1606.32%20-572.69c0%2C-384.76%20-184.58%2C-749.63%20-359.87%2C-961.65%20-90.08%2C-108.95%20-223.38%2C-238.44%20-346.64%2C-314.09%20-73.92%2C-45.37%20-130.12%2C-78.26%20-210.66%2C-118.4%20-147.98%2C-73.74%20-140.04%2C-28.6%20-139.9%2C-108.84%202.8%2C-1565.94%200.01%2C-3134.3%200.01%2C-4700.7%200%2C-235.89%20-39.81%2C-381.62%20-168.67%2C-489.5%20-109.45%2C-91.63%20-287.32%2C-192.31%20-500.8%2C-125.68%20-167.04%2C52.13%20-285.49%2C153.85%20-350.22%2C307.91%20-62.51%2C148.78%20-39.97%2C413.65%20-39.97%2C620.82l0%204288.67c0%2C196.57%2015.92%2C135.31%20-128.13%2C200.95%20-296.74%2C135.21%20-534.43%2C352.71%20-698.95%2C619.91%20-412.72%2C670.31%20-239.98%2C1476.8%20229.24%2C1946.05%20137.85%2C137.86%20305.58%2C258.24%20489.14%2C337.41%2023.13%2C9.98%20103.21%2C31.78%20107.1%2C56.13%2010.78%2C67.43%201.59%2C245.4%201.59%2C327.5%200%2C266.4%20-22.17%2C403.2%2088.83%2C571.94%2074.76%2C113.65%20235.97%2C236.56%20421.56%2C236.56l33.68%200c228.83%2C0%20427.89%2C-176%20483.09%2C-351.23%2067.4%2C-213.92%2013.55%2C-540.54%2035.08%2C-799.33%20111.42%2C-25.96%20326.57%2C-156.27%20410.48%2C-219.14%20117.45%2C-88.01%20228.3%2C-193.5%20316.08%2C-310.96%20162.4%2C-217.31%20327.91%2C-549.1%20327.91%2C-926.23l0%20-88.11z%22%2F%3E%3Cpath%20d%3D%22M8466.86%202616.54c0%2C-125.65%2093.92%2C-290.36%20162.92%2C-347.54%2094.74%2C-78.52%20192.47%2C-144.81%20365.61%2C-144.81%20288.5%2C0%20525.94%2C233.83%20525.94%2C520.86l0%2018.14c0%2C274.03%20-239.55%2C515.68%20-512.99%2C515.68l-28.5%200c-150.85%2C0%20-274.91%2C-75.1%20-353.19%2C-149.46%20-69.73%2C-66.24%20-159.8%2C-210.56%20-159.8%2C-342.89l0%20-69.97zm546.67%206918.88c246.86%2C0%20447.32%2C-200.69%20494.89%2C-404.21%2027.95%2C-119.56%2015.5%2C-291.8%2015.5%2C-435.39l0%20-4490.79c-0.04%2C-62.85%20-6.94%2C-52.32%2043.51%2C-70.51%2060.45%2C-21.79%20173.78%2C-77.59%20225.48%2C-108.76%20189.72%2C-114.39%20342.87%2C-249%20473.5%2C-423.01%20243.78%2C-324.73%20421.84%2C-879.17%20248.83%2C-1410.23%20-150.28%2C-461.3%20-422.86%2C-762.62%20-825.34%2C-970.3%20-32.36%2C-16.7%20-138.5%2C-54.26%20-157.88%2C-67.54%20-15.78%2C-10.82%20-8.11%2C-181.07%20-8.11%2C-217.34%200%2C-143.86%205.98%2C-308.05%20-2.26%2C-446.04%20-13.86%2C-232.1%20-208.9%2C-446.41%20-419.49%2C-477.04%20-303.08%2C-44.07%20-489.73%2C99.72%20-586.73%2C292.74%20-59.42%2C118.24%20-51.17%2C223.6%20-51.17%2C397.12%200%2C50.03%204.63%2C434.33%20-2.59%2C445.71%20-0.26%2C0.73%20-196.86%2C88.86%20-216.5%2C99.6%20-189.04%2C103.42%20-388.08%2C263.54%20-512.52%2C435.81%20-166.41%2C230.36%20-325.45%2C541.6%20-325.45%2C936.47l0%2059.6c0%2C395.58%20159.8%2C707.68%20326.97%2C937.54%2082.95%2C114.06%20205.99%2C227.89%20319.23%2C313%2056.99%2C42.84%20128.94%2C88.2%20193.82%2C122.28%2034.9%2C18.33%2069.56%2C35.59%20106.24%2C51.82%2028.71%2C12.7%2089.44%2C32.94%20110.8%2C47.25l0%204788.8c0%2C141.51%2010.41%2C213.68%2060.28%2C307.68%2073.47%2C138.51%20242.17%2C285.74%20450.11%2C285.74l38.86%200z%22%2F%3E%3Cpath%20d%3D%22M2116.72%204769.95c0%2C469.65%20-573.71%2C701.9%20-899.68%2C373.81%20-128.93%2C-129.77%20-216.39%2C-364.76%20-112.06%2C-587.6%2079.88%2C-170.61%20244.9%2C-314.84%20488.38%2C-314.84%20286.74%2C0%20523.35%2C241.5%20523.35%2C528.63zm-505.22%204765.48c221.21%2C0%20397.94%2C-169.39%20466.27%2C-326.6%2046.78%2C-107.63%2038.95%2C-207.12%2038.95%2C-357.52l0%20-1977.19c0%2C-46.55%20-3.36%2C-576.02%201%2C-595.01%204.88%2C-21.28%20108.14%2C-52.64%20132.42%2C-64.5%20188.85%2C-92.24%20324.05%2C-185.45%20464.42%2C-325.85%20244.44%2C-244.49%20461.82%2C-632.75%20461.82%2C-1121.4%200%2C-382.89%20-148.22%2C-738.35%20-318.13%2C-951.57%20-101.19%2C-126.99%20-186.5%2C-219.57%20-317%2C-317.81%20-62.64%2C-47.16%20-121.34%2C-84.1%20-192.5%2C-123.6%20-76.29%2C-42.35%20-134.92%2C-62.4%20-217.47%2C-98.63%20-27.28%2C-11.97%20-14.54%2C-109.03%20-14.54%2C-146.12l0%20-2376.26c0%2C-267.86%2015.09%2C-368.31%20-101.55%2C-533.31%20-77.27%2C-109.3%20-230.8%2C-215.7%20-419.21%2C-215.59%20-205.89%2C0.12%20-337.07%2C90.86%20-428.05%2C206.74%20-115.59%2C147.24%20-110.84%2C268.07%20-110.84%2C521.42%200%2C236.7%205.81%2C2516.83%20-2.59%2C2534.33%20-4%2C5.46%20-191.61%2C88.18%20-215.34%2C100.76%20-204.37%2C108.28%20-367.55%2C252.04%20-510.4%2C432.75%20-162.38%2C205.41%20-328.73%2C563.7%20-328.73%2C930.6l0%2072.56c0%2C472.39%20238.55%2C861.81%20476.07%2C1099.38%20121.93%2C121.95%20296.7%2C247.52%20468.61%2C319.07%2024.05%2C10.01%2044.99%2C18.16%2069.95%2C28.51%2035.95%2C14.9%2043.11%2C7.51%2042.53%2C55.93%20-0.79%2C65.52%20-0.09%2C131.47%20-0.09%2C197.03l0%202363.3c0%2C164.84%20-2.14%2C226.89%2044.81%2C349.06%2059.41%2C154.58%20253.23%2C319.5%20468.17%2C319.5l41.45%200z%22%2F%3E%3C%2Fsvg%3E" alt="Stems" width="16" height="16" class="ayPlayer-btn-icon"></button>';
        var imixBtn = '<button class="ayPlayer-mix-btn" onclick="event.stopPropagation(); AYPlayer.exportMix(' + ii + ')" title="Export stereo mix (WAV 48kHz/24bit)"><svg width="16" height="16" viewBox="0 0 41634 41634" fill="currentColor"><rect x="2997" y="16905" width="2776" height="7823" rx="1014" ry="2859"/><rect x="7692" y="7375" width="2776" height="26884" rx="1014" ry="9824"/><rect x="12387" y="13287" width="2776" height="15059" rx="1014" ry="5503"/><rect x="17082" y="18399" width="2776" height="4835" rx="1014" ry="1767"/><rect x="21777" y="2396" width="2776" height="36842" rx="1014" ry="13463"/><rect x="26471" y="15404" width="2776" height="10826" rx="1014" ry="3956"/><rect x="31166" y="17760" width="2776" height="6115" rx="1014" ry="2234"/><rect x="35861" y="18948" width="2776" height="3737" rx="1014" ry="1366"/></svg></button>';
        var ipt3Btn = '';
            if (iisPt3 || iisVt2 || iisPsg || iisSnd || iisStc || iisAy || iisPt2 || iisAsc || iisMtc || iisTfc || iisStp || iisPt1) {
            ipt3Btn = '<a class="ayPlayer-pt3-btn" href="' + playlist[ii].file.replace(/#/g, '%23') + '" download title="Download track" onclick="event.stopPropagation()"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></a>';
        }
        var ishareBtn = '<button class="ayPlayer-share-btn" onclick="event.stopPropagation(); AYPlayer.copyTrackLink(' + ii + ')" title="Copy track link"><img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20512%20512%22%20fill%3D%22%23FFFFFF%22%3E%3Cpath%20d%3D%22M469%20299c0-4%200-8%200-11%200-65-29-126-79-166-9-7-23-6-30%203s-6%2023%203%2030c40%2032%2064%2081%2064%20133-48%200-86%2038-86%2085s38%2085%2085%2085%2086-38%2086-85c0-32-18-60-43-74zM427%20416c-24%200-43-19-43-43s19-43%2043-43%2043%2019%2043%2043-19%2043-43%2043zM64%20266c12%203%2023-4%2026-16%2011-50%2045-92%2090-115%2014%2027%2043%2046%2076%2046%2047%200%2085-38%2085-85S303%2011%20256%2011c-46%200-83%2036-85%2082C109%20119%2063%20174%2048%20241c-3%2011%205%2023%2016%2025zM256%2053c24%200%2043%2019%2043%2043s-19%2043-43%2043c-21%200-38-15-42-36%200%200%200%200%200%200%200-2%200-4%200-6%200-24%2019-43%2042-44zM313%20449c-18%206-37%2010-57%2010-37%200-73-12-102-34%2011-14%2017-32%2017-51%200-47-38-85-85-85S0%20326%200%20373s38%2085%2085%2085c12%200%2024-2%2034-7%2038%2032%2086%2050%20137%2050%2024%200%2048-4%2071-12%2011-4%2017-16%2013-27s-16-17-27-13zM43%20373c0-24%2019-43%2042-43s43%2019%2043%2043-19%2043-43%2043S43%20397%2043%20373z%22%2F%3E%3C%2Fsvg%3E" alt="Link" width="16" height="16" class="ayPlayer-btn-icon"></button>';
        slots.push({ type: 'item', h: 30, id: ii, html: '<div class="ayPlayer-playlist-item' + iactive + '" data-id="' + ii + '" data-format="' + iformat + '" data-ch="' + (playlist[ii].channels || 3) + '" data-alpha="' + ialpha + '"' + (favorites[ii] ? ' data-fav="1"' : '') + ' onclick="AYPlayer.selectTrack(' + ii + ')" oncontextmenu="event.preventDefault(); event.stopPropagation(); AYPlayer.copyTrackLink(' + ii + ')">' + iplayIcon + ifavStar + iformatLabel + ichLabel + '<span class="ayPlayer-playlist-item-name">' + idisplay + '</span>' + ipt3Btn + istemBtn + imixBtn + ishareBtn + itimeStr + '</div>' });
        return slots;
    }

    function buildItemSlots(ids, fi) {
        var ii = ids[fi];
        var prev = fi > 0 ? ids[fi - 1] : null;
        var idisplay = _trackDisplay(playlist[ii]);
        var ifirstChar = idisplay.charAt(0).toUpperCase();
        var ialpha = (ifirstChar >= 'A' && ifirstChar <= 'Z') ? ifirstChar : '0';
        var slots = [];
        if (playlist[ii].year && (prev === null || playlist[prev].year !== playlist[ii].year)) {
            slots.push({ type: 'year-sep', h: 28, html: '<div class="ayPlayer-playlist-year-sep" data-alpha="' + ialpha + '">' + playlist[ii].year + ' <span class="ayPlayer-playlist-year-line"></span></div>' });
        }
        if (playlist[ii].section && (prev === null || playlist[prev].section !== playlist[ii].section)) {
            slots.push({ type: 'auth-sep', h: 28, html: '<div class="ayPlayer-playlist-auth-sep" data-alpha="' + ialpha + '">' + playlist[ii].section + '</div>' });
        }
        slots.push({ type: 'item', h: 30, id: ii, html: (function(ii, prev) {
            return function() {
                var ss = buildItemHtml(ii, prev);
                return ss[ss.length - 1].html;
            };
        })(ii, prev) });
        return slots;
    }

    function buildFolderSlots(ids) {
        var allSlots = [];
        for (var fi = 0; fi < ids.length; fi++) {
            var itemSlots = buildItemSlots(ids, fi);
            for (var si = 0; si < itemSlots.length; si++) allSlots.push(itemSlots[si]);
        }
        return allSlots;
    }

    function buildFolderItemsHtml(ids) {
        var html = '';
        for (var fi = 0; fi < ids.length; fi++) {
            var ii = ids[fi];
            var iisPt3 = /\.pt3$/i.test(playlist[ii].file);
            var iisVt2 = isVt2File(playlist[ii].file);
            var iisPsg = isPsgFile(playlist[ii].file);
            var iisSnd = isSndFile(playlist[ii].file);
            var iisStc = isStcFile(playlist[ii].file);
            var iisAy = isAyFile(playlist[ii].file);
            var iisPt2 = isPt2File(playlist[ii].file);
        var iisAsc = isAscFile(playlist[ii].file);
        var iisMtc = isMtcFile(playlist[ii].file);
        var iisTfc = isTfcFile(playlist[ii].file);
        var iisStp = isStpFile(playlist[ii].file);
        var iisPt1 = isPt1File(playlist[ii].file);
            var idisplay = _trackDisplay(playlist[ii]);
            var iactive = (ii === currentId && playing) ? ' active' : '';
            var ifirstChar = idisplay.charAt(0).toUpperCase();
            var ialpha = (ifirstChar >= 'A' && ifirstChar <= 'Z') ? ifirstChar : '0';
            var iformat = iisPt3 ? 'pt3' : (iisVt2 ? 'vt2' : (iisPsg ? 'psg' : (iisSnd ? 'snd' : (iisStc ? 'stc' : (iisAy ? 'ay' : (iisPt2 ? 'pt2' : (iisAsc ? 'asc' : (iisTfc ? 'tfc' : (iisStp ? 'stp' : (iisPt1 ? 'pt1' : (iisMtc ? 'mtc' : 'fym')))))))))));
            if (playlist[ii].year && (!fi || playlist[ids[fi - 1]].year !== playlist[ii].year)) {
                html += '<div class="ayPlayer-playlist-year-sep" data-alpha="' + ialpha + '">' + playlist[ii].year + ' <span class="ayPlayer-playlist-year-line"></span></div>';
            }
            if (playlist[ii].section && (!fi || playlist[ids[fi - 1]].section !== playlist[ii].section)) {
                html += '<div class="ayPlayer-playlist-auth-sep" data-alpha="' + ialpha + '">' + playlist[ii].section + '</div>';
            }
            var iplayIcon = '';
            var itimeStr = playlist[ii].time ? '<span class="ayPlayer-playlist-time">' + playlist[ii].time + '</span>' : '';
            var iisFav = favorites[ii] ? ' active' : '';
            var ifavStar = '<span class="ayPlayer-playlist-fav-star' + iisFav + '" onclick="event.stopPropagation(); AYPlayer.toggleFavorite(' + ii + ')"></span>';
        var iformatLabel = showFormat ? '<span class="ayPlayer-playlist-format">' + (iisPt3 ? 'PT3' : (iisVt2 ? 'VT2' : (iisPsg ? 'PSG' : (iisSnd ? 'SND' : (iisStc ? 'STC' : (iisAy ? 'AY' : (iisPt2 ? 'PT2' : (iisAsc ? 'ASC' : (iisTfc ? 'TFC' : (iisStp ? 'STP' : (iisPt1 ? 'PT1' : (iisMtc ? 'MTC' : 'FYM')))))))))))) + '</span>' : '';
            var ichLabel = (showChannels && playlist[ii].channels) ? '<span class="ayPlayer-playlist-format ayPlayer-playlist-ch ayPlayer-ch-' + playlist[ii].channels + '">' + playlist[ii].channels + 'ch</span>' : '';
            var istemBtn = '<button class="ayPlayer-stems-btn" onclick="event.stopPropagation(); AYPlayer.exportStems(' + ii + ')" title="Export stems (WAV 48kHz/24bit)"><img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2010584%209535%22%20fill%3D%22%23FFFFFF%22%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22M5272.36%207413.11c-228.26%2C0%20-398.8%2C-160.84%20-468.37%2C-321.9%20-98.64%2C-228.36%20-9.34%2C-453.08%20120.55%2C-583.13%20321.21%2C-321.61%20894.49%2C-92.78%20894.49%2C381.58%200%2C276.9%20-232.49%2C523.45%20-505.21%2C523.45l-41.45%200zm1606.32%20-572.69c0%2C-384.76%20-184.58%2C-749.63%20-359.87%2C-961.65%20-90.08%2C-108.95%20-223.38%2C-238.44%20-346.64%2C-314.09%20-73.92%2C-45.37%20-130.12%2C-78.26%20-210.66%2C-118.4%20-147.98%2C-73.74%20-140.04%2C-28.6%20-139.9%2C-108.84%202.8%2C-1565.94%200.01%2C-3134.3%200.01%2C-4700.7%200%2C-235.89%20-39.81%2C-381.62%20-168.67%2C-489.5%20-109.45%2C-91.63%20-287.32%2C-192.31%20-500.8%2C-125.68%20-167.04%2C52.13%20-285.49%2C153.85%20-350.22%2C307.91%20-62.51%2C148.78%20-39.97%2C413.65%20-39.97%2C620.82l0%204288.67c0%2C196.57%2015.92%2C135.31%20-128.13%2C200.95%20-296.74%2C135.21%20-534.43%2C352.71%20-698.95%2C619.91%20-412.72%2C670.31%20-239.98%2C1476.8%20229.24%2C1946.05%20137.85%2C137.86%20305.58%2C258.24%20489.14%2C337.41%2023.13%2C9.98%20103.21%2C31.78%20107.1%2C56.13%2010.78%2C67.43%201.59%2C245.4%201.59%2C327.5%200%2C266.4%20-22.17%2C403.2%2088.83%2C571.94%2074.76%2C113.65%20235.97%2C236.56%20421.56%2C236.56l33.68%200c228.83%2C0%20427.89%2C-176%20483.09%2C-351.23%2067.4%2C-213.92%2013.55%2C-540.54%2035.08%2C-799.33%20111.42%2C-25.96%20326.57%2C-156.27%20410.48%2C-219.14%20117.45%2C-88.01%20228.3%2C-193.5%20316.08%2C-310.96%20162.4%2C-217.31%20327.91%2C-549.1%20327.91%2C-926.23l0%20-88.11z%22%2F%3E%3Cpath%20d%3D%22M8466.86%202616.54c0%2C-125.65%2093.92%2C-290.36%20162.92%2C-347.54%2094.74%2C-78.52%20192.47%2C-144.81%20365.61%2C-144.81%20288.5%2C0%20525.94%2C233.83%20525.94%2C520.86l0%2018.14c0%2C274.03%20-239.55%2C515.68%20-512.99%2C515.68l-28.5%200c-150.85%2C0%20-274.91%2C-75.1%20-353.19%2C-149.46%20-69.73%2C-66.24%20-159.8%2C-210.56%20-159.8%2C-342.89l0%20-69.97zm546.67%206918.88c246.86%2C0%20447.32%2C-200.69%20494.89%2C-404.21%2027.95%2C-119.56%2015.5%2C-291.8%2015.5%2C-435.39l0%20-4490.79c-0.04%2C-62.85%20-6.94%2C-52.32%2043.51%2C-70.51%2060.45%2C-21.79%20173.78%2C-77.59%20225.48%2C-108.76%20189.72%2C-114.39%20342.87%2C-249%20473.5%2C-423.01%20243.78%2C-324.73%20421.84%2C-879.17%20248.83%2C-1410.23%20-150.28%2C-461.3%20-422.86%2C-762.62%20-825.34%2C-970.3%20-32.36%2C-16.7%20-138.5%2C-54.26%20-157.88%2C-67.54%20-15.78%2C-10.82%20-8.11%2C-181.07%20-8.11%2C-217.34%200%2C-143.86%205.98%2C-308.05%20-2.26%2C-446.04%20-13.86%2C-232.1%20-208.9%2C-446.41%20-419.49%2C-477.04%20-303.08%2C-44.07%20-489.73%2C99.72%20-586.73%2C292.74%20-59.42%2C118.24%20-51.17%2C223.6%20-51.17%2C397.12%200%2C50.03%204.63%2C434.33%20-2.59%2C445.71%20-0.26%2C0.73%20-196.86%2C88.86%20-216.5%2C99.6%20-189.04%2C103.42%20-388.08%2C263.54%20-512.52%2C435.81%20-166.41%2C230.36%20-325.45%2C541.6%20-325.45%2C936.47l0%2059.6c0%2C395.58%20159.8%2C707.68%20326.97%2C937.54%2082.95%2C114.06%20205.99%2C227.89%20319.23%2C313%2056.99%2C42.84%20128.94%2C88.2%20193.82%2C122.28%2034.9%2C18.33%2069.56%2C35.59%20106.24%2C51.82%2028.71%2C12.7%2089.44%2C32.94%20110.8%2C47.25l0%204788.8c0%2C141.51%2010.41%2C213.68%2060.28%2C307.68%2073.47%2C138.51%20242.17%2C285.74%20450.11%2C285.74l38.86%200z%22%2F%3E%3Cpath%20d%3D%22M2116.72%204769.95c0%2C469.65%20-573.71%2C701.9%20-899.68%2C373.81%20-128.93%2C-129.77%20-216.39%2C-364.76%20-112.06%2C-587.6%2079.88%2C-170.61%20244.9%2C-314.84%20488.38%2C-314.84%20286.74%2C0%20523.35%2C241.5%20523.35%2C528.63zm-505.22%204765.48c221.21%2C0%20397.94%2C-169.39%20466.27%2C-326.6%2046.78%2C-107.63%2038.95%2C-207.12%2038.95%2C-357.52l0%20-1977.19c0%2C-46.55%20-3.36%2C-576.02%201%2C-595.01%204.88%2C-21.28%20108.14%2C-52.64%20132.42%2C-64.5%20188.85%2C-92.24%20324.05%2C-185.45%20464.42%2C-325.85%20244.44%2C-244.49%20461.82%2C-632.75%20461.82%2C-1121.4%200%2C-382.89%20-148.22%2C-738.35%20-318.13%2C-951.57%20-101.19%2C-126.99%20-186.5%2C-219.57%20-317%2C-317.81%20-62.64%2C-47.16%20-121.34%2C-84.1%20-192.5%2C-123.6%20-76.29%2C-42.35%20-134.92%2C-62.4%20-217.47%2C-98.63%20-27.28%2C-11.97%20-14.54%2C-109.03%20-14.54%2C-146.12l0%20-2376.26c0%2C-267.86%2015.09%2C-368.31%20-101.55%2C-533.31%20-77.27%2C-109.3%20-230.8%2C-215.7%20-419.21%2C-215.59%20-205.89%2C0.12%20-337.07%2C90.86%20-428.05%2C206.74%20-115.59%2C147.24%20-110.84%2C268.07%20-110.84%2C521.42%200%2C236.7%205.81%2C2516.83%20-2.59%2C2534.33%20-4%2C5.46%20-191.61%2C88.18%20-215.34%2C100.76%20-204.37%2C108.28%20-367.55%2C252.04%20-510.4%2C432.75%20-162.38%2C205.41%20-328.73%2C563.7%20-328.73%2C930.6l0%2072.56c0%2C472.39%20238.55%2C861.81%20476.07%2C1099.38%20121.93%2C121.95%20296.7%2C247.52%20468.61%2C319.07%2024.05%2C10.01%2044.99%2C18.16%2069.95%2C28.51%2035.95%2C14.9%2043.11%2C7.51%2042.53%2C55.93%20-0.79%2C65.52%20-0.09%2C131.47%20-0.09%2C197.03l0%202363.3c0%2C164.84%20-2.14%2C226.89%2044.81%2C349.06%2059.41%2C154.58%20253.23%2C319.5%20468.17%2C319.5l41.45%200z%22%2F%3E%3C%2Fsvg%3E" alt="Stems" width="16" height="16" class="ayPlayer-btn-icon"></button>';
            var imixBtn = '<button class="ayPlayer-mix-btn" onclick="event.stopPropagation(); AYPlayer.exportMix(' + ii + ')" title="Export stereo mix (WAV 48kHz/24bit)"><svg width="16" height="16" viewBox="0 0 41634 41634" fill="currentColor"><rect x="2997" y="16905" width="2776" height="7823" rx="1014" ry="2859"/><rect x="7692" y="7375" width="2776" height="26884" rx="1014" ry="9824"/><rect x="12387" y="13287" width="2776" height="15059" rx="1014" ry="5503"/><rect x="17082" y="18399" width="2776" height="4835" rx="1014" ry="1767"/><rect x="21777" y="2396" width="2776" height="36842" rx="1014" ry="13463"/><rect x="26471" y="15404" width="2776" height="10826" rx="1014" ry="3956"/><rect x="31166" y="17760" width="2776" height="6115" rx="1014" ry="2234"/><rect x="35861" y="18948" width="2776" height="3737" rx="1014" ry="1366"/></svg></button>';
            var ipt3Btn = '';
        if (iisPt3 || iisVt2 || iisPsg || iisSnd || iisStc || iisAy || iisPt2 || iisAsc || iisMtc || iisTfc || iisStp || iisPt1) {
                ipt3Btn = '<a class="ayPlayer-pt3-btn" href="' + playlist[ii].file.replace(/#/g, '%23') + '" download title="Download track" onclick="event.stopPropagation()"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></a>';
            }
            var ishareBtn = '<button class="ayPlayer-share-btn" onclick="event.stopPropagation(); AYPlayer.copyTrackLink(' + ii + ')" title="Copy track link"><img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20512%20512%22%20fill%3D%22%23FFFFFF%22%3E%3Cpath%20d%3D%22M469%20299c0-4%200-8%200-11%200-65-29-126-79-166-9-7-23-6-30%203s-6%2023%203%2030c40%2032%2064%2081%2064%20133-48%200-86%2038-86%2085s38%2085%2085%2085%2086-38%2086-85c0-32-18-60-43-74zM427%20416c-24%200-43-19-43-43s19-43%2043-43%2043%2019%2043%2043-19%2043-43%2043zM64%20266c12%203%2023-4%2026-16%2011-50%2045-92%2090-115%2014%2027%2043%2046%2076%2046%2047%200%2085-38%2085-85S303%2011%20256%2011c-46%200-83%2036-85%2082C109%20119%2063%20174%2048%20241c-3%2011%205%2023%2016%2025zM256%2053c24%200%2043%2019%2043%2043s-19%2043-43%2043c-21%200-38-15-42-36%200%200%200%200%200%200%200-2%200-4%200-6%200-24%2019-43%2042-44zM313%20449c-18%206-37%2010-57%2010-37%200-73-12-102-34%2011-14%2017-32%2017-51%200-47-38-85-85-85S0%20326%200%20373s38%2085%2085%2085c12%200%2024-2%2034-7%2038%2032%2086%2050%20137%2050%2024%200%2048-4%2071-12%2011-4%2017-16%2013-27s-16-17-27-13zM43%20373c0-24%2019-43%2042-43s43%2019%2043%2043-19%2043-43%2043S43%20397%2043%20373z%22%2F%3E%3C%2Fsvg%3E" alt="Link" width="16" height="16" class="ayPlayer-btn-icon"></button>';
            html += '<div class="ayPlayer-playlist-item' + iactive + '" data-id="' + ii + '" data-format="' + iformat + '" data-ch="' + (playlist[ii].channels || 3) + '" data-alpha="' + ialpha + '"' + (favorites[ii] ? ' data-fav="1"' : '') + ' onclick="AYPlayer.selectTrack(' + ii + ')" oncontextmenu="event.preventDefault(); event.stopPropagation(); AYPlayer.copyTrackLink(' + ii + ')">' + iplayIcon + ifavStar + iformatLabel + ichLabel + '<span class="ayPlayer-playlist-item-name">' + idisplay + '</span>' + ipt3Btn + istemBtn + imixBtn + ishareBtn + itimeStr + '</div>';
        }
        return html;
    }

    function _startFade(target, duration, onDone) {
        _fadeTarget = target;
        _fadeDuration = duration * 1000;
        _fadeStartTime = performance.now();
        _fadeStartVal = _scopeFade;
        _fadeOnDone = onDone;
    }

    function _applyFadeGain() {
        if (_gainNode && audioContext && audioContext.state === 'running') {
            var now = audioContext.currentTime;
            _gainNode.gain.cancelScheduledValues(now);
            _gainNode.gain.setValueAtTime(_gainNode.gain.value, now);
            _gainNode.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, _scopeFade)), now + 0.016);
        }
    }

    var _awVersion = '334';

    function _stopStreamer() {
        if (_streamer) {
            try { _streamer.postMessage({ type: 'stop' }); } catch(e) {}
            try { _streamer.terminate(); } catch(e) {}
        }
        _streamer = null;
        _streamMode = false;
        _streamerDumpRef = null;
        _chunkQueue.length = 0;
        _streamInQueue = 0;
        _streamRenderDone = false;
        if (_waveWorker) {
            try { _waveWorker.terminate(); } catch(e) {}
            _waveWorker = null;
        }
    }

    function _streamGo() {
        if (!_streamer || !_streamMode) return;
        if (_streamRenderDone) return;
        if (_streamInQueue < _streamMaxChunks) {
            try { _streamer.postMessage({ type: 'go' }); } catch(e) {}
        }
    }

    function _handleStreamerMessage(e) {
        var msg = e.data;
        if (!msg) return;
        if (_debug) _dbgMsgCount++;
        if (msg.type === 'chunk') {
            if (msg.gen !== _streamGen || !_workletNode || !_streamMode) return;
            var _sc = new Float32Array(msg.scope);
            _chunkQueue.push({ startPos: msg.startPos, endPos: msg.endPos, scope: _sc, silent: _analyzeChunkSilence(_sc, _chipCount * 3) });
            _workletNode.port.postMessage({ type: 'audio', left: msg.left, right: msg.right }, [msg.left, msg.right]);
            _streamInQueue++;
            if (msg.finished) _streamRenderDone = true;
            _streamGo();
        } else if (msg.type === 'renderDone') {
            if (msg.gen === _streamGen) {
                _streamRenderDone = true;
                if (_workletNode) _workletNode.port.postMessage({ type: 'endOfTrack' });
            }
        } else if (msg.type === 'loaded') {
            loadingNext = false;
        } else if (msg.type === 'error') {
            console.error('Streamer:', msg.message);
            showToast('Ошибка рендера: ' + msg.message);
        }
    }

    function _streamLoad(k) {
        if (!_streamer || !_workletNode || !_streamMode || !_dumpData) {
            return;
        }
        _streamerDumpRef = _dumpData.dump;
        _streamGen++;
        _streamRenderDone = false;
        _chunkQueue.length = 0;
        _streamInQueue = 0;
        _streamChunkCount = 0;
        _streamUnderflowShown = false;
        _scopePosTime = -1;
        _renderSR = 48000;
        _renderFrameRate = intFreqSelect || _dumpData.frameRate || 50;
        _streamEndFrame = _dumpData.dumpLen > 0 ? _dumpData.dumpLen - 1 : 0;
        var dl = _dumpData.dumpLen || 1;
        _workletNode.port.postMessage({ type: 'clear', base: Math.round(k * dl) });
        _workletNode.port.postMessage({ type: 'frameRate', frameRate: intFreqSelect || _dumpData.frameRate });
        _workletNode.port.postMessage({ type: 'volume', volume: volume });
        _streamer.postMessage({
            type: 'load',
            gen: _streamGen,
            sampleRate: _renderSR,
            dump: _dumpData.dump,
            isTurbo: _dumpData.isTurbo,
            chipCount: _dumpData.chipCount || 1,
            isYM: isYM,
            clock: clockSelect || _dumpData.clock,
            frameRate: intFreqSelect || _dumpData.frameRate,
            volume: 1,
            repeat: repeat,
            loopFrame: _dumpData.loopFrame,
            chipKinds: _dumpData.chipKinds || null,
            opnClock: _dumpData.opnClock || 0,
            pan: _getPanData(),
            firEnabled: firEnabled,
            firstChunkSeconds: _renderFirstChunkSeconds,
            chunkSeconds: _renderChunkSeconds,
            progress: k
        });
    }

    function _streamReRender() {
        if (!_streamMode || !_dumpData) return;
        var dl = _dumpData.dumpLen || 1;
        _streamLoad(playFrame / dl);
    }

    function _streamSeek(k) {
        if (!_streamer || !_workletNode || !_streamMode || !_dumpData) {
            return;
        }
        if (_streamerDumpRef !== _dumpData.dump) {
            _streamLoad(k);
            return;
        }
        _streamGen++;
        _streamRenderDone = false;
        _chunkQueue.length = 0;
        _streamInQueue = 0;
        _streamChunkCount = 0;
        _streamUnderflowShown = false;
        _scopePosTime = -1;
        var dl = _dumpData.dumpLen || 1;
        _workletNode.port.postMessage({ type: 'clear', base: Math.round(k * dl) });
        _workletNode.port.postMessage({ type: 'frameRate', frameRate: intFreqSelect || _dumpData.frameRate });
        _workletNode.port.postMessage({ type: 'volume', volume: volume });
        _streamer.postMessage({ type: 'seek', gen: _streamGen, progress: k });
    }

    function _wrapStreamFrame(raw) {
        if (repeat && _dumpData) {
            var dl = _dumpData.dumpLen;
            var lf = _dumpData.loopFrame;
            if (dl > 0 && lf >= 0 && lf < dl && raw >= dl) {
                var cyc = dl - lf;
                return lf + ((raw - dl) % cyc);
            }
        }
        return raw;
    }

    function _paceScope(frame) {
        var chCount = _chipCount * 3;
        if (chCount <= 0 || _chunkQueue.length === 0) return;
        var dl = _dumpData ? _dumpData.dumpLen : 0;
        var lf = repeat && _dumpData ? (_dumpData.loopFrame || 0) : 0;
        var sr = _renderSR || 48000;
        var fr = _renderFrameRate || 50;
        var entry = null;
        var entryOff = -1;
        for (var qi = 0; qi < _chunkQueue.length; qi++) {
            var e = _chunkQueue[qi];
            var sp = e.startPos;
            var ep = e.endPos;
            if (sp < 0 || ep < 0) continue;
            var off = -1;
            if (sp <= ep) {
                if (frame >= sp && frame < ep) off = frame - sp;
            } else {
                if (frame >= sp) off = frame - sp;
                else if (frame < ep) off = (dl - sp) + (frame - lf);
            }
            if (off >= 0) { entry = e; entryOff = off; break; }
        }
        if (!entry) return;
        if (qi > 0) _chunkQueue.splice(0, qi);
        var bins = 24;
        var points = entry.scope.length / chCount;
        if (points < bins) return;
        var frames = entry.scope.length / (bins * chCount);
        var totalFrames = (sp <= ep) ? (ep - sp) : ((dl - sp) + (ep - lf));
        var samplesPerBf = Math.max(1, totalFrames * sr / fr / frames);
        var bf = Math.floor(entryOff * sr / fr / samplesPerBf);
        if (bf < 0) bf = 0;
        if (bf >= frames) bf = Math.max(0, Math.floor(frames) - 1);
        for (var ch = 0; ch < chCount; ch++) {
            var buf = scopeBuf[ch];
            buf.length = bins;
            for (var b = 0; b < bins; b++) {
                buf[b] = entry.scope[(bf * bins + b) * chCount + ch];
            }
        }
        _scopeDirty = true;
    }

    function _checkStreamEnd(frame) {
        if (!_streamRenderDone || !_dumpData || repeat) return;
        var end = _streamEndFrame;
        if (end > 0 && frame >= end && !loadingNext) {
            loadingNext = true;
            trackEndedFlag = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            api.next();
        }
    }

    function _analyzeChunkSilence(scope, chCount) {
        if (chCount <= 0 || !scope || scope.length === 0) return null;
        var points = scope.length / chCount;
        var n = Math.ceil(points);
        var res = new Uint8Array(n);
        for (var i = 0; i < n; i++) {
            var base = i * chCount;
            var mx = 0;
            for (var c = 0; c < chCount; c++) {
                var v = scope[base + c];
                if (!(v === v)) { mx = 1; break; }
                if (v < 0) v = -v;
                if (v > mx) mx = v;
            }
            res[i] = mx < _SILENCE_PEAK ? 1 : 0;
        }
        return res;
    }

    function _checkSilenceSkip(frame) {
        if (_silenceSkipDone || loadingNext || !playing || !_dumpData || _chunkQueue.length === 0) return;
        var chCount = _chipCount * 3;
        if (chCount <= 0) return;
        var dl = _dumpData.dumpLen;
        var lf = repeat && _dumpData ? (_dumpData.loopFrame || 0) : 0;
        var found = false;
        var silentNow = false;
        for (var qi = 0; qi < _chunkQueue.length; qi++) {
            var e = _chunkQueue[qi];
            var sp = e.startPos, ep = e.endPos;
            if (sp < 0 || ep < 0) continue;
            var off = -1;
            if (sp <= ep) {
                if (frame >= sp && frame < ep) off = frame - sp;
            } else {
                if (frame >= sp) off = frame - sp;
                else if (frame < ep) off = (dl - sp) + (frame - lf);
            }
            if (off >= 0) {
                if (e.silent) {
                    var sr = _renderSR || 48000;
                    var fr = _renderFrameRate || 50;
                    var pi = Math.floor(off * sr / fr / 8);
                    if (pi < 0) pi = 0;
                    if (pi >= e.silent.length) pi = e.silent.length - 1;
                    silentNow = e.silent[pi] === 1;
                }
                found = true;
                break;
            }
        }
        if (!found) return;
        var now = performance.now();
        var dt = _silenceLastCheck >= 0 ? now - _silenceLastCheck : 16;
        _silenceLastCheck = now;
        if (silentNow) {
            _silenceRunMs += dt;
            if (_silenceHeard && _silenceRunMs >= _SILENCE_SKIP_MS) {
                _silenceSkipDone = true;
                loadingNext = true;
                trackEndedFlag = false;
                if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
                api.next();
            }
        } else {
            _silenceRunMs = 0;
            _silenceHeard = true;
        }
    }

    function _setupContext(callback) {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) { callback(); return; }
        _scopeFade = 1.0;
        _fadeTarget = -1;
        _fadeOnDone = null;
        var ctx;
        try {
            ctx = new AudioCtx({ sampleRate: 48000 });
        } catch(e) {
            ctx = new AudioCtx();
        }
        audioContext = ctx;
        try { window.__ayAudioCtx = ctx; } catch(e) {}
        if (ctx.state === 'suspended') ctx.resume();
        var canStream = (typeof Worker !== 'undefined');
        if (canStream) {
            try {
                _streamer = new Worker('player/streamer.js?v=' + _awVersion);
                _streamer.onmessage = _handleStreamerMessage;
                _streamer.onerror = function(err) {
                    console.error('Streamer worker error:', err && err.message);
                };
            } catch(e) {
                console.error('Streamer worker failed:', e);
                _streamer = null;
            }
            if (!_streamer) canStream = false;
        }
        if (canStream) {
            ctx.audioWorklet.addModule('player/player_worklet.js?v=' + _awVersion).then(function() {
                if (ctx !== audioContext) { try { ctx.close(); } catch(e) {} callback(); return; }
                _workletNode = new AudioWorkletNode(ctx, 'ay-player-processor', { outputChannelCount: [2] });
                _workletNode.port.onmessage = handleWorkletMessage;
                _gainNode = ctx.createGain();
                _roomNode = ctx.createConvolver();
                _roomNode.buffer = _makeRoomIR(ctx);
                _roomGain = ctx.createGain();
                _roomGain.gain.value = roomEnabled ? 0.3 : 0;
                _workletNode.connect(_gainNode);
                _workletNode.connect(_roomNode);
                _roomNode.connect(_roomGain);
                _roomGain.connect(_gainNode);
                _gainNode.connect(ctx.destination);
                _workletNode.port.postMessage({ type: 'fps', fps: scopeFps });
                _workletNode.port.postMessage({ type: 'xf', enabled: xfEnabled });
                _streamMode = true;
                _streamRenderDone = false;
                _chunkQueue.length = 0;
                _streamInQueue = 0;
                _streamChunkCount = 0;
                callback();
            }).catch(function(err) {
                console.error('Stream worklet failed, falling back:', err);
                _legacySetupContext(callback, ctx);
            });
        } else {
            _legacySetupContext(callback, ctx);
        }
    }

    function _legacySetupContext(callback, ctx) {
        if (ctx !== audioContext) { try { ctx.close(); } catch(e) {} callback(); return; }
        ctx.audioWorklet.addModule('player/ayumi.js?v=' + _awVersion).then(function() {
            return ctx.audioWorklet.addModule('player/opn.js?v=' + _awVersion);
        }).then(function() {
            return ctx.audioWorklet.addModule('player/processor.js?v=' + _awVersion);
        }).then(function() {
            if (ctx !== audioContext) { try { ctx.close(); } catch(e) {} callback(); return; }
            _workletNode = new AudioWorkletNode(ctx, 'ay-processor', { outputChannelCount: [2] });
            _workletNode.port.onmessage = handleWorkletMessage;
            _gainNode = ctx.createGain();
            _roomNode = ctx.createConvolver();
            _roomNode.buffer = _makeRoomIR(ctx);
            _roomGain = ctx.createGain();
            _roomGain.gain.value = roomEnabled ? 0.3 : 0;
            _workletNode.connect(_gainNode);
            _workletNode.connect(_roomNode);
            _roomNode.connect(_roomGain);
            _roomGain.connect(_gainNode);
            _gainNode.connect(ctx.destination);
            _workletNode.port.postMessage({ type: 'fir', enabled: firEnabled });
            _workletNode.port.postMessage({ type: 'xf', enabled: xfEnabled });
            _workletNode.port.postMessage({ type: 'fps', fps: scopeFps });
            _streamMode = false;
            callback();
        }).catch(function(err) {
            console.error('AudioWorklet failed:', err);
            callback();
        });
    }

    var _autoplayPromptShown = false;
    function _showAutoplayPrompt() {
        if (_autoplayPromptShown) return;
        if (!audioContext || audioContext.state !== 'suspended') return;
        _autoplayPromptShown = true;
        var root = document.getElementById(containerId);
        var overlay = document.createElement('div');
        overlay.className = 'ayPlayer-autoplay';
        overlay.innerHTML = '<div class="ayPlayer-autoplay-inner"><div class="ayPlayer-autoplay-play"></div><div>Нажмите, чтобы включить звук</div></div>';
        root.appendChild(overlay);
        overlay.addEventListener('pointerdown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            _autoplayPromptShown = false;
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (audioContext && audioContext.state === 'suspended') audioContext.resume();
        });
    }

    function _resendToWorklet() {
        if (!_workletNode || !_dumpData) return;
        if (_streamMode) {
            var dl0 = _dumpData.dumpLen || 1;
            _streamLoad(playFrame / dl0);
            return;
        }
        var pan = _getPanData();
        _workletNode.port.postMessage({
            type: 'load',
            dump: _dumpData.dump,
            isTurbo: _dumpData.isTurbo,
            chipCount: _dumpData.chipCount || 1,
            isYM: isYM,
            clock: clockSelect || (song ? song.getClockRate() : 1773400),
            frameRate: _dumpData.frameRate,
            volume: volume,
            repeat: repeat,
            loopFrame: _dumpData.loopFrame,
            chipKinds: _dumpData.chipKinds || null,
            opnClock: _dumpData.opnClock || 0,
            pan: pan
        });
        var dl = _dumpData.dumpLen;
        _workletNode.port.postMessage({ type: 'setProgress', progress: dl > 0 ? playFrame / dl : 0 });
    }

    function setWaveformLoadingText(text) {
        var el = document.getElementById(containerId + '_waveLoadingText');
        if (el) el.textContent = text;
    }

    function setWaveformLoadingProgress(pct) {
        var el = document.getElementById(containerId + '_waveProgress');
        if (el) el.setAttribute('stroke-dashoffset', 113.1 * (1 - pct));
    }

    function loadAndPlay(trackId, cont) {
        cont = typeof cont !== 'undefined' ? cont : false;
        if (trackId < 0 || trackId >= playlist.length) return;
        if (intFreqSelect === 0 || intFreqSelect === 200) {
            var want200 = /200%/i.test((playlist[trackId].file || ''));
            var autoVal = want200 ? 200 : 0;
            if (intFreqSelect !== autoVal) {
                intFreqSelect = autoVal;
                _syncIntFreqUI();
            }
            _autoIntFreq = (intFreqSelect === autoVal);
        }
        _waveformCancelled = true;
        _loadGen++;
        var gen = _loadGen;
        playing = true;
        currentId = trackId;
        updatePlaylistActive();
        saveState();
        var entry = playlist[trackId];
        trackTotalTime = (entry && entry.time) || '';
        if (onPlayStateChange) onPlayStateChange(true, trackId);



        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        function _doLoad() {
            if (_xhr) { _xhr.abort(); _xhr = null; }
            _workletNode = null;
            _gainNode = null;
            _roomNode = null;
            _roomGain = null;
            _stopStreamer();
            if (!cont) {
                song = null;
                _dumpData = null;
                waveformData = null; endFrame = 0;
                waveformCh = []; _waveformProgress = -1; _chipKinds = null; _opnClock = 0;
                var loadingEl = document.getElementById(containerId + '_waveLoading');
                if (loadingEl) loadingEl.classList.remove('active');
                var wc = document.getElementById(containerId + '_waveCanvas');
                if (wc) {
                    wc.classList.remove('visible');
                    var ctx = wc.getContext('2d');
                    ctx.fillStyle = '#001828';
                    ctx.fillRect(0, 0, wc.width, wc.height);
                }
            }
            _setupContext(function() {
                if (gen !== _loadGen) return;
                if (cont) {
                    loadingNext = false;
                    trackEndedFlag = false;
                    _resendToWorklet();
                    if (!rafId) rafId = requestAnimationFrame(rafLoop);
                    startEndCheck();
                    requestWakeLock();
                    updatePlayBtn();
                    return;
                }

                var loadFile = entry.file;
                var xhr = new XMLHttpRequest();
                _xhr = xhr;
                xhr.open('GET', encodePath(loadFile), true);
                xhr.responseType = 'arraybuffer';
                xhr.onload = function() {
                    if (_xhr === xhr) _xhr = null;
                    if (gen !== _loadGen) return;
                    if (xhr.status === 404) {
                        _notFound[trackId] = true;
                        var errAuthor = entry.author || '';
                        var errTitle = entry.title || entry.name || '';
                        if (onTrackChange) onTrackChange({ author: errAuthor, title: 'Not found: ' + errTitle });
                        renderPlaylist();
                        return;
                    }
                    if (xhr.response) playBuffer(xhr.response, loadFile, cont);
                };
                xhr.onerror = function() {
                    if (onTrackChange) onTrackChange({ author: 'Error', title: 'Failed to load: ' + loadFile });
                };
                xhr.ontimeout = function() {
                    if (onTrackChange) onTrackChange({ author: 'Error', title: 'Timeout: ' + loadFile });
                };
                xhr.timeout = 10000;
                xhr.send(null);
            });
        }

        if (loadingNext && !cont && _workletNode && _gainNode) {
            _doLoadSkipContext();
            return;
        }

        if (audioContext && audioContext.state === 'running' && _workletNode && _gainNode && !loadingNext) {
            if (!rafId) rafId = requestAnimationFrame(rafLoop);
            _startFade(0, 0.15, function() {
                _doLoadSkipContext();
                _startFade(1.0, 0.15, null);
            });
            return;
        }

        if (audioContext) try { audioContext.close(); } catch(e) {}
        _doLoad();

        function _doLoadSkipContext() {
            if (_xhr) { _xhr.abort(); _xhr = null; }
            song = null;
            _dumpData = null;
            waveformData = null; endFrame = 0;
            waveformCh = []; _waveformProgress = -1; _waveformLastK = -1;
            _chipKinds = null; _opnClock = 0;
            var loadingEl = document.getElementById(containerId + '_waveLoading');
            if (loadingEl) loadingEl.classList.remove('active');
            var wc = document.getElementById(containerId + '_waveCanvas');
            if (wc) {
                wc.classList.remove('visible');
                var ctx = wc.getContext('2d');
                ctx.fillStyle = '#001828';
                ctx.fillRect(0, 0, wc.width, wc.height);
            }

            var loadFile = entry.file;
            var xhr = new XMLHttpRequest();
            _xhr = xhr;
            xhr.open('GET', encodePath(loadFile), true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function() {
                if (_xhr === xhr) _xhr = null;
                if (gen !== _loadGen) { loadingNext = false; return; }
                if (xhr.status === 404) {
                    loadingNext = false;
                    _notFound[trackId] = true;
                    var errAuthor = entry.author || '';
                    var errTitle = entry.title || entry.name || '';
                    if (onTrackChange) onTrackChange({ author: errAuthor, title: 'Not found: ' + errTitle });
                    renderPlaylist();
                    return;
                }
                if (xhr.response) playBuffer(xhr.response, loadFile, false);
            };
            xhr.onerror = function() {
                loadingNext = false;
                if (onTrackChange) onTrackChange({ author: 'Error', title: 'Failed to load: ' + loadFile });
            };
            xhr.ontimeout = function() {
                loadingNext = false;
                if (onTrackChange) onTrackChange({ author: 'Error', title: 'Timeout: ' + loadFile });
            };
            xhr.timeout = 10000;
            xhr.send(null);
        }
    }

    function preloadWaveform(trackId) {
        if (trackId < 0 || trackId >= playlist.length) return;
        var entry = playlist[trackId];
        var loadFile = entry.file;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', encodePath(loadFile), true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
            if (!xhr.response) return;
            var arr = new Uint8Array(xhr.response);
            var isPT3 = /\.pt3$/i.test(loadFile);
            var isVT2 = /\.vt2$/i.test(loadFile);
            var isSTC = /\.stc$/i.test(loadFile);
            var isPSG = /\.psg$/i.test(loadFile);
            var isSND = /\.snd$/i.test(loadFile);
            var isAY = /\.ay$/i.test(loadFile);
            var isPT2 = /\.pt2$/i.test(loadFile);
            var isASC = /\.asc$/i.test(loadFile);
            var isMTC = /\.mtc$/i.test(loadFile);
            var isTFC = /\.tfc$/i.test(loadFile);
            var isSTP = /\.stp$/i.test(loadFile);
            var isPT1 = /\.pt1$/i.test(loadFile);

        if (isPT3) {
                var dump = [], lf = -1;
                try {
                    var reader = new PT3Reader(arr.buffer, loadFile);
                    var estFc = reader.getFrameCount();
                    var fr = reader.getFrameRate();
                    var clock = reader.getClockRate();
                    var turbo = reader.getTurbo();
                    var maxFc = Math.max(estFc * 5, fr * 120);
                    for (var i = 0; i < maxFc; i++) {
                        var r = reader.getNextFrame();
                        if (r[r.length - 1] && lf < 0) lf = i;
                        if (lf >= 0) break;
                        dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [], c: r[2] ? r[2].slice() : [] });
                    }
                    if (lf >= 0) {
                        var effectiveEnd = Math.min(dump.length, lf);
                        if (effectiveEnd < dump.length) dump.length = effectiveEnd;
                    } else if (dump.length > estFc) {
                        dump.length = estFc;
                    }
                    generatePt3Waveform(dump, dump.length, fr, clock, turbo, loadFile, lf, reader.getNumPositions(), reader.getLoopPos(), reader.getDelay(), true);
                } catch(e) {}
            } else if (isVT2) {
                try {
                    var reader = new VT2Player(arr.buffer, loadFile);
                    var estFc = reader.getFrameCount();
                    var fr = reader.getFrameRate();
                    var clock = reader.getClockRate();
                    var turbo = reader.getTurbo();
                    var dump = [], lf = -1;
                    var maxFc = Math.max(estFc * 5, fr * 120);
                    for (var i = 0; i < maxFc; i++) {
                        var r = reader.getNextFrame();
                        if (r[r.length - 1] && lf < 0) lf = i;
                        if (lf >= 0) break;
                        dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [], c: r[2] ? r[2].slice() : [] });
                    }
                    if (lf >= 0) {
                        var effectiveEnd = Math.min(dump.length, lf);
                        if (effectiveEnd < dump.length) dump.length = effectiveEnd;
                    } else if (dump.length > estFc) {
                        dump.length = estFc;
                    }
                    generatePt3Waveform(dump, dump.length, fr, clock, turbo, loadFile, lf, reader.getNumPositions(), reader.getLoopPos(), reader.getDelay(), true);
                } catch(e) {}
        } else if (isSTC) {
                try {
                    var reader = new STCReader(arr.buffer, loadFile);
                    var estFc = reader.getFrameCount();
                    var fr = reader.getFrameRate();
                    var clock = reader.getClockRate();
                    var dump = [], lf = -1;
                    var maxFc = Math.max(estFc * 5, fr * 120);
                    for (var i = 0; i < maxFc; i++) {
                        var r = reader.getNextFrame();
                        if (r[r.length - 1] && lf < 0) lf = i;
                        if (lf >= 0) break;
                        dump.push({ a: r[0].slice(), b: [] });
                    }
                    var dumpLen = dump.length;
                    if (dumpLen > estFc && lf < 0) { dump.length = estFc; dumpLen = estFc; }
                    generatePt3Waveform(dump, dumpLen, fr, clock, false, loadFile, lf, reader.getNumPositions(), reader.getLoopPos(), reader.getDelay(), true);
                } catch(e) {}
        } else if (isPT2) {
                try {
                    var reader = new PT2Reader(arr.buffer, loadFile);
                    var estFc = reader.getFrameCount();
                    var fr = reader.getFrameRate();
                    var clock = reader.getClockRate();
                    var dump = [], lf = -1;
                    var maxFc = Math.max(estFc * 5, fr * 120);
                    for (var i = 0; i < maxFc; i++) {
                        var r = reader.getNextFrame();
                        if (r[r.length - 1] && lf < 0) lf = i;
                        if (lf >= 0) break;
                        dump.push({ a: r[0].slice(), b: [] });
                    }
                    if (lf >= 0) {
                        var effectiveEnd = Math.min(dump.length, lf);
                        if (effectiveEnd < dump.length) dump.length = effectiveEnd;
                    } else if (dump.length > estFc) {
                        dump.length = estFc;
                    }
                    generatePt3Waveform(dump, dump.length, fr, clock, false, loadFile, lf, reader.getNumPositions(), reader.getLoopPos(), reader.getDelay(), true);
                } catch(e) {}
        } else if (isASC) {
                try {
                    var reader = new ASCReader(arr.buffer, loadFile);
                    var estFc = reader.getFrameCount();
                    var fr = reader.getFrameRate();
                    var clock = reader.getClockRate();
                    var dump = [], lf = -1;
                    var maxFc = Math.max(estFc * 5, fr * 120);
                    for (var i = 0; i < maxFc; i++) {
                        var r = reader.getNextFrame();
                        if (r[r.length - 1] && lf < 0) lf = i;
                        if (lf >= 0) break;
                        dump.push({ a: r[0].slice(), b: [] });
                    }
                    if (lf >= 0) {
                        var effectiveEnd = Math.min(dump.length, lf);
                        if (effectiveEnd < dump.length) dump.length = effectiveEnd;
                    } else if (dump.length > estFc) {
                        dump.length = estFc;
                    }
                    generatePt3Waveform(dump, dump.length, fr, clock, false, loadFile, lf, reader.getNumPositions(), reader.getLoopPos(), reader.getDelay(), true);
                } catch(e) {}
        } else if (isAY) {
                try {
                    var reader = new AYReader(arr.buffer, loadFile);
                    if (reader.error) return;
                    var fr = reader.getFrameRate();
                    var clock = reader.getClockRate();
                    reader.run(null, function() {
                        var fc = reader.getFrameCount();
                        var dump = [];
                        for (var i = 0; i < fc; i++) {
                            var r = reader.getNextFrame();
                            dump.push({ a: r[0].slice(), b: [] });
                        }
                        generatePt3Waveform(dump, dump.length, fr, clock, 1, loadFile, -1, 0, -1, 0, true);
                    }, null);
                } catch(e) {}
        } else if (isPSG || isSND) {
                try {
                    var psgData = isSND ? new Uint8Array(new SndToPsg(new Int8Array(arr)).exec).buffer : arr.buffer;
                    var reader = new PSGReader(psgData, loadFile.replace(/\.snd$/i, '.psg'));
                    var fc = reader.getFrameCount();
                    var fr = reader.getFrameRate();
                    var clock = reader.getClockRate();
                    var dump = [];
                    for (var i = 0; i < fc; i++) {
                        var r = reader.getNextFrame();
                        dump.push({ a: r[0].slice(), b: [] });
                    }
                    generatePt3Waveform(dump, dump.length, fr, clock, 1, loadFile, -1, 0, -1, 0, true);
                } catch(e) {}
        } else if (isMTC) {
                try {
                    var reader = new MTCReader(arr.buffer, loadFile);
                    var mtcFc = reader.getFrameCount();
                    var fr2 = reader.getFrameRate();
                    var clock2 = reader.getClockRate();
                    var chipCount2 = reader.getNumChips ? reader.getNumChips() : 1;
                    _chipKinds = reader.getChipTypes ? reader.getChipTypes() : null;
                    _opnClock = reader.getOpnClockRate ? reader.getOpnClockRate() : 0;
                    var dump = [];
                    for (var i = 0; i < mtcFc; i++) {
                        var r = reader.getNextFrame();
                        dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [], c: r[2] ? r[2].slice() : [], d: (r.length > 4 && r[3]) ? r[3].slice() : [] });
                    }
                    generatePt3Waveform(dump, dump.length, fr2, clock2, chipCount2, loadFile, -1, 0, -1, 0, true);
                } catch(e) {}
        } else if (isTFC) {
                try {
                    var reader = new TFCReader(arr.buffer, loadFile);
                    var tfcFc = reader.getFrameCount();
                    var fr2 = reader.getFrameRate();
                    var clock2 = reader.getClockRate();
                    var chipCount2 = reader.getNumChips ? reader.getNumChips() : 2;
                    _chipKinds = ['opn', 'opn'];
                    _opnClock = clock2;
                    var dump = [];
                    for (var i = 0; i < tfcFc; i++) {
                        var r = reader.getNextFrame();
                        dump.push({ a: r[0].slice(), b: r[1] ? r[1].slice() : [] });
                    }
                    generatePt3Waveform(dump, dump.length, fr2, clock2, chipCount2, loadFile, reader.getLoopFrame(), reader.getFrameCount(), reader.getLoopFrame(), 0, true);
                } catch(e) {}
        } else if (isSTP) {
                try {
                    var reader = new STPReader(arr.buffer, loadFile);
                    var estFc = reader.getFrameCount();
                    var fr2 = reader.getFrameRate();
                    var clock2 = reader.getClockRate();
                    var dump = [], lf = -1;
                    var maxFc = Math.max(estFc * 2, fr2 * 120);
                    for (var i = 0; i < maxFc; i++) {
                        var r = reader.getNextFrame();
                        if (r[r.length - 1] && lf < 0) lf = i;
                        if (lf >= 0) break;
                        dump.push({ a: r[0].slice(), b: [] });
                    }
                    var dumpLen2 = dump.length;
                    if (dumpLen2 > estFc && lf < 0) { dump.length = estFc; dumpLen2 = estFc; }
                    generatePt3Waveform(dump, dumpLen2, fr2, clock2, 1, loadFile, lf, reader.getNumPositions(), reader.getLoopPos(), reader.getDelay(), true);
                } catch(e) {}
        } else if (isPT1) {
                try {
                    var reader = new PT1Reader(arr.buffer, loadFile);
                    var estFc = reader.getFrameCount();
                    var fr2 = reader.getFrameRate();
                    var clock2 = reader.getClockRate();
                    var dump = [], lf = -1;
                    var maxFc = Math.max(estFc * 2, fr2 * 120);
                    for (var i = 0; i < maxFc; i++) {
                        var r = reader.getNextFrame();
                        if (r[r.length - 1] && lf < 0) lf = i;
                        if (lf >= 0) break;
                        dump.push({ a: r[0].slice(), b: [] });
                    }
                    var dumpLen2 = dump.length;
                    if (dumpLen2 > estFc && lf < 0) { dump.length = estFc; dumpLen2 = estFc; }
                    generatePt3Waveform(dump, dumpLen2, fr2, clock2, 1, loadFile, lf, reader.getNumPositions(), reader.getLoopPos(), reader.getDelay(), true);
                } catch(e) {}
        } else {
                try {
                    generateFymWaveform(arr.buffer, loadFile);
                } catch(e) {}
            }
        };
        xhr.send(null);
    }

    function getRemainingTime() {
        if (!song) return '00:00';
        var fc = pt3FrameCount || song.getFrameCount();
        var fr = song.getFrameRate();
        var remaining = Math.round((fc - playFrame) / fr);
        if (remaining < 0) remaining = 0;
        var m = Math.floor(remaining / 60);
        var s = remaining % 60;
        return '-' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function getTotalTime() {
        if (!song) return '00:00';
        var fc = pt3FrameCount || song.getFrameCount();
        var fr = song.getFrameRate();
        var total = Math.round(fc / fr);
        var m = Math.floor(total / 60);
        var s = total % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function getTimeDisplay() {
        if (!song) return '00:00';
        var fc = pt3FrameCount || song.getFrameCount();
        var fr = song.getFrameRate();
        var elapsed = Math.round(playFrame / fr);
        if (elapsed < 0) elapsed = 0;
        var m = Math.floor(elapsed / 60);
        var s = elapsed % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function _cleanTitle(s) {
        if (!s) return '';
        s = s.replace(/%20/g, ' ');
        if (s.indexOf('/') !== -1 || s.indexOf('\\') !== -1) {
            s = s.replace(/^.*[\/\\]/, '');
            s = s.replace(/\.(fym|pt3|vt2|psg|stc|ay|pt2|snd|asc|mtc|tfc|stp)$/i, '');
        }
        return s;
    }

    function getTrackInfo() {
        if (!song) return { author: '', title: '', fileName: '' };
        var author = song.getAuthorName().trim();
        var title = _cleanTitle(song.getTrackName().trim());
        var entry = playlist[currentId];
        if (entry) {
            if (entry.title && (!title || !author)) title = _cleanTitle(entry.title);
            if (entry.author && !author) author = entry.author;
        }
        if (!title) title = _cleanTitle((song.getTrackFileName() || '').replace(/%20/g, ' '));
        return { author: author, title: title, fileName: song.getTrackFileName() };
    }

    function updateFavBtn() {
        var btn = document.getElementById(containerId + '_playlistBtn');
        if (btn) btn.classList.toggle('active', favoritesOnly);
    }

    function updatePlayBtn() {
        var btn = document.getElementById(containerId + '_playBtn');
        if (btn) btn.className = 'ayPlayer-btn ' + (playing ? 'pause' : 'play');
        var btn2 = document.getElementById(containerId + '_playBtn2');
        if (btn2) btn2.className = 'ayPlayer-btn ' + (playing ? 'pause' : 'play');
    }

    function updateVolumeUI() {
        var progress = document.querySelector('#' + containerId + '_volume .ayPlayer-volume-progress');
        var text = document.querySelector('#' + containerId + '_volume .ayPlayer-volume-text');
        var volEl = document.getElementById(containerId + '_volume');
        var progress2 = document.querySelector('#' + containerId + '_volume2 .ayPlayer-volume-progress');
        var text2 = document.querySelector('#' + containerId + '_volume2 .ayPlayer-volume-text');
        var volEl2 = document.getElementById(containerId + '_volume2');
        if (progress) {
            var drawn = volume * 65.97;
            progress.style.strokeDasharray = drawn + ', 1000';
            progress.style.strokeDashoffset = 0;
        }
        if (progress2) {
            var drawn2 = volume * 65.97;
            progress2.style.strokeDasharray = drawn2 + ', 1000';
            progress2.style.strokeDashoffset = 0;
        }
        if (text) text.textContent = Math.round(volume * 100);
        if (text2) text2.textContent = Math.round(volume * 100);
        if (volEl) volEl.title = 'Volume: ' + Math.round(volume * 100);
        if (volEl2) volEl2.title = 'Volume: ' + Math.round(volume * 100);
        localStorage.setItem('ayPlayer_volume', volume);
    }

        var _waveformCancelled = false;

        function _requestAccurateWaveform(fileName) { return;
            var entry = playlist[currentId];
            if (!entry || entry.file !== fileName) return;
            if (typeof Worker === 'undefined') return;
            if (waveformCache[fileName] && waveformCache[fileName].exact) return;
            if (!_dumpData || !_dumpData.dump || !_dumpData.dump.length) return;
            _waveGen++;
            var wg = _waveGen;
            var waveFile = fileName;
            if (_waveWorker) { try { _waveWorker.terminate(); } catch(e) {} _waveWorker = null; }
            try {
                _waveWorker = new Worker('player/streamer.js?v=' + _awVersion);
            } catch(e) {
                _waveWorker = null;
                return;
            }
            _waveWorker.onmessage = function(e) {
                var msg = e.data;
                if (!msg) return;
                if (msg.type === 'waveformData') {
                    if (msg.gen !== wg) return;
                    var cur = playlist[currentId];
                    if (!cur || cur.file !== waveFile) return;
                    _applyAccurateWaveform(msg, waveFile);
                    if (_waveWorker) { try { _waveWorker.terminate(); } catch(e) {} _waveWorker = null; }
                } else if (msg.type === 'error') {
                    console.error('Waveform worker:', msg.message);
                    if (_waveWorker) { try { _waveWorker.terminate(); } catch(e) {} _waveWorker = null; }
                }
            };
            _waveWorker.onerror = function() {
                _waveWorker = null;
            };
            var wfRate = intFreqSelect;
            if (wfRate === 0 || wfRate === 200) {
                var want200 = /200%/i.test(fileName || '');
                wfRate = want200 ? 200 : (_dumpData.frameRate || 50);
            }
            if (!(wfRate > 0)) wfRate = _dumpData.frameRate || 50;
            _waveWorker.postMessage({
                type: 'waveform',
                gen: wg,
                sampleRate: 48000,
                dump: _dumpData.dump,
                isTurbo: _dumpData.isTurbo,
                chipCount: _dumpData.chipCount || 1,
                isYM: isYM,
                clock: clockSelect || _dumpData.clock,
                frameRate: wfRate,
                chipKinds: _dumpData.chipKinds || null,
                opnClock: _dumpData.opnClock || 0,
                pan: _getPanData(),
                firEnabled: firEnabled
            });
        }

        function _applyAccurateWaveform(msg, fn) {
            var frames = msg.frames || 0;
            var chCount = msg.chCount || 1;
            if (frames <= 0) return;
            var mix = new Float64Array(msg.mix);
            var channels = new Float64Array(msg.channels);
            var allAmps = [];
            var chAmps = [];
            for (var ch = 0; ch < chCount; ch++) chAmps.push(new Array(frames));
            for (var i = 0; i < frames; i++) {
                allAmps.push(mix[i]);
                for (var ch = 0; ch < chCount; ch++) chAmps[ch][i] = channels[i * chCount + ch];
            }
            function binData(arr) {
                var pts = 1000;
                var n = arr.length;
                if (n === 0) return new Array(pts).fill(0);
                if (n <= pts) {
                    var data = new Array(pts).fill(0);
                    for (var i = 0; i < pts; i++) data[i] = arr[Math.floor(i * n / pts)];
                    return data;
                }
                var data = new Array(pts).fill(0);
                for (var i = 0; i < n; i++) {
                    var idx = Math.floor(i * pts / n);
                    if (arr[i] > data[idx]) data[idx] = arr[i];
                }
                return data;
            }
            var binnedOverall = binData(allAmps);
            var binnedChannels = chAmps.map(binData);
            function _pct(arr, p) {
                if (!arr.length) return 0.001;
                var s = arr.slice().sort(function(a, b) { return a - b; });
                var v = s[Math.floor((s.length - 1) * p)];
                return v > 0 ? v : 0.001;
            }
            var globalMax = 0.001;
            globalMax = Math.max(globalMax, _pct(binnedOverall, 0.97));
            for (var ch = 0; ch < binnedChannels.length; ch++) globalMax = Math.max(globalMax, _pct(binnedChannels[ch], 0.97));
            if (globalMax < 0.02) globalMax = 0.02;
            waveformData = binnedOverall.map(function(v) { return Math.min(v / globalMax, 1); });
            waveformCh = binnedChannels.map(function(chData) { return chData.map(function(v) { return Math.min(v / globalMax, 1); }); });
            var appliedMax = 0;
            for (var i = 0; i < waveformData.length; i++) if (waveformData[i] > appliedMax) appliedMax = waveformData[i];
            console.log('Accurate waveform applied: max=' + appliedMax.toFixed(4) + ' (worker mixMax=' + (msg.mixMax != null ? msg.mixMax.toFixed(4) : '?') + ') chCount=' + waveformCh.length + ' frames=' + frames);
            if (appliedMax < 0.001) {
                console.warn('Accurate waveform empty (worker mixMax=' + (msg.mixMax != null ? msg.mixMax.toFixed(4) : '?') + '), keeping fast preview');
                if (_waveWorker) { try { _waveWorker.terminate(); } catch(e) {} _waveWorker = null; }
                return;
            }
            var fc = pt3FrameCount || (song ? song.getFrameCount() : 0);
            endFrame = fc > 0 ? fc - 1 : frames - 1;
            waveformCache[fn] = { data: waveformData, channels: waveformCh, endFrame: endFrame, exact: true };
            drawWaveform();
            var canvas = document.getElementById(containerId + '_waveCanvas');
            if (canvas) canvas.classList.add('visible');
        }

        function generatePt3Waveform(dump, fc, fr, clock, turbo, fileName, loopFrame, numPos, loopPos, delay, noDraw, onDone) {
        var chipCount = typeof turbo === 'boolean' ? (turbo ? 2 : 1) : turbo;
        var fn = fileName;
        var loadingEl = document.getElementById(containerId + '_waveLoading');
        if (waveformCache[fn]) {
            var cached = waveformCache[fn];
            waveformData = cached.data;
            waveformCh = cached.channels;
            endFrame = cached.endFrame;
            drawWaveform();
            var canvas = document.getElementById(containerId + '_waveCanvas');
            if (canvas) canvas.classList.add('visible');
            if (loadingEl) loadingEl.classList.remove('active');
            if (onDone) onDone();
            return;
        }
        if (document.hidden) {
            if (loadingEl) loadingEl.classList.remove('active');
            if (onDone) onDone();
            return;
        }
        if (onDone) onDone();
        var _wkey = _waveKey(fn, clock, _chipKinds);
        _restoreWaveformDB(_wkey, fn, function(_hit) {
            if (_hit) {
                var _cv = document.getElementById(containerId + '_waveCanvas');
                if (_cv) _cv.classList.add('visible');
                if (loadingEl) loadingEl.classList.remove('active');
                return;
            }
        var chCount = chipCount * 3;
        var allAmps = [];
        var chAmps = [];
        for (var ch = 0; ch < chCount; ch++) chAmps.push([]);
        var f = 0;

        var chipTypes = _chipKinds;
        var opnClk = _opnClock || 3500000;
        var ayGens = [];
        var opnGens = [];
        for (var gi = 0; gi < chipCount; gi++) {
            if (chipTypes && chipTypes[gi] === 'opn') {
                opnGens.push(new OPN(opnClk, 44100));
                ayGens.push(null);
            } else {
                var agn = new Ayumi();
                agn.configure(false, clock, 44100);
                ayGens.push(agn);
                opnGens.push(null);
            }
        }
        var opnTmp = [0, 0, 0];

        var loadingEl = document.getElementById(containerId + '_waveLoading');
        if (loadingEl) {
            loadingEl.classList.add('active');
        }
        setWaveformLoadingText('Rendering waveform');
        _waveformCancelled = false;

        function processChunk() {
            if (_waveformCancelled) return;
            var curEntry = playlist[currentId];
            if (!curEntry || curEntry.file !== fn) return;
            var t0 = performance.now();
            do {
                var entry = dump[f];
                var srcs = [entry.a, entry.b, entry.c, entry.d];
                for (var ci = 0; ci < chipCount; ci++) {
                    var src = srcs[ci];
                    if (!src) continue;
                    if (chipTypes && chipTypes[ci] === 'opn') {
                        var og = opnGens[ci];
                        for (var pr = 0; pr < src.length; pr++) og.writeReg(src[pr][0], src[pr][1]);
                    } else {
                        updateState(ayGens[ci], src);
                    }
                }
                var peaks = new Array(chCount).fill(0);
                for (var ci = 0; ci < chipCount; ci++) {
                    var base = ci * 3;
                    if (chipTypes && chipTypes[ci] === 'opn') {
                        var og = opnGens[ci];
                        for (var s2 = 0; s2 < 10; s2++) {
                            og.renderSample(opnTmp);
                            for (var ch = 0; ch < 3; ch++) {
                                var v = Math.abs(opnTmp[ch]) / 32768;
                                if (v > peaks[base + ch]) peaks[base + ch] = v;
                            }
                        }
                    } else {
                        var agn = ayGens[ci];
                        for (var s2 = 0; s2 < 10; s2++) {
                            agn.process();
                            for (var ch = 0; ch < 3; ch++) {
                                var v = Math.abs(agn.chanOut[ch].left);
                                if (v > peaks[base + ch]) peaks[base + ch] = v;
                            }
                        }
                    }
                }
                var frameMax = 0;
                for (var ch = 0; ch < chCount; ch++) {
                    if (peaks[ch] > frameMax) frameMax = peaks[ch];
                    chAmps[ch].push(peaks[ch]);
                }
                allAmps.push(frameMax);
                f++;
            } while (f < fc && performance.now() - t0 < 12);
            setWaveformLoadingProgress(Math.min(f / fc, 1));
            if (f < fc) {
                requestAnimationFrame(processChunk);
            } else {
                if (loadingEl) loadingEl.classList.remove('active');
                var endIdx = fc - 1;
                var waveAmps = allAmps.slice(0, endIdx + 1);
                var waveChAmps = [];
                for (var ch = 0; ch < chCount; ch++) {
                    waveChAmps.push(chAmps[ch].slice(0, endIdx + 1));
                }

                function binData(arr) {
                    var pts = 1000;
                    var n = arr.length;
                    if (n === 0) return new Array(pts).fill(0);
                    if (n <= pts) {
                        var data = new Array(pts).fill(0);
                        for (var i = 0; i < pts; i++) data[i] = arr[Math.floor(i * n / pts)];
                        return data;
                    }
                    var data = new Array(pts).fill(0);
                    for (var i = 0; i < n; i++) {
                        var idx = Math.floor(i * pts / n);
                        if (arr[i] > data[idx]) data[idx] = arr[i];
                    }
                    return data;
                }

                var binnedOverall = binData(waveAmps);
                var binnedChannels = waveChAmps.map(binData);
                var globalMax = 0.001;
                for (var i = 0; i < binnedOverall.length; i++) if (binnedOverall[i] > globalMax) globalMax = binnedOverall[i];
                for (var ch = 0; ch < binnedChannels.length; ch++) {
                    var chData = binnedChannels[ch];
                    for (var i = 0; i < chData.length; i++) if (chData[i] > globalMax) globalMax = chData[i];
                }
                waveformData = binnedOverall.map(function(v) { return v / globalMax; });
                waveformCh = binnedChannels.map(function(chData) { return chData.map(function(v) { return v / globalMax; }); });
                endFrame = endIdx;
                waveformCache[fn] = { data: waveformData, channels: waveformCh, endFrame: endIdx };
                drawWaveform();
                var canvas = document.getElementById(containerId + '_waveCanvas');
                if (canvas) canvas.classList.add('visible');
            }
            _putWaveformDB(_wkey, { data: waveformData, channels: waveformCh, endFrame: endIdx, version: _WAVE_DB_VER });
        }
        requestAnimationFrame(processChunk);
        });
    }

    function generateFymWaveform(buffer, fileName, onDone) {
        var fn = fileName;
        if (waveformCache[fn]) {
            var cached = waveformCache[fn];
            waveformData = cached.data;
            waveformCh = cached.channels;
            endFrame = cached.endFrame;
            drawWaveform();
            var canvas = document.getElementById(containerId + '_waveCanvas');
            if (canvas) canvas.classList.add('visible');
            if (onDone) onDone();
            return;
        }
        if (document.hidden) {
            if (onDone) onDone();
            return;
        }
        if (onDone) onDone();
        var genSong = new FYMReader(buffer, fileName);
        var _wclk = clockSelect || genSong.getClockRate();
        var _wkey = _waveKey(fn, _wclk, isYM ? ['ym'] : ['ay']);
        _restoreWaveformDB(_wkey, fn, function(_hit) {
            if (_hit) {
                var _cv = document.getElementById(containerId + '_waveCanvas');
                if (_cv) _cv.classList.add('visible');
                if (loadingEl) loadingEl.classList.remove('active');
                return;
            }
        var fc = genSong.getFrameCount();
        var fr = genSong.getFrameRate();
        var isTurboSong = genSong.getTurbo && genSong.getTurbo();
        var chCount = isTurboSong ? 6 : 3;
        var allAmps = [];
        var chAmps = [];
        for (var ch = 0; ch < chCount; ch++) chAmps.push([]);
        var f = 0;

        var ayGen = new Ayumi();
        ayGen.configure(isYM, clockSelect || genSong.getClockRate(), 44100);
        var ayGen2;
        if (isTurboSong) { ayGen2 = new Ayumi(); ayGen2.configure(isYM, clockSelect || genSong.getClockRate(), 44100); }

        var loadingEl = document.getElementById(containerId + '_waveLoading');
        if (loadingEl) {
            loadingEl.classList.add('active');
        }
        setWaveformLoadingText('Rendering waveform');
        _waveformCancelled = false;

        function processChunk() {
            if (_waveformCancelled) return;
            var curEntry = playlist[currentId];
            if (!curEntry || curEntry.file !== fn) return;
            var t0 = performance.now();
            do {
                var r = genSong.getNextFrame();
                updateState(ayGen, r[0]);
                if (isTurboSong && r[1] && r[1].length) updateState(ayGen2, r[1]);
                var peaks = [0, 0, 0, 0, 0, 0];
                for (var s = 0; s < 10; s++) {
                    ayGen.process();
                    for (var ch = 0; ch < 3; ch++) {
                        var v = Math.abs(ayGen.chanOut[ch].left);
                        if (v > peaks[ch]) peaks[ch] = v;
                    }
                }
                if (isTurboSong) {
                    for (var s = 0; s < 10; s++) {
                        ayGen2.process();
                        for (var ch = 0; ch < 3; ch++) {
                            var v = Math.abs(ayGen2.chanOut[ch].left);
                            if (v > peaks[ch + 3]) peaks[ch + 3] = v;
                        }
                    }
                }
                var frameMax = 0;
                for (var ch = 0; ch < chCount; ch++) {
                    if (peaks[ch] > frameMax) frameMax = peaks[ch];
                    chAmps[ch].push(peaks[ch]);
                }
                allAmps.push(frameMax);
                f++;
            } while (f < fc && performance.now() - t0 < 12);
            setWaveformLoadingProgress(Math.min(f / fc, 1));
            if (f < fc) {
                requestAnimationFrame(processChunk);
            } else {
                if (loadingEl) loadingEl.classList.remove('active');
                var endIdx = fc - 1;
                var waveAmps = allAmps.slice(0, endIdx + 1);
                var waveChAmps = [];
                for (var ch = 0; ch < chCount; ch++) {
                    waveChAmps.push(chAmps[ch].slice(0, endIdx + 1));
                }

                function binData(arr) {
                    var pts = 1000;
                    var n = arr.length;
                    if (n === 0) return new Array(pts).fill(0);
                    if (n <= pts) {
                        var data = new Array(pts).fill(0);
                        for (var i = 0; i < pts; i++) data[i] = arr[Math.floor(i * n / pts)];
                        return data;
                    }
                    var data = new Array(pts).fill(0);
                    for (var i = 0; i < n; i++) {
                        var idx = Math.floor(i * pts / n);
                        if (arr[i] > data[idx]) data[idx] = arr[i];
                    }
                    return data;
                }

                var binnedOverall = binData(waveAmps);
                var binnedChannels = waveChAmps.map(binData);
                var globalMax = 0.001;
                for (var i = 0; i < binnedOverall.length; i++) if (binnedOverall[i] > globalMax) globalMax = binnedOverall[i];
                for (var ch = 0; ch < binnedChannels.length; ch++) {
                    var chData = binnedChannels[ch];
                    for (var i = 0; i < chData.length; i++) if (chData[i] > globalMax) globalMax = chData[i];
                }
                waveformData = binnedOverall.map(function(v) { return v / globalMax; });
                waveformCh = binnedChannels.map(function(chData) { return chData.map(function(v) { return v / globalMax; }); });
                endFrame = endIdx;
                waveformCache[fn] = { data: waveformData, channels: waveformCh, endFrame: endIdx };
                drawWaveform();
                var canvas = document.getElementById(containerId + '_waveCanvas');
                if (canvas) canvas.classList.add('visible');
            }
            _putWaveformDB(_wkey, { data: waveformData, channels: waveformCh, endFrame: endIdx, version: _WAVE_DB_VER });
        }
        requestAnimationFrame(processChunk);
        });
    }

    function setupVolume() {
        var el = document.getElementById(containerId + '_volume');
        var el2 = document.getElementById(containerId + '_volume2');
        if (!el && !el2) return;
        var startY = 0;
        var startVol = 0;

        function setVolFromY(y) {
            var delta = (startY - y) * 0.01;
            volume = Math.max(0, Math.min(1, startVol + delta));
            updateVolumeUI();
            if (_workletNode) {
                _workletNode.port.postMessage({ type: 'volume', volume: volume });
            }
        }

        function bindVolume(el) {
            if (!el) return;
            el.addEventListener('mousedown', function(e) {
                e.preventDefault();
                startY = e.clientY;
                startVol = volume;
                function onMove(me) { setVolFromY(me.clientY); }
                function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
            el.addEventListener('touchstart', function(e) {
                e.preventDefault();
                startY = e.touches[0].clientY;
                startVol = volume;
                function onMove(te) { te.preventDefault(); setVolFromY(te.touches[0].clientY); }
                function onUp() { document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp); }
                document.addEventListener('touchmove', onMove, { passive: false });
                document.addEventListener('touchend', onUp);
            }, { passive: false });
        }

        bindVolume(el);
        bindVolume(el2);
        updateVolumeUI();
    }

    function _renderWaveformStatic(ctx, w, h) {
        var fc = song ? (pt3FrameCount || song.getFrameCount()) : 0;
        AYWaveformUI.renderStatic(ctx, w, h, {
            frameCount: fc,
            endFrame: endFrame,
            data: waveformData,
            channels: waveformCh,
            mode: waveformMode
        });
    }

    function _hideWaveSplash() {
        var s = document.getElementById(containerId + '_waveSplash');
        if (s) s.style.display = 'none';
    }

    function drawWaveform(progress) {
        var canvas = document.getElementById(containerId + '_waveCanvas');
        if (!canvas || !waveformData) return;
        var _w0 = _debug ? performance.now() : 0;
        _hideWaveSplash();
        AYWaveformUI.draw({
            containerId: containerId,
            data: waveformData,
            channels: waveformCh,
            mode: waveformMode,
            frameCount: song ? (pt3FrameCount || song.getFrameCount()) : 0,
            endFrame: endFrame,
            cachedWidth: _cachedWaveWidth,
            cachedHeight: _cachedWaveHeight,
            lastK: _waveformLastK
        });
        if (_debug) _dbgWaveMs = _dbgWaveMs * 0.8 + (performance.now() - _w0) * 0.2;
    }
    function _exportPause() {
        var w = playing;
        if (w) {
            if (audioContext && audioContext.state === 'running') audioContext.suspend();
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            stopEndCheck(); releaseWakeLock();
            playing = false; updatePlayBtn();
            _scopePosTime = -1;
            if (onPlayStateChange) onPlayStateChange(false, currentId);
        }
        return w;
    }
    function _exportResume(w) {
        if (w) {
            if (audioContext && audioContext.state === 'suspended') audioContext.resume();
            playing = true; rafId = requestAnimationFrame(rafLoop);
            startEndCheck(); requestWakeLock(); updatePlayBtn();
            if (onPlayStateChange) onPlayStateChange(true, currentId);
        }
    }
    function _exportUpdateState(ren, r) {
        ren.setTone(0, ((r[1] << 8) | r[0]) || 2);
        ren.setTone(1, ((r[3] << 8) | r[2]) || 2);
        ren.setTone(2, ((r[5] << 8) | r[4]) || 2);
        ren.setNoise(r[6]);
        ren.setMixer(0, r[7] & 1, (r[7] >> 3) & 1, r[8] >> 4);
        ren.setMixer(1, (r[7] >> 1) & 1, (r[7] >> 4) & 1, r[9] >> 4);
        ren.setMixer(2, (r[7] >> 2) & 1, (r[7] >> 5) & 1, r[10] >> 4);
        ren.setVolume(0, r[8] & 0xf);
        ren.setVolume(1, r[9] & 0xf);
        ren.setVolume(2, r[10] & 0xf);
        ren.setEnvelope((r[12] << 8) | r[11]);
        if (r[13] != 0xff) ren.setEnvelopeShape(r[13]);
    }
    function _dcFilter(buf, R) {
        R = R || 0.999; var y = 0, prev = 0;
        for (var i = 0; i < buf.length; i++) { var x = buf[i]; y = x - prev + R * y; prev = x; buf[i] = y; }
    }
    function _findPeak(bufs, chCount) {
        var peak = 0.001;
        for (var ch = 0; ch < chCount; ch++)
            for (var i = 0; i < bufs[ch].length; i++) { var a = Math.abs(bufs[ch][i]); if (a > peak) peak = a; }
        return peak;
    }
    function _writeWav(samples, BPS, SR, MAX_24) {
        var dataLen = samples.length * BPS;
        var buf = new ArrayBuffer(44 + dataLen);
        var v = new DataView(buf);
        v.setUint32(0, 0x46464952, true);
        v.setUint32(4, 36 + dataLen, true);
        v.setUint32(8, 0x45564157, true);
        v.setUint32(12, 0x20746D66, true);
        v.setUint32(16, 16, true);
        v.setUint16(20, 1, true);
        v.setUint16(22, 1, true);
        v.setUint32(24, SR, true);
        v.setUint32(28, SR * BPS, true);
        v.setUint16(32, BPS, true);
        v.setUint16(34, BPS * 8, true);
        v.setUint32(36, 0x61746164, true);
        v.setUint32(40, dataLen, true);
        var off = 44;
        for (var i = 0; i < samples.length; i++) {
            var val = Math.max(-MAX_24, Math.min(MAX_24, Math.round(samples[i])));
            if (val < 0) val += 0x1000000;
            v.setUint8(off, val & 0xff);
            v.setUint8(off + 1, (val >> 8) & 0xff);
            v.setUint8(off + 2, (val >> 16) & 0xff);
            off += 3;
        }
        return buf;
    }
    function _exportBuildZip(wavBuffers) {
        var crcTable = [];
        for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); crcTable[n] = c; }
        function crc32(data) { var crc = 0 ^ (-1); for (var i = 0; i < data.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF]; return (crc ^ (-1)) >>> 0; }
        var chunks = [], coff = 0, central = [], centralSize = 0;
        for (var i = 0; i < wavBuffers.length; i++) {
            var wav = wavBuffers[i], name = wav.name, data = new Uint8Array(wav.data);
            var crc = crc32(data);
            var lh = new ArrayBuffer(30 + name.length);
            var lv = new DataView(lh);
            lv.setUint32(0, 0x04034b50, true);
            lv.setUint16(4, 20, true); lv.setUint16(6, 0, true);
            lv.setUint16(8, 0, true); lv.setUint16(10, 0, true);
            lv.setUint16(12, 0, true); lv.setUint32(14, crc, true);
            lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
            lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true);
            for (var j = 0; j < name.length; j++) lv.setUint8(30 + j, name.charCodeAt(j));
            chunks.push(lh); chunks.push(wav.data);
            var ce = new ArrayBuffer(46 + name.length);
            var cv = new DataView(ce);
            cv.setUint32(0, 0x02014b50, true);
            cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
            cv.setUint16(8, 0, true); cv.setUint16(10, 0, true);
            cv.setUint16(12, 0, true); cv.setUint16(14, 0, true);
            cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true);
            cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true);
            cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
            cv.setUint16(34, 0, true); cv.setUint16(36, 0, true);
            cv.setUint32(38, 0, true); cv.setUint32(42, coff, true);
            for (var j = 0; j < name.length; j++) cv.setUint8(46 + j, name.charCodeAt(j));
            central.push(ce); centralSize += ce.byteLength;
            coff += lh.byteLength + data.length;
        }
        var totalSize = coff + centralSize + 22, zip = new Uint8Array(totalSize), pos = 0;
        for (var i = 0; i < chunks.length; i++) { zip.set(new Uint8Array(chunks[i]), pos); pos += chunks[i].byteLength; }
        var cdOffset = pos;
        for (var i = 0; i < central.length; i++) { zip.set(new Uint8Array(central[i]), pos); pos += central[i].byteLength; }
        var dv = new DataView(new ArrayBuffer(22));
        dv.setUint32(0, 0x06054b50, true);
        dv.setUint16(4, 0, true); dv.setUint16(6, 0, true);
        dv.setUint16(8, wavBuffers.length, true); dv.setUint16(10, wavBuffers.length, true);
        dv.setUint32(12, centralSize, true); dv.setUint32(16, cdOffset, true);
        dv.setUint16(20, 0, true);
        zip.set(new Uint8Array(dv.buffer), pos);
        return zip;
    }
    function _exportZipSingle(wavData, wavName) {
        var crcTable = [];
        for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); crcTable[n] = c; }
        function crc32(data) { var crc = 0 ^ (-1); for (var i = 0; i < data.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF]; return (crc ^ (-1)) >>> 0; }
        var name = wavName, data = new Uint8Array(wavData);
        var crc = crc32(data);
        var lh = new ArrayBuffer(30 + name.length);
        var lv = new DataView(lh);
        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true); lv.setUint16(6, 0, true);
        lv.setUint16(8, 0, true); lv.setUint16(10, 0, true);
        lv.setUint16(12, 0, true); lv.setUint32(14, crc, true);
        lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
        lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true);
        for (var j = 0; j < name.length; j++) lv.setUint8(30 + j, name.charCodeAt(j));
        var ce = new ArrayBuffer(46 + name.length);
        var cv = new DataView(ce);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
        cv.setUint16(8, 0, true); cv.setUint16(10, 0, true);
        cv.setUint16(12, 0, true); cv.setUint16(14, 0, true);
        cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true);
        cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true);
        cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true); cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true); cv.setUint32(42, 0, true);
        for (var j = 0; j < name.length; j++) cv.setUint8(46 + j, name.charCodeAt(j));
        var totalSize = 30 + name.length + data.length + ce.byteLength + 22;
        var zip = new Uint8Array(totalSize);
        zip.set(new Uint8Array(lh), 0);
        zip.set(data, 30 + name.length);
        var eocd = 30 + name.length + data.length;
        zip.set(new Uint8Array(ce), eocd);
        var dv = new DataView(new ArrayBuffer(22));
        dv.setUint32(0, 0x06054b50, true);
        dv.setUint16(4, 0, true); dv.setUint16(6, 0, true);
        dv.setUint16(8, 1, true); dv.setUint16(10, 1, true);
        dv.setUint32(12, ce.byteLength, true); dv.setUint32(16, eocd, true);
        dv.setUint16(20, 0, true);
        zip.set(new Uint8Array(dv.buffer), eocd + ce.byteLength);
        return zip;
    }
    function _parseFymHeader(arrayBuffer) {
        var psgDump;
        try { psgDump = pako.inflate(new Uint8Array(arrayBuffer)); } catch(e) { return null; }
        var ptr = 0;
        function getInt() { var r = 0; for (var i = 0; i < 4; i++) r += psgDump[ptr++] << (8 * i); return r >>> 0; }
        var offset = getInt(), frameCount = getInt(), loopFrame = getInt();
        var clockRate = getInt(), frameRate = getInt();
        while (psgDump[ptr++]); while (psgDump[ptr++]);
        if (!frameCount || !frameRate) return null;
        var isTurbo = (offset + frameCount * 14) < psgDump.length;
        var turboOffset = offset + frameCount * 14;
        return {
            psgDump: psgDump, frameCount: frameCount, clockRate: clockRate,
            frameRate: frameRate, isTurbo: isTurbo, chCount: isTurbo ? 6 : 3,
            getFrameData: function(frame) {
                var regs0 = [], regs1 = [];
                for (var r = 0; r < 14; r++) regs0[r] = psgDump[offset + r * frameCount + frame];
                if (isTurbo) for (var r = 0; r < 14; r++) regs1[r] = psgDump[offset + turboOffset + r * frameCount + frame];
                return [regs0, regs1];
            }
        };
    }

    var api = {
        init: function(containerIdOrEl, options) {
            options = options || {};
            var el = typeof containerIdOrEl === 'string'
                ? document.getElementById(containerIdOrEl)
                : containerIdOrEl;
            containerId = el.id || 'ayPlayer';
            window.addEventListener('resize', resizeScope);
            el.innerHTML =
                '<div class="ayPlayer">' +
                '  <div class="ayPlayer-top">' +
                 '    <div class="ayPlayer-controls">' +
                 '      <div class="ayPlayer-logo"><img src="logo_ayplay.svg" alt="AY Player"></div>' +
                 '      <div class="ayPlayer-scope" id="' + containerId + '_scope">' +
                '          <canvas class="ayPlayer-scope-canvas" id="' + containerId + '_scope0"></canvas>' +
                '          <canvas class="ayPlayer-scope-canvas" id="' + containerId + '_scope1"></canvas>' +
                '          <canvas class="ayPlayer-scope-canvas" id="' + containerId + '_scope2"></canvas>' +
                '          <canvas class="ayPlayer-scope-canvas" id="' + containerId + '_scope3"></canvas>' +
                '          <canvas class="ayPlayer-scope-canvas" id="' + containerId + '_scope4"></canvas>' +
                '          <canvas class="ayPlayer-scope-canvas" id="' + containerId + '_scope5"></canvas>' +
                '          <canvas class="ayPlayer-scope-canvas" id="' + containerId + '_scope6"></canvas>' +
                '          <canvas class="ayPlayer-scope-canvas" id="' + containerId + '_scope7"></canvas>' +
                '          <canvas class="ayPlayer-scope-canvas" id="' + containerId + '_scope8"></canvas>' +
                '          <canvas class="ayPlayer-scope-canvas" id="' + containerId + '_scope9"></canvas>' +
                '          <canvas class="ayPlayer-scope-canvas" id="' + containerId + '_scope10"></canvas>' +
                '          <canvas class="ayPlayer-scope-canvas" id="' + containerId + '_scope11"></canvas>' +
                 '        </div>' +
                 '      <div class="ayPlayer-info">' +
                 '        <div class="ayPlayer-trackName" id="' + containerId + '_trackName"><div class="ayPlayer-trackAuthor">Author</div><div class="ayPlayer-trackTitle">Name Track</div></div>' +
                 '      </div>' +
                 '      <div class="ayPlayer-right">' +
                 '        <span class="ayPlayer-transport">' +
                '        <button class="ayPlayer-btn setup" title="Options" onclick="AYPlayer.showOptions()"><span class="icon"></span></button>' +
                '        <button class="ayPlayer-btn prev" title="Previous" onclick="AYPlayer.prev()"><span class="icon"></span></button>' +
                '        <button class="ayPlayer-btn play" id="' + containerId + '_playBtn" title="Play/Pause" onclick="AYPlayer.togglePlay()"><span class="icon"></span></button>' +
                '        <button class="ayPlayer-btn next" title="Next" onclick="AYPlayer.next()"><span class="icon"></span></button>' +
                '        </span>' +
                '        <div class="ayPlayer-volume" id="' + containerId + '_volume" title="Volume: ' + Math.round(volume * 100) + '">' +
'          <svg class="ayPlayer-volume-svg" width="36" height="36" viewBox="0 0 36 36">' +
'            <circle class="ayPlayer-volume-bg" cx="18" cy="18" r="14" stroke-width="4" fill="none" stroke="#003850" stroke-dasharray="65.97, 1000" stroke-dashoffset="0" transform="rotate(135 18 18)"/>' +
'            <circle class="ayPlayer-volume-progress" cx="18" cy="18" r="14" stroke-width="4" fill="none" stroke="#007890" stroke-linecap="round" stroke-dasharray="0, 1000" stroke-dashoffset="0" transform="rotate(135 18 18)"/>' +
'          </svg>' +
'          <span class="ayPlayer-volume-text">' + Math.round(volume * 100) + '</span>' +
'        </div>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
'  <div class="ayPlayer-waveform" id="' + containerId + '_waveform" onclick="AYPlayer.seek(event)">' +
'    <canvas class="ayPlayer-waveform-canvas" id="' + containerId + '_waveCanvas"></canvas>' +
    '    <div class="ayPlayer-waveform-played" id="' + containerId + '_wavePlayed"></div>' +
    '    <div class="ayPlayer-waveform-progress" id="' + containerId + '_wavePlayhead"></div>' +
'    <div class="ayPlayer-waveform-loading" id="' + containerId + '_waveLoading">' +
'      <div class="ayPlayer-waveform-loading-pulse" id="' + containerId + '_waveSpinner"></div>' +
'      <div class="ayPlayer-waveform-loading-text" id="' + containerId + '_waveLoadingText">Rendering waveform</div>' +
'    </div>' +
'    <img class="ayPlayer-waveform-splash" id="' + containerId + '_waveSplash" src="ayplay_1260x340px.png" alt="">' +
 '  </div>' +
                '  <div class="ayPlayer-info-mobile" id="' + containerId + '_trackName2">' +
                '    <div class="ayPlayer-trackName-mobile"><div class="ayPlayer-trackAuthor">Author</div><div class="ayPlayer-trackTitle">Name Track</div></div>' +
                '  </div>' +
                '  <div class="ayPlayer-timeline">' +
                '    <div class="ayPlayer-trackTotalTime" id="' + containerId + '_totalTime">00:00</div>' +
                '    <div class="ayPlayer-trackTime" id="' + containerId + '_trackTime" onclick="AYPlayer.toggleTime()">00:00</div>' +
                '  </div>' +
'  <div class="ayPlayer-playlist" id="' + containerId + '_playlist">' +
                '    <div class="ayPlayer-playlist-header" onclick="AYPlayer.onPlaylistTitleClick()" ondblclick="event.stopPropagation(); AYPlayer.onPlaylistTitleDblClick()">' +
                '      <div class="ayPlayer-playlist-header-top">' +
      '      <span class="ayPlayer-playlist-header-title" onclick="event.stopPropagation(); AYPlayer.onPlaylistTitleClick()" ondblclick="event.stopPropagation(); AYPlayer.onPlaylistTitleDblClick()"><button class="ayPlayer-btn search" id="' + containerId + '_trackLocateBtn" title="Show current track" onclick="event.stopPropagation(); AYPlayer.showCurrentTrack()"><svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 5.912c0-.155.037-.307.107-.443.23-.44.75-.599 1.163-.355l10.29 6.088c.14.083.254.206.332.355.229.44.08.995-.433 1.24l-10.29 6.088c-.127.075-.27.115-.415.115-.473 0-.855-.408-.855-.911V5.912z" fill="currentColor"/></svg></button><button class="ayPlayer-btn search" id="' + containerId + '_searchBtn" title="Search" onclick="event.stopPropagation(); AYPlayer.toggleSearch()"><svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11.5" cy="11.5" r="7" stroke="currentColor" stroke-width="2"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button> Playlist <span id="' + containerId + '_playlistCount">0</span> <span class="ayPlayer-playlist-header-ch" id="' + containerId + '_playlistLoad"></span></span>' +
      '      <span class="ayPlayer-playlist-header-center" onclick="event.stopPropagation(); AYPlayer.toggleAlphaOverlay()">' +
      '        <svg class="ayPlayer-filter-header-icon" viewBox="0 0 512 512" width="1em" height="1em" onclick="event.stopPropagation(); AYPlayer.toggleAlphaOverlay()"><path fill="#00B0C0" d="M472 168H40a24 24 0 0 1 0-48h432a24 24 0 0 1 0 48m-80 112H120a24 24 0 0 1 0-48h272a24 24 0 0 1 0 48m-96 112h-80a24 24 0 0 1 0-48h80a24 24 0 0 1 0 48"/></svg>' +
      '        <span id="' + containerId + '_filterDisplay"></span>' +
      '      </span>' +
      '      <span class="ayPlayer-playlist-header-right" onclick="event.stopPropagation()">' +
        '        <button class="ayPlayer-btn shuffle" id="' + containerId + '_shuffleBtn" title="Shuffle" onclick="event.stopPropagation(); AYPlayer.toggleShuffle()"><span class="icon"></span></button>' +
        '        <button class="ayPlayer-btn repeat" id="' + containerId + '_repeatBtn" title="Repeat" onclick="event.stopPropagation(); AYPlayer.toggleRepeat()"><span class="icon"></span></button>' +
        '        <button class="ayPlayer-btn playlist" id="' + containerId + '_playlistBtn" title="Favorites" onclick="event.stopPropagation(); AYPlayer.toggleFavorites()"><span class="icon"></span></button>' +
      '      </span>' +
'      </div>' +
'    </div>' +
                '    <div class="ayPlayer-search-bar" id="' + containerId + '_searchBar">' +
                '      <input class="ayPlayer-search-input" id="' + containerId + '_searchInput" type="text" placeholder="Search in library..." oninput="AYPlayer.onSearchInput(this.value)" onkeydown="if(event.key===\'Escape\')AYPlayer.toggleSearch()">' +
                '      <button class="ayPlayer-search-clear" onclick="AYPlayer.clearSearch()" title="Clear">&times;</button>' +
                '    </div>' +
                '    <div class="ayPlayer-playlist-items" id="' + containerId + '_playlistItems"></div>' +
                '  </div>' +
                '  <div class="ayPlayer-alpha-overlay" id="' + containerId + '_alphaOverlay" onclick="AYPlayer.toggleAlphaOverlay()">' +
                '    <div class="ayPlayer-alpha-overlay-content" id="' + containerId + '_alphaOverlayContent"></div>' +
                '  </div>' +
                 '  <div class="ayPlayer-bottom-controls" id="' + containerId + '_bottomControls">' +
                 '    <div class="ayPlayer-bottom-top">' +
                 '      <div class="ayPlayer-trackTotalTime" id="' + containerId + '_totalTimeM">00:00</div>' +
                 '      <button class="ayPlayer-btn-bottom-toggle" id="' + containerId + '_bottomToggle" onclick="event.stopPropagation(); AYPlayer.toggleBottomControls()"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/></svg></button>' +
                 '      <div class="ayPlayer-trackTime" id="' + containerId + '_trackTimeM" onclick="AYPlayer.toggleTime()">00:00</div>' +
                 '    </div>' +
                 '    <div class="ayPlayer-bottom-controls-inner" id="' + containerId + '_bottomInner">' +
                '    <button class="ayPlayer-btn setup" title="Options" onclick="AYPlayer.showOptions()"><span class="icon"></span></button>' +
                '    <span class="ayPlayer-transport">' +
                '    <button class="ayPlayer-btn prev" title="Previous" onclick="AYPlayer.prev()"><span class="icon"></span></button>' +
                '    <button class="ayPlayer-btn play" id="' + containerId + '_playBtn2" title="Play/Pause" onclick="AYPlayer.togglePlay()"><span class="icon"></span></button>' +
                '    <button class="ayPlayer-btn next" title="Next" onclick="AYPlayer.next()"><span class="icon"></span></button>' +
                '    </span>' +
                '    <div class="ayPlayer-volume" id="' + containerId + '_volume2" title="Volume: ' + Math.round(volume * 100) + '">' +
'          <svg class="ayPlayer-volume-svg" width="36" height="36" viewBox="0 0 36 36">' +
'            <circle class="ayPlayer-volume-bg" cx="18" cy="18" r="14" stroke-width="4" fill="none" stroke="#003850" stroke-dasharray="65.97, 1000" stroke-dashoffset="0" transform="rotate(135 18 18)"/>' +
'            <circle class="ayPlayer-volume-progress" cx="18" cy="18" r="14" stroke-width="4" fill="none" stroke="#007890" stroke-linecap="round" stroke-dasharray="0, 1000" stroke-dashoffset="0" transform="rotate(135 18 18)"/>' +
'          </svg>' +
'          <span class="ayPlayer-volume-text">' + Math.round(volume * 100) + '</span>' +
'        </div>' +
                '    </div>' +
                '  </div>' +
                '  <div class="ayPlayer-stems-modal" id="' + containerId + '_stemsModal">' +
                '    <div class="ayPlayer-stems-modal-bg"></div>' +
                '    <div class="ayPlayer-stems-modal-box">' +
                '      <button class="ayPlayer-stems-modal-close" id="' + containerId + '_stemsClose">&times;</button>' +
                '      <div class="ayPlayer-stems-modal-title">Exporting Stems</div>' +
                '      <div class="ayPlayer-stems-modal-ring">' +
                '        <svg viewBox="0 0 48 48" width="64" height="64">' +
                '          <circle cx="24" cy="24" r="20" fill="none" stroke="#002840" stroke-width="4"/>' +
                                 '          <circle class="ayPlayer-stems-complete" id="' + containerId + '_stemsComplete" cx="24" cy="24" r="20" fill="none" stroke="#00D0E0" stroke-width="4" stroke-dasharray="125.66" stroke-dashoffset="125.66" stroke-linecap="round" transform="rotate(-90 24 24)"/>' +
                '        </svg>' +
                '      </div>' +
                '      <div class="ayPlayer-stems-modal-label" id="' + containerId + '_stemsLabel">0%</div>' +
                '    </div>' +
                '  </div>' +
                '</div>' +
                '<div class="ayPlayer-options" id="' + containerId + '_options" onclick="AYPlayer.hideOptions()" oncontextmenu="AYPlayer.hideOptions(); return false">' +
                '  <div class="ayPlayer-options-content" onclick="event.stopPropagation()">' +
                '    <div class="ayPlayer-options-title"><button class="ayPlayer-alpha-overlay-close ayPlayer-options-close" onclick="event.stopPropagation(); AYPlayer.hideOptions()">&times;</button><div>Options</div></div>' +
                '    <div class="ayPlayer-options-body" id="' + containerId + '_mix">' +
                '      <div class="ayPlayer-mix-row">' +
                '        <span class="ayPlayer-mix-label">Chip:</span>' +
                '        <div class="ayPlayer-mix-btns">' +
                '        <button class="ayPlayer-options-chip-btn active" data-chip="ym" onclick="AYPlayer.setChipType(\'ym\')">YM2149F</button>' +
                '        <button class="ayPlayer-options-chip-btn" data-chip="ay" onclick="AYPlayer.setChipType(\'ay\')">AY-3-8910A</button>' +
                '        </div>' +
                '      </div>' +
                '      <div class="ayPlayer-options-divider"></div>' +
                '      <div class="ayPlayer-mix-row">' +
                '        <span class="ayPlayer-mix-label">Arrange:</span>' +
                '        <div class="ayPlayer-arrange-btns">' +
                '          <div class="ayPlayer-arrange-row" style="justify-content:space-between">' +
                '            <span style="display:flex;gap:6px">' +
                '            <button class="ayPlayer-options-chip-btn active" data-mix="0" onclick="AYPlayer.setMixing(this)">ABC</button>' +
                '            <button class="ayPlayer-options-chip-btn" data-mix="1" onclick="AYPlayer.setMixing(this)">ACB</button>' +
                '            <button class="ayPlayer-options-chip-btn" data-mix="2" onclick="AYPlayer.setMixing(this)">BAC</button>' +
                '            </span>' +
                '            <button class="ayPlayer-options-chip-btn" data-mix="6" onclick="AYPlayer.setMixing(this)">Mono</button>' +
                '          </div>' +
                '          <div class="ayPlayer-arrange-row">' +
                '            <button class="ayPlayer-options-chip-btn" data-mix="3" onclick="AYPlayer.setMixing(this)">BCA</button>' +
                '            <button class="ayPlayer-options-chip-btn" data-mix="4" onclick="AYPlayer.setMixing(this)">CAB</button>' +
                '            <button class="ayPlayer-options-chip-btn" data-mix="5" onclick="AYPlayer.setMixing(this)">CBA</button>' +
                '          </div>' +
                '        </div>' +
                '      </div>' +
                '      <div class="ayPlayer-options-divider"></div>' +
                '      <div class="ayPlayer-mix-row">' +
                '        <span class="ayPlayer-mix-label">Freq chip:</span>' +
                '        <div class="ayPlayer-mix-btns">' +
                '        <button class="ayPlayer-options-chip-btn" data-clock="0" onclick="AYPlayer.setClock(0)">Auto</button>' +
                '        <button class="ayPlayer-options-chip-btn" data-clock="1773400" onclick="AYPlayer.setClock(1773400)">1.7734M</button>' +
                '        <button class="ayPlayer-options-chip-btn" data-clock="1750000" onclick="AYPlayer.setClock(1750000)">1.7500M</button>' +
                '        <button class="ayPlayer-options-chip-btn" data-clock="2000000" onclick="AYPlayer.setClock(2000000)">2.0000M</button>' +
                '        <button class="ayPlayer-options-chip-btn" data-clock="1000000" onclick="AYPlayer.setClock(1000000)">1.0000M</button>' +
                '        </div>' +
                '      </div>' +
                '      <div class="ayPlayer-options-divider"></div>' +
                '      <div class="ayPlayer-mix-row">' +
                '        <span class="ayPlayer-mix-label">Freq int:</span>' +
                '        <div class="ayPlayer-mix-btns">' +
                '        <button class="ayPlayer-options-chip-btn" data-int="0" onclick="AYPlayer.setIntFreq(0)">Auto</button>' +
                '        <button class="ayPlayer-options-chip-btn" data-int="50" onclick="AYPlayer.setIntFreq(50)">50.000</button>' +
                '        <button class="ayPlayer-options-chip-btn" data-int="48.828" onclick="AYPlayer.setIntFreq(48.828)">48.828</button>' +
                '        <input class="ayPlayer-int-input" id="' + containerId + '_intInput" type="text" inputmode="decimal" placeholder="Hz" onchange="AYPlayer.setIntFreq(parseFloat(this.value)||0)" onkeydown="if(event.key===\'Enter\')AYPlayer.setIntFreq(parseFloat(this.value)||0)" />' +
                '        </div>' +
                '      </div>' +
                '      <div class="ayPlayer-options-divider"></div>' +
                '      <div class="ayPlayer-mix-row">' +
                '        <span class="ayPlayer-mix-label">FIR filter:</span>' +
                '        <div class="ayPlayer-mix-btns">' +
                '        <button class="ayPlayer-options-chip-btn" data-fir="1" onclick="AYPlayer.setFir(1)">ON</button>' +
                '        <button class="ayPlayer-options-chip-btn" data-fir="0" onclick="AYPlayer.setFir(0)">OFF</button>' +
                '        </div>' +
                '      </div>' +
                '      <div class="ayPlayer-options-divider"></div>' +
                '      <div class="ayPlayer-mix-row">' +
                '        <span class="ayPlayer-mix-label">Crossfeed:</span>' +
                '        <div class="ayPlayer-mix-btns">' +
                '        <button class="ayPlayer-options-chip-btn" data-xf="1" onclick="AYPlayer.setXf(1)">ON</button>' +
                '        <button class="ayPlayer-options-chip-btn" data-xf="0" onclick="AYPlayer.setXf(0)">OFF</button>' +
                '        </div>' +
                '      </div>' +
                '      <div class="ayPlayer-options-divider"></div>' +
                '      <div class="ayPlayer-mix-row">' +
                '        <span class="ayPlayer-mix-label">Room:</span>' +
                '        <div class="ayPlayer-mix-btns">' +
                '        <button class="ayPlayer-options-chip-btn" data-room="1" onclick="AYPlayer.setRoom(1)">ON</button>' +
                '        <button class="ayPlayer-options-chip-btn" data-room="0" onclick="AYPlayer.setRoom(0)">OFF</button>' +
                '        </div>' +
                '      </div>' +
                '      <div class="ayPlayer-options-divider"></div>' +
                (_isMobile ?
                '      <div class="ayPlayer-mix-row">' +
                '        <span class="ayPlayer-mix-label">Scope:</span>' +
                '        <div class="ayPlayer-mix-btns">' +
                '        <button class="ayPlayer-options-chip-btn" data-scope="1" onclick="AYPlayer.setScope(1)">ON</button>' +
                '        <button class="ayPlayer-options-chip-btn" data-scope="0" onclick="AYPlayer.setScope(0)">OFF</button>' +
                '        </div>' +
                '      </div>' +
                '      <div class="ayPlayer-options-divider"></div>' : '') +
                '      <div class="ayPlayer-mix-row">' +
                '        <span class="ayPlayer-mix-label">Waveform:</span>' +
                '        <div class="ayPlayer-mix-btns">' +
                '        <button class="ayPlayer-options-chip-btn" data-wave="channels" onclick="AYPlayer.setWaveformMode(\'channels\')">Stems</button>' +
                '        <button class="ayPlayer-options-chip-btn" data-wave="mix" onclick="AYPlayer.setWaveformMode(\'mix\')">Mix</button>' +
                '        </div>' +
                '      </div>' +
                '      <div class="ayPlayer-mix-row">' +
                '        <span class="ayPlayer-mix-label">Wave height:</span>' +
                '        <input class="ayPlayer-wave-range" type="range" min="100" max="200" step="10" value="' + Math.round(waveformScale * 100) + '" oninput="AYPlayer.setWaveformScale(this.value)">' +
                '        <span class="ayPlayer-wave-range-val" id="' + containerId + '_waveScaleVal">' + Math.round(waveformScale * 100) + '%</span>' +
                '      </div>' +
                '      <div class="ayPlayer-options-divider"></div>' +
                '      <div class="ayPlayer-options-divider"></div>' +

                  '      <div class="ayPlayer-mix-row">' +
                  '        <span class="ayPlayer-mix-label">Playlist:</span>' +
                  '        <div class="ayPlayer-mix-btns">' +
                  '        <button class="ayPlayer-options-chip-btn active" data-showfmt="1" onclick="AYPlayer.toggleShowFormat()" title="Show format">' + (_isMobile ? 'mod' : 'Format') + '</button>' +
                  '        <button class="ayPlayer-options-chip-btn active" data-showch="1" onclick="AYPlayer.toggleShowChannels()" title="Show channels">' + (_isMobile ? 'ch' : 'Channels') + '</button>' +
                  '        </div>' +
                  '      </div>' +
                  '      <div class="ayPlayer-options-divider"></div>' +
                  '      <div class="ayPlayer-options-about">AY Player &copy; 2026</div>' +
                 '    </div>' +
                '  </div>' +
                '</div>';
            _waveformContainer = document.getElementById(containerId + '_waveform');
            if (window.ResizeObserver) {
                var ro = new ResizeObserver(function() {
                    var c = _waveformContainer && _waveformContainer.querySelector('canvas');
                    if (c) {
                        _cachedWaveWidth = c.parentNode.clientWidth;
                        _cachedWaveHeight = c.parentNode.clientHeight;
                        if (waveformData) drawWaveform();
                    }
                });
                ro.observe(_waveformContainer);
            } else {
                window.addEventListener('resize', function() {
                    var c = document.getElementById(containerId + '_waveCanvas');
                    if (c) {
                        _cachedWaveWidth = c.parentNode.clientWidth;
                        _cachedWaveHeight = c.parentNode.clientHeight;
                        if (waveformData) drawWaveform();
                    }
                });
            }
            restoreState();
            if (_waveformContainer) _waveformContainer.classList.toggle('is-mix', waveformMode === 'mix');
            if (_waveformContainer) _waveformContainer.style.setProperty('--wave-scale', waveformScale);
            var initWaveRange = document.querySelector('#' + containerId + '_mix .ayPlayer-wave-range');
            if (initWaveRange) initWaveRange.style.setProperty('--fill', Math.round((waveformScale - 1) * 100) + '%');
            initScope();
            var scopeEl = document.getElementById(containerId + '_scope');
            if (scopeEl && _isMobile) scopeEl.style.display = scopeEnabled ? '' : 'none';
            if (_isMobile && !scopeEnabled) resetScope();
            var _playlistEl = document.getElementById(containerId + '_playlistItems');
            if (_playlistEl) {
                var _scrollTimer = null;
                _playlistEl.addEventListener('scroll', function() {
                    _isScrolling = true;
                    if (_scrollTimer) clearTimeout(_scrollTimer);
                    _scrollTimer = setTimeout(function() { _isScrolling = false; }, 200);
                }, { passive: true });
            }
            setupVolume();
            updateFavBtn();
            if (shuffle) { var sb = document.getElementById(containerId + '_shuffleBtn'); if (sb) sb.classList.add('active'); }
            if (repeat) { var rb = document.getElementById(containerId + '_repeatBtn'); if (rb) rb.classList.add('active'); }
            updateFilterDisplay();
            var clockBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-clock]');
            for (var i = 0; i < clockBtns.length; i++) {
                clockBtns[i].classList.toggle('active', parseInt(clockBtns[i].dataset.clock) === clockSelect);
            }
            _syncIntFreqUI();
            var waveBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-wave]');
            for (var i = 0; i < waveBtns.length; i++) {
                waveBtns[i].classList.toggle('active', waveBtns[i].dataset.wave === waveformMode);
            }
            var firBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-fir]');
            for (var i = 0; i < firBtns.length; i++) {
                firBtns[i].classList.toggle('active', parseInt(firBtns[i].dataset.fir) === (firEnabled ? 1 : 0));
            }
            var xfBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-xf]');
            for (var i = 0; i < xfBtns.length; i++) {
                xfBtns[i].classList.toggle('active', parseInt(xfBtns[i].dataset.xf) === (xfEnabled ? 1 : 0));
            }
            var scopeBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-scope]');
            for (var i = 0; i < scopeBtns.length; i++) {
                scopeBtns[i].classList.toggle('active', parseInt(scopeBtns[i].dataset.scope) === (scopeEnabled ? 1 : 0));
            }
            var fpsBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-fps]');
            for (var i = 0; i < fpsBtns.length; i++) {
                fpsBtns[i].classList.toggle('active', parseInt(fpsBtns[i].dataset.fps) === scopeFps);
            }
            var fmtBtn = document.querySelector('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-showfmt]');
            if (fmtBtn) fmtBtn.classList.toggle('active', showFormat);
            var chBtn = document.querySelector('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-showch]');
            if (chBtn) chBtn.classList.toggle('active', showChannels);
            document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'visible') {
                    if (playing && !rafId) rafId = requestAnimationFrame(rafLoop);
                    var canvas = document.getElementById(containerId + '_waveCanvas');
                    if (!waveformData && _dumpData && playing && canvas) {
                        var entry = playlist[currentId];
                        if (entry) {
                            generatePt3Waveform(
                                _dumpData.dump, _dumpData.dumpLen,
                                _dumpData.frameRate, _dumpData.clock,
                                _dumpData.chipCount || 1, entry.file,
                                _dumpData.loopFrame, 0, -1, 0, false, null
                            );
                        }
                    } else if (waveformData) {
                        // Force full redraw + immediate position/time update
                        drawWaveform();
                        updateProgress();
                    }
                } else if (document.hidden) {
                    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
                }
            });
            api.destroyOnUnload();
            return api;
        },

        setPlaylist: function(tracks) {
            var prevCurrentFile = null;
            if (playlist.length > 0 && currentId >= 0 && currentId < playlist.length) {
                prevCurrentFile = playlist[currentId].file;
            } else if (restoredCurrentFile) {
                prevCurrentFile = restoredCurrentFile;
            }
            playlist = tracks;
            _itemMeta = null;
            _bumpFilterVersion();
            for (var i = 0; i < playlist.length; i++) {
                if (playlist[i].file && playlist[i].file.indexOf('%23') >= 0)
                    playlist[i].file = playlist[i].file.replace(/%23/g, '#');
            }
            playlist.sort(function(a, b) {
                var fa = a.author || (function(f) { var s = f.lastIndexOf('/'); return s > 0 ? f.substring(0, s) : '/'; })(a.file);
                var fb = b.author || (function(f) { var s = f.lastIndexOf('/'); return s > 0 ? f.substring(0, s) : '/'; })(b.file);
                var ua = fa.charAt(0) === '_' ? 0 : 1;
                var ub = fb.charAt(0) === '_' ? 0 : 1;
                if (ua !== ub) return ua - ub;
                var lfa = fa.toLowerCase(), lfb = fb.toLowerCase();
                if (lfa < lfb) return -1;
                if (lfa > lfb) return 1;
                if (fa < fb) return -1;
                if (fa > fb) return 1;
                var sa = a.section || '';
                var sb = b.section || '';
                if (!sa && sb) return -1;
                if (sa && !sb) return 1;
                var lsa = sa.toLowerCase(), lsb = sb.toLowerCase();
                if (lsa < lsb) return -1;
                if (lsa > lsb) return 1;
                if (sa < sb) return -1;
                if (sa > sb) return 1;
                return (a.title || a.name || a.file).localeCompare(b.title || b.name || b.file);
            });
            function guessChannels(track) {
                if (track.modules) return track.modules * 3;
                if (track.turbo) return 6;
                var path = track.file || '';
                var title = track.title || '';
                var name = track.name || '';
                var author = track.author || '';
                if (/\[ts\]/i.test(title) || /\[ts\]|[-_]ts[\.\-]/i.test(name)) return 6;
                if (/\b6ch\b/i.test(path) || /\b6ch\b/i.test(title)) return 6;
                if (/turbosound/i.test(path) || /turbosound/i.test(author)) return 6;
                if (/\[9ch\]|3AY/i.test(path) || /\b9ch\b/i.test(title)) return 9;
                if (/\.tfc$/i.test(path)) return 6;
                if (/\.psg$/i.test(path)) return 3;
                return 3;
            }
            for (var i = 0; i < playlist.length; i++) {
                if (playlist[i].channels == null) playlist[i].channels = guessChannels(playlist[i]);
            }
            shuffleOrder = [];
            for (var i = 0; i < playlist.length; i++) shuffleOrder[i] = i;
            shuffleArray(shuffleOrder);
            shuffleId = 0;
            if (playlist.length > 0) {
                if (prevCurrentFile) {
                    var found = false;
                    for (var j = 0; j < playlist.length; j++) {
                        if (playlist[j].file === prevCurrentFile) { currentId = j; found = true; break; }
                    }
                    if (!found) currentId = 0;
                } else {
                    currentId = 0;
                }
            }
            setTimeout(function() {
                renderPlaylist();
                if (playlist.length > 0) {
                    if (_initialView) {
                        var _initList = document.getElementById(containerId + '_playlistItems');
                        if (_initList) _initList.scrollTop = 0;
                    } else {
                        var item = document.querySelector('.ayPlayer-playlist-item[data-id="' + currentId + '"]');
                        if (item) item.scrollIntoView({block:'nearest'});
                    }
                    if (playing && _urlTrackOverride < 0) loadAndPlay(currentId);
                }
                _initialView = false;
            }, 0);
            return api;
        },

        play: function(id) {
            if (typeof id !== 'undefined') {
                loadAndPlay(id);
            } else if (playlist.length > 0) {
                loadAndPlay(currentId);
            }
            return api;
        },

        togglePlay: function() {
            if (playing) {
                playing = false;
                updatePlayBtn();
                _startFade(0, 0.3, function() {
                    if (audioContext && audioContext.state === 'running') audioContext.suspend();
                    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
                    stopEndCheck();
                    releaseWakeLock();
                    if (onPlayStateChange) onPlayStateChange(false, currentId);
                    saveState();
                });
            } else {
                if (song) {
                    if (audioContext && audioContext.state === 'suspended') {
                        _scopeFade = 0;
                        audioContext.resume();
                        playing = true;
                        updatePlayBtn();
                        rafId = requestAnimationFrame(rafLoop);
                        startEndCheck();
                        requestWakeLock();
                        _startFade(1, 0.3, null);
                        if (onPlayStateChange) onPlayStateChange(true, currentId);
                    } else {
                        loadAndPlay(currentId, true);
                    }
                } else if (playlist.length > 0) {
                    loadAndPlay(currentId);
                }
            }
        },

        prev: function() {
            if (favoritesOnly) {
                var found = false;
                for (var i = currentId - 1; i >= 0; i--) {
                    if (favorites[i] && isTrackVisible(i)) { loadAndPlay(i); found = true; break; }
                }
                if (!found) {
                    for (var i = playlist.length - 1; i > currentId; i--) {
                        if (favorites[i] && isTrackVisible(i)) { loadAndPlay(i); found = true; break; }
                    }
                }
                if (!found) { loadAndPlay(currentId); }
                return;
            }
            if (shuffle) {
                for (var s = 0; s < shuffleOrder.length; s++) {
                    shuffleId--;
                    if (shuffleId < 0) shuffleId = shuffleOrder.length - 1;
                    if (isTrackVisible(shuffleOrder[shuffleId])) { loadAndPlay(shuffleOrder[shuffleId]); return; }
                }
                loadAndPlay(shuffleOrder[shuffleId]);
            } else {
                var startId = currentId - 1;
                if (startId < 0) startId = playlist.length - 1;
                var newId = startId;
                while (!isTrackVisible(newId)) {
                    newId--;
                    if (newId < 0) newId = playlist.length - 1;
                    if (newId === startId) break;
                }
                loadAndPlay(newId);
            }
        },

        next: function() {
            if (favoritesOnly) {
                var found = false;
                for (var i = currentId + 1; i < playlist.length; i++) {
                    if (favorites[i] && isTrackVisible(i)) { loadAndPlay(i); found = true; break; }
                }
                if (!found) {
                    for (var i = 0; i < currentId; i++) {
                        if (favorites[i] && isTrackVisible(i)) { loadAndPlay(i); found = true; break; }
                    }
                }
                if (!found) { loadAndPlay(currentId); }
                return;
            }
            if (shuffle) {
                for (var s = 0; s < shuffleOrder.length; s++) {
                    shuffleId++;
                    if (shuffleId >= shuffleOrder.length) shuffleId = 0;
                    if (isTrackVisible(shuffleOrder[shuffleId])) { loadAndPlay(shuffleOrder[shuffleId]); return; }
                }
                loadAndPlay(shuffleOrder[shuffleId]);
            } else {
                var startId = currentId + 1;
                if (startId >= playlist.length) startId = 0;
                var newId = startId;
                while (!isTrackVisible(newId)) {
                    newId++;
                    if (newId >= playlist.length) newId = 0;
                    if (newId === startId) break;
                }
                loadAndPlay(newId);
            }
        },

        toggleShuffle: function() {
            shuffle = !shuffle;
            var btn = document.getElementById(containerId + '_shuffleBtn');
            if (btn) btn.classList.toggle('active', shuffle);
            saveState();
        },

        toggleRepeat: function() {
            repeat = !repeat;
            var btn = document.getElementById(containerId + '_repeatBtn');
            if (btn) btn.classList.toggle('active', repeat);
            if (_workletNode) {
                _workletNode.port.postMessage({ type: 'repeat', repeat: repeat });
            }
            if (_streamMode) _streamReRender();
            saveState();
        },

        toggleTime: function() {
            timeElapsed = !timeElapsed;
            if (onTimeUpdate) onTimeUpdate(getTimeDisplay());
        },

        seek: function(e) {
            if (!song) return;
            var rect = e.currentTarget.getBoundingClientRect();
            var x = (e.clientX - rect.left) / rect.width;
            if (x < 0) x = 0;

            var fc = pt3FrameCount || song.getFrameCount();
            playFrame = Math.round(x * fc);
            _seekTarget = playFrame; _seekTime = performance.now();
            _scopePosTime = -1;
            updateProgress();
            if (_streamMode) {
                _streamSeek(x);
            } else if (_workletNode) {
                _workletNode.port.postMessage({ type: 'setProgress', progress: x });
            }
            if (onTimeUpdate) onTimeUpdate(getTimeDisplay());
        },

        setMixing: function(el) {
            var btns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-mix]');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', btns[i] === el);
            }
            var val = parseInt(el.dataset.mix);
            if (val === 6) {
                isMono = true;
                chipMode = (isYM ? 0 : 6);
            } else {
                isMono = false;
                chipMode = (isYM ? 0 : 6) + val;
            }
            if (_workletNode) {
                _workletNode.port.postMessage({ type: 'chipType', isYM: isYM });
            }
            updatePan();
            saveState();
        },
        setFir: function(on) {
            firEnabled = on === 1;
            var btns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-fir]');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', parseInt(btns[i].dataset.fir) === (firEnabled ? 1 : 0));
            }
            if (_workletNode) {
            _workletNode.port.postMessage({ type: 'fir', enabled: firEnabled });
            }
            if (_streamMode) _streamReRender();
            saveState();
        },
        setXf: function(on) {
            xfEnabled = on === 1;
            var btns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-xf]');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', parseInt(btns[i].dataset.xf) === (xfEnabled ? 1 : 0));
            }
            if (_workletNode) {
                _workletNode.port.postMessage({ type: 'xf', enabled: xfEnabled });
            }
            saveState();
        },
        setRoom: function(on) {
            roomEnabled = on === 1;
            var btns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-room]');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', parseInt(btns[i].dataset.room) === (roomEnabled ? 1 : 0));
            }
            _applyRoomGain();
            saveState();
        },
        setScope: function(on) {
            scopeEnabled = on === 1;
            var btns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-scope]');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', parseInt(btns[i].dataset.scope) === (scopeEnabled ? 1 : 0));
            }
            var scopeEl = document.getElementById(containerId + '_scope');
            if (scopeEl && _isMobile) scopeEl.style.display = scopeEnabled ? '' : 'none';
            if (_isMobile && scopeEnabled) {
                resizeScope();
                drawScope();
            } else if (_isMobile) {
                resetScope();
            }
            saveState();
        },
        setClock: function(hz) {
            clockSelect = hz;
            var btns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-clock]');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', parseInt(btns[i].dataset.clock) === hz);
            }
            saveState();
            var sr = audioContext ? audioContext.sampleRate : 44100;
            var effectiveHz = hz || (song ? song.getClockRate() : 1773400);
            if (_workletNode) {
                _workletNode.port.postMessage({ type: 'clock', clock: effectiveHz });
            }
            if (_streamMode) _streamReRender();
        },
        setIntFreq: function(frq) {
            intFreqSelect = frq;
            if (frq === 0) {
                _autoIntFreq = true;
            } else {
                var want200 = /200%/i.test((playlist[currentId] && playlist[currentId].file) || '');
                _autoIntFreq = (frq === 200) && want200;
            }
            _syncIntFreqUI();
            saveState();
            if (_workletNode && song) {
                var effectiveFr = frq || song.getFrameRate();
                _workletNode.port.postMessage({ type: 'frameRate', frameRate: effectiveFr });
            }
            if (_streamMode) _streamReRender();
        },
        setWaveformMode: function(mode) {
            waveformMode = mode;
            var btns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-wave]');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', btns[i].dataset.wave === mode);
            }
            saveState();
            var wfEl = _waveformContainer || document.getElementById(containerId + '_waveform');
            if (wfEl) wfEl.classList.toggle('is-mix', mode === 'mix');
            _cachedWaveHeight = 0;
            drawWaveform();
        },
        setWaveformScale: function(val) {
            waveformScale = Math.max(1, Math.min(2, (parseFloat(val) || 100) / 100));
            if (_waveformContainer) _waveformContainer.style.setProperty('--wave-scale', waveformScale);
            var valEl = document.getElementById(containerId + '_waveScaleVal');
            if (valEl) valEl.textContent = Math.round(waveformScale * 100) + '%';
            var rangeEl = document.querySelector('#' + containerId + '_mix .ayPlayer-wave-range');
            if (rangeEl) rangeEl.style.setProperty('--fill', Math.round((waveformScale - 1) * 100) + '%');
            _cachedWaveHeight = 0;
            drawWaveform();
            saveState();
        },
        setScopeFps: function(fps) {
            scopeFps = fps;
            _adaptiveFps = fps;
            _lastRafT = 0;
            scopeFrame = 0;
            var btns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-fps]');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', parseInt(btns[i].dataset.fps) === fps);
            }
            if (_workletNode) {
                _workletNode.port.postMessage({ type: 'fps', fps: fps });
            }
            saveState();
        },
        debug: function(on) {
            _debug = !!on;
            if (typeof localStorage !== 'undefined') {
                try { localStorage.setItem('ayp_debug', _debug ? '1' : '0'); } catch (e) {}
            }
            if (!_debug && _dbgPanel && _dbgPanel.parentNode) {
                _dbgPanel.parentNode.removeChild(_dbgPanel);
                _dbgPanel = null;
            }
            if (_debug && !rafId && (playing || _fadeTarget >= 0)) rafId = requestAnimationFrame(rafLoop);
        },
        toggleShowFormat: function() {
            showFormat = !showFormat;
            var btn = document.querySelector('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-showfmt]');
            if (btn) btn.classList.toggle('active', showFormat);
            renderPlaylist(true);
            saveState();
        },
        toggleShowChannels: function() {
            showChannels = !showChannels;
            var btn = document.querySelector('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-showch]');
            if (btn) btn.classList.toggle('active', showChannels);
            renderPlaylist(true);
            saveState();
        },
        setChipType: function(type) {
            isYM = (type === 'ym');
            var arr = chipMode % 6;
            chipMode = isYM ? arr : arr + 6;
            if (_workletNode) {
                _workletNode.port.postMessage({ type: 'chipType', isYM: isYM });
            }
            updatePan();
            var btns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-chip]');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', btns[i].dataset.chip === type);
            }
            saveState();
        },

        showOptions: function() {
            var el = document.getElementById(containerId + '_options');
            if (el) el.classList.add('active');
            var btns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-chip]');
            var cur = isYM ? 'ym' : 'ay';
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', btns[i].dataset.chip === cur);
            }
            var mixBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-mix]');
            var targetMix = isMono ? 6 : (chipMode % 6);
            for (var i = 0; i < mixBtns.length; i++) {
                mixBtns[i].classList.toggle('active', parseInt(mixBtns[i].dataset.mix) === targetMix);
            }
            var clockBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-clock]');
            for (var i = 0; i < clockBtns.length; i++) {
                clockBtns[i].classList.toggle('active', parseInt(clockBtns[i].dataset.clock) === clockSelect);
            }
            var intBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-int]');
            for (var i = 0; i < intBtns.length; i++) {
                intBtns[i].classList.toggle('active', parseFloat(intBtns[i].dataset.int) === intFreqSelect);
            }
            var waveBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-wave]');
            for (var i = 0; i < waveBtns.length; i++) {
                waveBtns[i].classList.toggle('active', waveBtns[i].dataset.wave === waveformMode);
            }
            var firBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-fir]');
            for (var i = 0; i < firBtns.length; i++) {
                firBtns[i].classList.toggle('active', parseInt(firBtns[i].dataset.fir) === (firEnabled ? 1 : 0));
            }
            var xfBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-xf]');
            for (var i = 0; i < xfBtns.length; i++) {
                xfBtns[i].classList.toggle('active', parseInt(xfBtns[i].dataset.xf) === (xfEnabled ? 1 : 0));
            }
            var roomBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-room]');
            for (var i = 0; i < roomBtns.length; i++) {
                roomBtns[i].classList.toggle('active', parseInt(roomBtns[i].dataset.room) === (roomEnabled ? 1 : 0));
            }
            var scopeBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-scope]');
            for (var i = 0; i < scopeBtns.length; i++) {
                scopeBtns[i].classList.toggle('active', parseInt(scopeBtns[i].dataset.scope) === (scopeEnabled ? 1 : 0));
            }
            var fpsBtns = document.querySelectorAll('#' + containerId + '_mix .ayPlayer-options-chip-btn[data-fps]');
            for (var i = 0; i < fpsBtns.length; i++) {
                fpsBtns[i].classList.toggle('active', parseInt(fpsBtns[i].dataset.fps) === scopeFps);
            }
            var waveRange = document.querySelector('#' + containerId + '_mix .ayPlayer-wave-range');
            if (waveRange) {
                waveRange.value = Math.round(waveformScale * 100);
                waveRange.style.setProperty('--fill', Math.round((waveformScale - 1) * 100) + '%');
            }
            var waveScaleVal = document.getElementById(containerId + '_waveScaleVal');
            if (waveScaleVal) waveScaleVal.textContent = Math.round(waveformScale * 100) + '%';
        },

        hideOptions: function() {
            var el = document.getElementById(containerId + '_options');
            if (el) el.classList.remove('active');
        },

        setFilter: function(format) {
            filterFormat = format;
            _bumpFilterVersion();
            if (!playlist || playlist.length === 0) return;
            renderPlaylist(true);
            AYPlayer.updateAlphaOverlay();
            saveState();
        },

        setChFilter: function(ch) {
            chFilter = ch;
            _bumpFilterVersion();
            if (!playlist || playlist.length === 0) return;
            renderPlaylist(true);
            AYPlayer.updateAlphaOverlay();
            saveState();
        },

        setAlphaFilter: function(letter) {
            alphaFilter = letter;
            alphaMode = 'track';
            _bumpFilterVersion();
            if (!playlist || playlist.length === 0) return;
            renderPlaylist(true);
            AYPlayer.updateAlphaOverlay();
            saveState();
        },

        setFolderAlphaFilter: function(letter) {
            folderAlphaFilter = letter;
            alphaMode = 'folder';
            _bumpFilterVersion();
            if (!playlist || playlist.length === 0) return;
            renderPlaylist(true);
            AYPlayer.updateAlphaOverlay();
            saveState();
        },

        setAlphaMode: function(mode) {
            alphaMode = mode;
        },

        updateAlphaOverlay: function() {
            var overlay = document.getElementById(containerId + '_alphaOverlay');
            if (!overlay || !overlay.classList.contains('active')) return;
            var content = document.getElementById(containerId + '_alphaOverlayContent');
            if (!content) return;
            var btns = content.querySelectorAll('.ayPlayer-alpha-overlay-btn');
            for (var i = 0; i < btns.length; i++) {
                var btn = btns[i];
                var alpha = btn.dataset.alpha;
                var ch = btn.dataset.ch;
                if (alpha !== undefined) {
                    var setter = btn.closest('.ayPlayer-alpha-overlay-grid').dataset.set;
                    var current = setter === 'folder' ? folderAlphaFilter : alphaFilter;
                    btn.classList.toggle('active', alpha === current);
                } else if (ch !== undefined) {
                    btn.classList.toggle('active', ch === chFilter);
                } else {
                    var txt = btn.textContent.trim().toLowerCase();
                    btn.classList.toggle('active', txt === filterFormat);
                }
            }
        },

        rebuildAlphaOverlay: function() {
            var overlay = document.getElementById(containerId + '_alphaOverlay');
            var content = document.getElementById(containerId + '_alphaOverlayContent');
            if (content) content.innerHTML = '';
            if (overlay) overlay.classList.remove('active');
            AYPlayer.toggleAlphaOverlay();
        },

        toggleAlphaOverlay: function() {
            var overlay = document.getElementById(containerId + '_alphaOverlay');
            if (!overlay) return;
            if (overlay.classList.contains('active')) {
                overlay.classList.remove('active');
                return;
            }
            var content = document.getElementById(containerId + '_alphaOverlayContent');
            if (content) {
                var letters = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                var html = '<div class="ayPlayer-alpha-overlay-title"><button class="ayPlayer-alpha-overlay-close" onclick="event.stopPropagation(); AYPlayer.toggleAlphaOverlay()">&times;</button><div>Filter Playlist</div></div>';

                function letterGrid(id, current, setter) {
                    var g = '<div class="ayPlayer-alpha-overlay-grid" data-set="' + id + '">';
                    g += '<button class="ayPlayer-alpha-overlay-btn' + (current === 'all' ? ' active' : '') + '" data-alpha="all" onclick="event.stopPropagation(); AYPlayer.' + setter + '(\'all\')">All</button>';
                    for (var li = 0; li < letters.length; li++) {
                        var l = letters[li];
                        var a = l === '#' ? '0' : l;
                        g += '<button class="ayPlayer-alpha-overlay-btn' + (current === a ? ' active' : '') + '" data-alpha="' + a + '" onclick="event.stopPropagation(); AYPlayer.' + setter + '(\'' + a + '\')">' + l + '</button>';
                    }
                    g += '</div>';
                    return g;
                }

                html += '<div class="ayPlayer-alpha-overlay-label">Module</div>';
                html += '<div class="ayPlayer-alpha-overlay-grid is-formats">';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'all' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'all\')">All</button>';
                html += '</div>';
                html += '<div class="ayPlayer-alpha-overlay-grid is-formats">';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'stc' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'stc\')">STC</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'stp' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'stp\')">STP</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'asc' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'asc\')">ASC</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'pt1' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'pt1\')">PT1</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'pt2' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'pt2\')">PT2</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'pt3' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'pt3\')">PT3</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'vt2' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'vt2\')">VT2</button>';
                html += '</div>';
                html += '<div class="ayPlayer-alpha-overlay-grid is-formats">';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'snd' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'snd\')">SND</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'fym' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'fym\')">FYM</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'psg' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'psg\')">PSG</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'mtc' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'mtc\')">MTC</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'tfc' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'tfc\')">TFC</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (filterFormat === 'ay' ? ' active' : '') + '" onclick="event.stopPropagation(); AYPlayer.setFilter(\'ay\')">AY</button>';
                html += '</div>';
                html += '<div class="ayPlayer-alpha-overlay-label">Channels</div>';
                html += '<div class="ayPlayer-alpha-overlay-grid is-formats" data-set="ch">';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (chFilter === 'all' ? ' active' : '') + '" data-ch="all" onclick="event.stopPropagation(); AYPlayer.setChFilter(\'all\')">All</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (chFilter === '3' ? ' active' : '') + '" data-ch="3" onclick="event.stopPropagation(); AYPlayer.setChFilter(\'3\')">3</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (chFilter === '6' ? ' active' : '') + '" data-ch="6" onclick="event.stopPropagation(); AYPlayer.setChFilter(\'6\')">6</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (chFilter === '9' ? ' active' : '') + '" data-ch="9" onclick="event.stopPropagation(); AYPlayer.setChFilter(\'9\')">9</button>';
                html += '<button class="ayPlayer-alpha-overlay-btn' + (chFilter === '12' ? ' active' : '') + '" data-ch="12" onclick="event.stopPropagation(); AYPlayer.setChFilter(\'12\')">12</button>';
                html += '</div>';
                content.innerHTML = html;
            }
            overlay.classList.add('active');
        },

        toggleFavorites: function() {
            favoritesOnly = !favoritesOnly;
            _bumpFilterVersion();
            updateFavBtn();
            renderPlaylist(true);
            if (favoritesOnly && !favorites[currentId]) {
                for (var i = 0; i < playlist.length; i++) {
                    if (favorites[i]) {
                        loadAndPlay(i);
                        break;
                    }
                }
            }
            saveState();
        },

        toggleSearch: function() {
            var bar = document.getElementById(containerId + '_searchBar');
            var input = document.getElementById(containerId + '_searchInput');
            if (!bar || !input) return;
            var visible = bar.offsetParent !== null;
            if (visible) {
                bar.style.display = 'none';
                searchTerm = '';
                input.value = '';
                _bumpFilterVersion();
                renderPlaylist(true);
                updateFilterDisplay();
            } else {
                bar.style.display = 'flex';
                input.focus();
                input.select();
            }
        },

        onSearchInput: function(val) {
            searchTerm = (val || '').trim();
            _bumpFilterVersion();
            renderPlaylist(true);
            updateFilterDisplay();
        },

        clearSearch: function() {
            AYPlayer.toggleSearch();
        },

        toggleFavorite: function(id) {
            if (favorites[id]) {
                delete favorites[id];
            } else {
                favorites[id] = true;
            }
            localStorage.setItem('ayPlayer_favorites', JSON.stringify(favorites));
            var star = document.querySelector('.ayPlayer-playlist-item[data-id="' + id + '"] .ayPlayer-playlist-fav-star');
            if (star) star.classList.toggle('active', !!favorites[id]);
        },

        onPlaylistTitleClick: function() {
            api.togglePlaylist();
        },
        toggleBottomControls: function() {
            var inner = document.getElementById(containerId + '_bottomInner');
            var toggle = document.getElementById(containerId + '_bottomToggle');
            if (!inner) return;
            var expanded = toggle && toggle.classList.contains('expanded');
            inner.style.display = expanded ? 'none' : 'flex';
            if (toggle) toggle.classList.toggle('expanded', !expanded);
        },
        showCurrentTrack: function() {
            if (currentId < 0 || currentId >= playlist.length) return;
            api.collapseAll();
            _initialView = false;
            renderPlaylist(true);
            var list = document.getElementById(containerId + '_playlistItems');
            if (!list) return;
            var curItem = list.querySelector('.ayPlayer-playlist-item[data-id="' + currentId + '"]');
            if (!curItem) {
                var fItems = revealCurrentFolder();
                if (fItems && fItems._virtualDir) {
                    var folderEl = fItems.parentNode;
                    if (folderEl) folderEl.scrollIntoView({ block: 'start' });
                    var cRect = list.getBoundingClientRect();
                    renderVirtualFolder(fItems, fItems._virtualDir, list, cRect);
                }
            }
            setTimeout(function() {
                curItem = list.querySelector('.ayPlayer-playlist-item[data-id="' + currentId + '"]');
                if (curItem) curItem.scrollIntoView({block:'start'});
            }, 100);
        },
        onPlaylistTitleDblClick: function() {
            if (_playlistClickTimer) { clearTimeout(_playlistClickTimer); _playlistClickTimer = null; }
            var el = document.getElementById(containerId + '_playlistItems');
            if (el) { el.style.display = ''; el.scrollTop = 0; }
            renderPlaylist();
            api.collapseAll();
        },
        togglePlaylist: function() {
            var el = document.getElementById(containerId + '_playlistItems');
            if (el) el.style.display = '';
            var curItem = el ? el.querySelector('.ayPlayer-playlist-item[data-id="' + currentId + '"]') : null;
            if (!curItem) renderPlaylist();
            curItem = el ? el.querySelector('.ayPlayer-playlist-item[data-id="' + currentId + '"]') : null;
            if (curItem) {
                var folder = curItem.closest('.ayPlayer-playlist-folder');
                if (folder) {
                    var folderItems = folder.querySelector('.ayPlayer-playlist-folder-items');
                    if (folderItems) folderItems.style.display = 'block';
                    var arrow = folder.querySelector('.ayPlayer-playlist-folder-arrow');
                    if (arrow) arrow.classList.add('open');
                }
                curItem.scrollIntoView({ block: 'start' });
            }
        },

        collapseAll: function() {
            var el = document.getElementById(containerId + '_playlistItems');
            if (!el) return;
            var arrows = el.querySelectorAll('.ayPlayer-playlist-folder-arrow.open');
            for (var ai = 0; ai < arrows.length; ai++) {
                var arrow = arrows[ai];
                var items = arrow.parentNode.parentNode.querySelector('.ayPlayer-playlist-folder-items');
                if (items) items.style.display = 'none';
                arrow.classList.remove('open');
            }
        },

        toggleFolder: function(el) {
            var items = el.parentNode.querySelector('.ayPlayer-playlist-folder-items');
            var arrow = el.querySelector('.ayPlayer-playlist-folder-arrow');
            if (!items) return;
            if (items.style.display !== 'none') {
                var container = document.getElementById(containerId + '_playlistItems');
                if (container) {
                    var folderEl = el.parentNode;
                    var cRect = container.getBoundingClientRect();
                    var fdRect = folderEl.getBoundingClientRect();
                    var naturalDocY = container.scrollTop + (fdRect.top - cRect.top);
                    items.style.display = 'none';
                    var newMax = container.scrollHeight - container.clientHeight;
                    container.scrollTop = Math.min(Math.max(0, naturalDocY), newMax);
                } else {
                    items.style.display = 'none';
                }
                if (arrow) arrow.classList.remove('open');
                return;
            }
            var container = document.getElementById(containerId + '_playlistItems');
            if (container) {
                var allItems = container.querySelectorAll('.ayPlayer-playlist-folder-items');
                for (var i = 0; i < allItems.length; i++) {
                    allItems[i].style.display = 'none';
                }
                var allArrows = container.querySelectorAll('.ayPlayer-playlist-folder-arrow');
                for (var i = 0; i < allArrows.length; i++) {
                    allArrows[i].classList.remove('open');
                }
            }
            // lazy-inject cached HTML on first open
            items.style.display = 'block';
            el.scrollIntoView({block:'start'});
            var folderEl = el.parentNode;
            var dir = folderEl.getAttribute('data-dir');
            if (!items.hasChildNodes() || !_folderFullyLoaded[dir]) {
                if (_folderSlots[dir]) openFolderItems(items, dir);
            }
            if (arrow) arrow.classList.add('open');
        },

        selectTrack: function(id) {
            if (id === currentId && playing && song) {
            playFrame = 0; _seekTarget = -1;
                song.setProgress(0);
                if (_workletNode) _workletNode.port.postMessage({ type: 'setProgress', progress: 0 });
                updateProgress();
                if (onTimeUpdate) onTimeUpdate(getTimeDisplay());
                return;
            }
            if (_xhr) { _xhr.abort(); _xhr = null; }
            loadAndPlay(id);
        },

        exportStems: function(id) {
            var entry = playlist[id];
            if (!entry) return;
            var SR = 48000;
            var BPS = 3;
            var MAX_24 = 8388607;

            var modal, complete, label, closeBtn, titleEl;
            function getEls() {
                modal = document.getElementById(containerId + '_stemsModal');
                complete = document.getElementById(containerId + '_stemsComplete');
                label = document.getElementById(containerId + '_stemsLabel');
                closeBtn = document.getElementById(containerId + '_stemsClose');
                titleEl = modal && modal.querySelector('.ayPlayer-stems-modal-title');
            }
            getEls();
            if (!modal) return;
            modal.classList.add('active');
            complete.style.strokeDashoffset = '125.66';
            complete.classList.remove('error');
            label.textContent = '0%';
            if (titleEl) titleEl.textContent = 'Exporting Stems';

            var canceled = false;
            function closeModal() { canceled = true; if (modal.classList.contains('active')) { modal.classList.remove('active'); complete.classList.remove('error'); resumePlayback(); } }
            closeBtn.onclick = closeModal;

            var wasPlaying = _exportPause();

            function resumePlayback() { _exportResume(wasPlaying); }

            function showError(msg) {
                label.textContent = msg;
                complete.classList.add('error');
                getEls();
                closeBtn.onclick = function() { modal.classList.remove('active'); complete.classList.remove('error'); resumePlayback(); };
                resumePlayback();
            }

            var loadFile = entry.file;
            var isPT3 = /\.pt3$/i.test(loadFile);
            var isVT2 = /\.vt2$/i.test(loadFile);
            var isSTC = /\.stc$/i.test(loadFile);
            var isPSG = /\.psg$/i.test(loadFile);
            var isSND = /\.snd$/i.test(loadFile);
            var isAY = /\.ay$/i.test(loadFile);
            var isPT2 = /\.pt2$/i.test(loadFile);
            var isASC = /\.asc$/i.test(loadFile);
            var isMTC = /\.mtc$/i.test(loadFile);
            var isTFC = /\.tfc$/i.test(loadFile);
            var isSTP = /\.stp$/i.test(loadFile);
            var isPT1 = /\.pt1$/i.test(loadFile);
            if (!isPT3 && !isVT2 && !isSTC && !isPSG && !isSND && !isAY && !isPT2 && !isASC && !isMTC && !isTFC && !isSTP && !isPT1 && entry.pt3) {
                loadFile = entry.pt3File
                    ? entry.file.replace(/[^/]*$/, entry.pt3File)
                    : entry.file.replace(/\.fym$/i, '.pt3');
                isPT3 = true;
            }

            var xhr = new XMLHttpRequest();
            xhr.open('GET', encodePath(loadFile), true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function() {
                if (!modal.classList.contains('active')) return;
                if (!xhr.response) { showError('Failed to load track data'); return; }

                if (isPT3 || isVT2 || isSTC || isPSG || isSND || isAY || isPT2 || isASC || isMTC || isTFC || isSTP || isPT1) {
                    if (isMTC && typeof MTCReader === 'undefined') { showError('Модуль MTC заблокирован рекламным блокировщиком — добавьте ayplay.ru в исключения'); return; }
                    try {
                        var buf = xhr.response;
                        if (isSND) {
                            var sp = new SndToPsg(new Int8Array(buf));
                            buf = new Uint8Array(sp.exec).buffer;
                        }
                        var reader = isAY ? new AYReader(buf, loadFile) : (isSTC ? new STCReader(buf, loadFile) : (isPSG ? new PSGReader(buf, loadFile) : (isSND ? new PSGReader(buf, loadFile.replace(/\.snd$/i, '.psg')) : (isPT2 ? new PT2Reader(buf, loadFile) : (isASC ? new ASCReader(buf, loadFile) : (isPT3 ? new PT3Reader(buf, loadFile) : (isTFC ? new TFCReader(buf, loadFile) : (isSTP ? new STPReader(buf, loadFile) : (isPT1 ? new PT1Reader(buf, loadFile) : (isMTC ? new MTCReader(buf, loadFile) : new VT2Player(buf, loadFile)))))))))));
                    } catch(e) { showError('Failed to parse: ' + e.message); return; }
                    var frameCount = reader.getFrameCount();
                    if (reader.computeLoopFrame) {
                        var lf = reader.computeLoopFrame();
                        if (lf > 0 && lf < frameCount) frameCount = lf;
                    }
                    var clockRate = isSND ? 1714285 : reader.getClockRate();
                    var frameRate = reader.getFrameRate();
                    var isTb = reader.getTurbo && reader.getTurbo();
                    var chipCount = reader.getNumChips ? reader.getNumChips() : (typeof isTb === 'boolean' ? (isTb ? 2 : 1) : isTb);
                    var chCount = chipCount * 3;
                    var isrStep = frameRate / SR;
                    var isYM = isPT3 || isVT2 || isPT2;

                    label.textContent = 'Rendering\u2026';
                    setTimeout(function() {
                        try {
                            var chipKinds = isTFC ? ['opn', 'opn'] : (reader.getChipTypes ? reader.getChipTypes() : null);
                            var opnClockRate = reader.getOpnClockRate ? (reader.getOpnClockRate() || clockRate) : clockRate;
                            var renderers = [];
                            var isOpnChip = [];
                            for (var ci = 0; ci < chipCount; ci++) {
                                if (chipKinds && chipKinds[ci] === 'opn') {
                                    isOpnChip[ci] = true;
                                    renderers[ci] = { opn: new OPN(opnClockRate, SR), ays: null };
                                } else {
                                    isOpnChip[ci] = false;
                                    var ays = [];
                                    for (var ch = 0; ch < 3; ch++) {
                                        var ay = new Ayumi();
                                        ay.configure(ci === 0 ? isYM : true, clockRate, SR);
                                        for (var j = 0; j < 3; j++) { ay.channels[j].panLeft = 0; ay.channels[j].panRight = 0; }
                                        ay.channels[ch].panLeft = 1;
                                        ays.push(ay);
                                    }
                                    renderers[ci] = { opn: null, ays: ays };
                                }
                            }
                            var opnTmp = [0, 0, 0];

                            var chSamples = [];
                            for (var ch = 0; ch < chCount; ch++) chSamples[ch] = [];
                            var frame = 0, isrCounter = 0, CHUNK = 300;
                            function processChunk() {
                                if (canceled) { showError('Canceled'); return; }
                                try {
                                    var end = Math.min(frame + CHUNK, frameCount);
                                    while (frame < end) {
                                        var regs = reader.getNextFrame();
                                        var done = regs[regs.length - 1];
                                        for (var ci = 0; ci < chipCount; ci++) {
                                            var chipRegs = regs[ci];
                                            if (chipRegs && chipRegs.length) {
                                                if (isOpnChip[ci]) {
                                                    var opnInst = renderers[ci].opn;
                                                    for (var pr = 0; pr < chipRegs.length; pr++) opnInst.writeReg(chipRegs[pr][0], chipRegs[pr][1]);
                                                } else {
                                                    var ays = renderers[ci].ays;
                                                    for (var ch = 0; ch < 3; ch++) _exportUpdateState(ays[ch], chipRegs);
                                                }
                                            }
                                        }
                                        frame++;
                                        isrCounter += isrStep;
                                        while (isrCounter < 1) {
                                            for (var ci2 = 0; ci2 < chipCount; ci2++) {
                                                if (isOpnChip[ci2]) {
                                                    var c = renderers[ci2].opn.renderSample(opnTmp);
                                                    for (var g = 0; g < 3; g++) chSamples[ci2 * 3 + g].push(c[g] * (1 / 32768));
                                                } else {
                                                    var ays2 = renderers[ci2].ays;
                                                    for (var ch2 = 0; ch2 < 3; ch2++) {
                                                        ays2[ch2].process();
                                                        ays2[ch2].removeDC();
                                                        chSamples[ci2 * 3 + ch2].push(ays2[ch2].left);
                                                    }
                                                }
                                            }
                                            isrCounter += isrStep;
                                        }
                                        isrCounter -= 1;
                                        if (done) { frameCount = frame; break; }
                                    }
                                    if (frame < frameCount) {
                                        var pct = Math.round(frame / frameCount * 100);
                                        complete.style.strokeDashoffset = 125.66 * (1 - frame / frameCount);
                                        label.textContent = pct + '%';
                                        setTimeout(processChunk, 0);
                                    } else {
                                        complete.style.strokeDashoffset = '0';
                                        label.textContent = '100%';
                                        finishStems();
                                    }
                                } catch(e) { showError('Render error: ' + e.message); }
                            }
                            function finishStems() {
                                try {
                                    for (var ch = 0; ch < chCount; ch++) _dcFilter(chSamples[ch]);
                                    var peak = _findPeak(chSamples, chCount);
                                    var scale = MAX_24 / peak;
                                    var chNames = [];
                                    for (var ci = 0; ci < chCount; ci++) chNames.push(String.fromCharCode(65 + (ci % 3)) + (chCount > 3 ? Math.floor(ci / 3) + 1 : ''));
                                var stemBase = (entry.name || entry.file || 'track').replace(/\.(fym|pt3|vt2|psg|stc|ay|snd|asc|mtc|tfc|stp)$/i, '').replace(/^.*[/\\]/, '');
                                    var wavBuffers = [];
                                    for (var ch = 0; ch < chCount; ch++) {
                                        for (var i = 0; i < chSamples[ch].length; i++) chSamples[ch][i] *= scale;
                                        wavBuffers.push({ name: stemBase + '_' + chNames[ch] + '.wav', data: _writeWav(chSamples[ch], BPS, SR, MAX_24) });
                                    }
                                    label.textContent = 'Creating zip\u2026';
                                    setTimeout(function() {
                                        try {
                                            var zip = _exportBuildZip(wavBuffers);
                                            var blob = new Blob([zip], { type: 'application/zip' });
                                            complete.style.strokeDashoffset = '0';
                                            label.textContent = 'Downloading\u2026';
                                            resumePlayback();
                                            var url = URL.createObjectURL(blob);
                                            var a = document.createElement('a');
                                            a.href = url;
                                            a.download = stemBase + '_stems.zip';
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            setTimeout(function() { URL.revokeObjectURL(url); modal.classList.remove('active'); }, 1500);
                                        } catch(e) { showError('Zip error: ' + e.message); }
                                    }, 50);
                                } catch(e) { showError('Finish error: ' + e.message); }
                            }
                            processChunk();
                        } catch(e) { showError('Setup error: ' + e.message); }
                    }, 50);
                } else {
                    var fym = _parseFymHeader(xhr.response);
                    if (!fym) { showError('Invalid fym header'); return; }
                    var frameCount = fym.frameCount;
                    var clockRate = fym.clockRate;
                    var frameRate = fym.frameRate;
                    var isTurbo = fym.isTurbo;
                    var chCount = fym.chCount;
                    var isrStep = frameRate / SR;

                label.textContent = 'Rendering\u2026';
                setTimeout(function() {
                    try {
                        var ayumis = [];
                        var fymChipCount = isTurbo ? 2 : 1;
                        for (var ci = 0; ci < fymChipCount; ci++) {
                            for (var ch = 0; ch < 3; ch++) {
                                var ay = new Ayumi();
                                ay.configure(true, clockRate, SR);
                                for (var j = 0; j < 3; j++) { ay.channels[j].panLeft = 0; ay.channels[j].panRight = 0; }
                                ay.channels[ch].panLeft = 1;
                                ayumis.push(ay);
                            }
                        }

                        var chSamples = [];
                        for (var ch = 0; ch < chCount; ch++) chSamples[ch] = [];
                        var frame = 0, isrCounter = 0, CHUNK = 300;
                        function processChunk() {
                            if (canceled) { showError('Canceled'); return; }
                            try {
                                var end = Math.min(frame + CHUNK, frameCount);
                                while (frame < end) {
                                    var regs = fym.getFrameData(frame);
                                    for (var ci = 0; ci < fymChipCount; ci++) {
                                        var chipRegs = regs[ci];
                                        if (chipRegs && chipRegs.length) {
                                            for (var ch = 0; ch < 3; ch++) _exportUpdateState(ayumis[ci * 3 + ch], chipRegs);
                                        }
                                    }
                                    frame++;
                                    isrCounter += isrStep;
                                    while (isrCounter < 1) {
                                        for (var ai = 0; ai < ayumis.length; ai++) {
                                            ayumis[ai].process();
                                            ayumis[ai].removeDC();
                                        }
                                        for (var ai = 0; ai < ayumis.length; ai++) chSamples[ai].push(ayumis[ai].left);
                                        isrCounter += isrStep;
                                    }
                                    isrCounter -= 1;
                                }
                                if (frame < frameCount) {
                                    var pct = Math.round(frame / frameCount * 100);
                                    complete.style.strokeDashoffset = 125.66 * (1 - frame / frameCount);
                                    label.textContent = pct + '%';
                                    setTimeout(processChunk, 0);
                                } else {
                                    complete.style.strokeDashoffset = '0';
                                    label.textContent = '100%';
                                    finishStems();
                                }
                            } catch(e) { showError('Render error: ' + e.message); }
                        }
                        function finishStems() {
                            try {
                                for (var ch = 0; ch < chCount; ch++) _dcFilter(chSamples[ch]);
                                var peak = _findPeak(chSamples, chCount);
                                var scale = MAX_24 / peak;
                                var chNames = [];
                                for (var ci = 0; ci < chCount; ci++) chNames.push(String.fromCharCode(65 + (ci % 3)) + (chCount > 3 ? Math.floor(ci / 3) + 1 : ''));
                                var stemBase = (entry.name || entry.file || 'track').replace(/\.(fym|pt3|vt2|psg|stc|ay|snd|asc|mtc|tfc|stp)$/i, '').replace(/^.*[/\\]/, '');
                                var wavBuffers = [];
                                for (var ch = 0; ch < chCount; ch++) {
                                    for (var i = 0; i < chSamples[ch].length; i++) chSamples[ch][i] *= scale;
                                    wavBuffers.push({ name: stemBase + '_' + chNames[ch] + '.wav', data: _writeWav(chSamples[ch], BPS, SR, MAX_24) });
                                }
                                label.textContent = 'Creating zip\u2026';
                                setTimeout(function() {
                                    try {
                                        var zip = _exportBuildZip(wavBuffers);
                                        var blob = new Blob([zip], { type: 'application/zip' });
                                        complete.style.strokeDashoffset = '0';
                                        label.textContent = 'Downloading\u2026';
                                        resumePlayback();
                                        var url = URL.createObjectURL(blob);
                                        var a = document.createElement('a');
                                        a.href = url;
                                        a.download = stemBase + '_stems.zip';
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        setTimeout(function() { URL.revokeObjectURL(url); modal.classList.remove('active'); }, 1500);
                                    } catch(e) { showError('Zip error: ' + e.message); }
                                }, 50);
                            } catch(e) { showError('Finish error: ' + e.message); }
                        }
                        processChunk();
                    } catch(e) { showError('Setup error: ' + e.message); }
                }, 50);
            }
            };
            xhr.onerror = function() { if (modal.classList.contains('active')) showError('Connection failed'); };
            xhr.send();
        },

        exportMix: function(id) {
            var entry = playlist[id];
            if (!entry) return;
            var SR = 48000;
            var BPS = 3;
            var MAX_24 = 8388607;

            var modal, complete, label, closeBtn, titleEl;
            function getEls() {
                modal = document.getElementById(containerId + '_stemsModal');
                complete = document.getElementById(containerId + '_stemsComplete');
                label = document.getElementById(containerId + '_stemsLabel');
                closeBtn = document.getElementById(containerId + '_stemsClose');
                titleEl = modal && modal.querySelector('.ayPlayer-stems-modal-title');
            }
            getEls();
            if (!modal) return;
            modal.classList.add('active');
            complete.style.strokeDashoffset = '125.66';
            complete.classList.remove('error');
            label.textContent = '0%';
            if (titleEl) titleEl.textContent = 'Exporting Mix';

            var canceled = false;
            function closeModal() { canceled = true; if (modal.classList.contains('active')) { modal.classList.remove('active'); complete.classList.remove('error'); resumePlayback(); } }
            closeBtn.onclick = closeModal;

            var wasPlaying = playing;
            if (wasPlaying) {
                if (audioContext && audioContext.state === 'running') audioContext.suspend();
                if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
                stopEndCheck();
                releaseWakeLock();
                playing = false;
                updatePlayBtn();
                if (onPlayStateChange) onPlayStateChange(false, currentId);
            }

            function resumePlayback() {
                if (wasPlaying) {
                    if (audioContext && audioContext.state === 'suspended') audioContext.resume();
                    playing = true;
                    rafId = requestAnimationFrame(rafLoop);
                    startEndCheck();
                    requestWakeLock();
                    updatePlayBtn();
                    if (onPlayStateChange) onPlayStateChange(true, currentId);
                }
            }

            function showError(msg) {
                label.textContent = msg;
                complete.classList.add('error');
                getEls();
                closeBtn.onclick = function() { modal.classList.remove('active'); complete.classList.remove('error'); resumePlayback(); };
                resumePlayback();
            }

            var loadFile = entry.file;
            var isPT3 = /\.pt3$/i.test(loadFile);
            var isVT2 = /\.vt2$/i.test(loadFile);
            var isSTC = /\.stc$/i.test(loadFile);
            var isPSG = /\.psg$/i.test(loadFile);
            var isAY = /\.ay$/i.test(loadFile);
            var isPT2 = /\.pt2$/i.test(loadFile);
            var isSND = /\.snd$/i.test(loadFile);
            var isASC = /\.asc$/i.test(loadFile);
            var isSTP = /\.stp$/i.test(loadFile);
            var isPT1 = /\.pt1$/i.test(loadFile);
            if (!isPT3 && !isVT2 && !isSTC && !isPSG && !isSND && !isAY && !isPT2 && !isASC && !isSTP && !isPT1 && entry.pt3) {
                loadFile = entry.pt3File
                    ? entry.file.replace(/[^/]*$/, entry.pt3File)
                    : entry.file.replace(/\.fym$/i, '.pt3');
                isPT3 = true;
            }

            function startMixRender(frameCount, clockRate, frameRate, chipCount, getFrame) {
                var isrStep = frameRate / SR;
                label.textContent = 'Rendering\u2026';
                setTimeout(function() {
                    try {
                        var ayumi = new Ayumi();
                        ayumi.configure(true, clockRate, SR);
                        ayumi.setPan(0, 0.75, 0.25);
                        ayumi.setPan(1, 0.5, 0.5);
                        ayumi.setPan(2, 0.25, 0.75);
                        var ayumi2;
                        if (chipCount >= 2) {
                            ayumi2 = new Ayumi();
                            ayumi2.configure(true, clockRate, SR);
                            ayumi2.setPan(0, 0.75, 0.25);
                            ayumi2.setPan(1, 0.5, 0.5);
                            ayumi2.setPan(2, 0.25, 0.75);
                        }
                        var ayumi3;
                        if (chipCount >= 3) {
                            ayumi3 = new Ayumi();
                            ayumi3.configure(true, clockRate, SR);
                            ayumi3.setPan(0, 0.75, 0.25);
                            ayumi3.setPan(1, 0.5, 0.5);
                            ayumi3.setPan(2, 0.25, 0.75);
                        }

                        var mixL = [], mixR = [];
                        var frame = 0, isrCounter = 0, CHUNK = 300;

                        function finishMix() {
                            try {
                                var R = 0.999, yL = 0, yR = 0, prevL = 0, prevR = 0;
                                for (var i = 0; i < mixL.length; i++) {
                                    var xL = mixL[i], xR = mixR[i];
                                    yL = xL - prevL + R * yL;
                                    yR = xR - prevR + R * yR;
                                    prevL = xL; prevR = xR;
                                    mixL[i] = yL; mixR[i] = yR;
                                }
                                var peak = 0.001;
                                for (var i = 0; i < mixL.length; i++) {
                                    var absL = Math.abs(mixL[i]);
                                    var absR = Math.abs(mixR[i]);
                                    if (absL > peak) peak = absL;
                                    if (absR > peak) peak = absR;
                                }
                                var scale = MAX_24 / peak;
                                var dataLen = mixL.length * BPS * 2;
                                var buf = new ArrayBuffer(44 + dataLen);
                                var v = new DataView(buf);
                                v.setUint32(0, 0x46464952, true);
                                v.setUint32(4, 36 + dataLen, true);
                                v.setUint32(8, 0x45564157, true);
                                v.setUint32(12, 0x20746D66, true);
                                v.setUint32(16, 16, true);
                                v.setUint16(20, 1, true);
                                v.setUint16(22, 2, true);
                                v.setUint32(24, SR, true);
                                v.setUint32(28, SR * BPS * 2, true);
                                v.setUint16(32, BPS * 2, true);
                                v.setUint16(34, BPS * 8, true);
                                v.setUint32(36, 0x61746164, true);
                                v.setUint32(40, dataLen, true);
                                var off = 44;
                                for (var i = 0; i < mixL.length; i++) {
                                    var vl = Math.max(-MAX_24, Math.min(MAX_24, Math.round(mixL[i] * scale)));
                                    var vr = Math.max(-MAX_24, Math.min(MAX_24, Math.round(mixR[i] * scale)));
                                    if (vl < 0) vl += 0x1000000;
                                    if (vr < 0) vr += 0x1000000;
                                    v.setUint8(off, vl & 0xff);
                                    v.setUint8(off + 1, (vl >> 8) & 0xff);
                                    v.setUint8(off + 2, (vl >> 16) & 0xff);
                                    v.setUint8(off + 3, vr & 0xff);
                                    v.setUint8(off + 4, (vr >> 8) & 0xff);
                                    v.setUint8(off + 5, (vr >> 16) & 0xff);
                                    off += 6;
                                }
                                var stemBase = (entry.name || entry.file || 'track').replace(/\.(fym|pt3|vt2|psg|stc|ay|snd|asc|mtc|tfc|stp)$/i, '').replace(/^.*[/\\]/, '');
                                var wavName = stemBase + '_mix.wav';
                                var zip = _exportZipSingle(buf, wavName);
                                var blob = new Blob([zip], { type: 'application/zip' });
                                complete.style.strokeDashoffset = '0';
                                label.textContent = 'Downloading\u2026';
                                resumePlayback();
                                var url = URL.createObjectURL(blob);
                                var a = document.createElement('a');
                                a.href = url;
                                a.download = stemBase + '_mix.zip';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                setTimeout(function() { URL.revokeObjectURL(url); modal.classList.remove('active'); }, 1500);
                            } catch(e) { showError('Finish error: ' + e.message); }
                        }

                        function processChunk() {
                            if (canceled) { showError('Canceled'); return; }
                            try {
                                var end = Math.min(frame + CHUNK, frameCount);
                                while (frame < end) {
                                    var regs = getFrame(frame);
                                    _exportUpdateState(ayumi, regs[0]);
                                    if (chipCount >= 2 && regs[1] && regs[1].length) _exportUpdateState(ayumi2, regs[1]);
                                    if (chipCount >= 3 && regs[2] && regs[2].length) _exportUpdateState(ayumi3, regs[2]);
                                    frame++;
                                    isrCounter += isrStep;
                                    while (isrCounter < 1) {
                                        ayumi.process();
                                        ayumi.removeDC();
                                        var l = ayumi.left;
                                        var r = ayumi.right;
                                        if (chipCount >= 2) {
                                            ayumi2.process();
                                            ayumi2.removeDC();
                                            l += ayumi2.left;
                                            r += ayumi2.right;
                                        }
                                        if (chipCount >= 3) {
                                            ayumi3.process();
                                            ayumi3.removeDC();
                                            l += ayumi3.left;
                                            r += ayumi3.right;
                                        }
                                        mixL.push(l);
                                        mixR.push(r);
                                        isrCounter += isrStep;
                                    }
                                    isrCounter -= 1;
                                }
                                if (frame < frameCount) {
                                    var pct = Math.round(frame / frameCount * 100);
                                    complete.style.strokeDashoffset = 125.66 * (1 - frame / frameCount);
                                    label.textContent = pct + '%';
                                    setTimeout(processChunk, 0);
                                } else {
                                    complete.style.strokeDashoffset = '0';
                                    label.textContent = '100%';
                                    finishMix();
                                }
                            } catch(e) { showError('Render error: ' + e.message); }
                        }
                        processChunk();
                    } catch(e) { showError('Setup error: ' + e.message); }
                }, 50);
            }

            if (_dumpData && playlist[currentId] && playlist[currentId].file === entry.file) {
                var dd = _dumpData;
                var frameCount = dd.dumpLen;
                var clockRate = dd.clock;
                var frameRate = dd.frameRate;
                var chipCount = dd.chipCount || 1;
                var dumpRef = dd.dump;
                startMixRender(frameCount, clockRate, frameRate, chipCount, function(f) {
                    var e = dumpRef[f];
                    return [e.a, e.b || [], e.c || []];
                });
            } else {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', encodePath(loadFile), true);
                xhr.responseType = 'arraybuffer';
                xhr.onload = function() {
                    if (!modal.classList.contains('active')) return;
                    if (!xhr.response) { showError('Failed to load track data'); return; }

                    if (isPT3 || isVT2 || isSTC || isPSG || isSND || isAY || isASC || isMTC || isTFC || isSTP || isPT1) {
                        if (isMTC && typeof MTCReader === 'undefined') { showError('Модуль MTC заблокирован рекламным блокировщиком — добавьте ayplay.ru в исключения'); return; }
                        try {
                            var buf = xhr.response;
                            if (isSND) {
                                var sp = new SndToPsg(new Int8Array(buf));
                                buf = new Uint8Array(sp.exec).buffer;
                            }
                        var reader = isAY ? new AYReader(buf, loadFile) : (isSTC ? new STCReader(buf, loadFile) : (isPSG ? new PSGReader(buf, loadFile) : (isSND ? new PSGReader(buf, loadFile.replace(/\.snd$/i, '.psg')) : (isPT2 ? new PT2Reader(buf, loadFile) : (isASC ? new ASCReader(buf, loadFile) : (isPT3 ? new PT3Reader(buf, loadFile) : (isMTC ? new MTCReader(buf, loadFile) : (isTFC ? new TFCReader(buf, loadFile) : (isSTP ? new STPReader(buf, loadFile) : (isPT1 ? new PT1Reader(buf, loadFile) : new VT2Player(buf, loadFile)))))))))));
                        } catch(e) { showError('Failed to parse: ' + e.message); return; }
                        var frameCount = reader.getFrameCount();
                        if (reader.computeLoopFrame) {
                            var lf = reader.computeLoopFrame();
                            if (lf > 0 && lf < frameCount) frameCount = lf;
                        }
                        var clockRate = isSND ? 1714285 : reader.getClockRate();
                        var frameRate = reader.getFrameRate();
                        var isTb = reader.getTurbo && reader.getTurbo();
                        var chipCount = reader.getNumChips ? reader.getNumChips() : (typeof isTb === 'boolean' ? (isTb ? 2 : 1) : isTb);
                        startMixRender(frameCount, clockRate, frameRate, chipCount, function(f) {
                            var regs = reader.getNextFrame();
                            return [regs[0], regs[1] || [], regs[2] || []];
                        });
                    } else {
                        var fym = _parseFymHeader(xhr.response);
                        if (!fym) { showError('Invalid fym header'); return; }
                        var frameCount = fym.frameCount;
                        var clockRate = fym.clockRate;
                        var frameRate = fym.frameRate;
                        var isTurbo = fym.isTurbo;
                        var chipCount = isTurbo ? 2 : 1;
                        startMixRender(frameCount, clockRate, frameRate, chipCount, function(f) {
                            var regs = fym.getFrameData(f);
                            return [regs[0], regs[1] || [], []];
                        });
                    }
                };
                xhr.onerror = function() { if (modal.classList.contains('active')) showError('Connection failed'); };
                xhr.send();
            }
        },

        copyTrackLink: function(index) {
            if (!playlist[index]) return;
            var url = window.location.origin + window.location.pathname + '?track=' + encodeURIComponent(playlist[index].file);
            try { navigator.clipboard.writeText(url); } catch(e) {}
            var name = _trackDisplay(playlist[index]) || playlist[index].file;
            showToast('Link copied: ' + name);
        },

        tryPlayTrackFromUrl: function() {
            var params = new URLSearchParams(window.location.search);
            var trackParam = params.get('track');
            if (trackParam) {
                var idx = -1;
                if (/^\d+$/.test(trackParam)) {
                    idx = parseInt(trackParam, 10);
                    if (idx < 0 || idx >= playlist.length) idx = -1;
                } else {
                    var _normUrl = function(s) {
                        try { s = decodeURIComponent(s); } catch(e) {}
                        return s.replace(/\\/g, '/');
                    };
                    var nParam = _normUrl(trackParam);
                    for (var i = 0; i < playlist.length; i++) {
                        if (_normUrl(playlist[i].file) === nParam) { idx = i; break; }
                    }
                }
                if (idx >= 0) {
                    var self = this;
                    _urlTrackOverride = idx;
                    setTimeout(function() { self.selectTrack(idx); _urlTrackOverride = -1; }, 100);
                    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
                    return true;
                }
            }
            return false;
        },

        getCurrentId: function() { return currentId; },
        getPlaylist: function() { return playlist; },
        isPlaying: function() { return playing; },
        isShuffling: function() { return shuffle; },
        isRepeating: function() { return repeat; },

        onTrackChange: function(cb) { onTrackChange = cb; return api; },
        onPlayStateChange: function(cb) { onPlayStateChange = cb; return api; },
        onTimeUpdate: function(cb) { onTimeUpdate = cb; return api; },

        getTrackInfo: getTrackInfo,
        getTimeDisplay: getTimeDisplay,

        preloadWaveform: preloadWaveform,

        destroy: function() {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
            _fadeTarget = -1;
            _fadeOnDone = null;
            stopEndCheck();
            releaseWakeLock();
            if (_workletNode) {
                try { _workletNode.disconnect(); } catch(e) {}
            }
            if (_gainNode) {
                try { _gainNode.disconnect(); } catch(e) {}
            }
            if (audioContext) {
                try { audioContext.close(); } catch(e) {}
            }
            audioContext = null;
            _workletNode = null;
            _gainNode = null;
            _roomNode = null;
            _roomGain = null;
            song = null;
            _dumpData = null;
            playing = false;
        },

        destroyOnUnload: function() {
            window.addEventListener('beforeunload', function() { api.destroy(); });
        }
    };
    return api;
})();








