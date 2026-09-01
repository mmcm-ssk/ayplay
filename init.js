var LS_KEY = 'ayPlayer_playlist';
var LS_TIME = 'ayPlayer_playlist_time';
var CACHE_MAX_AGE = 86400000;
var COUNTER_KEY = 'ayPlayer_counter_time';
var COUNTER_MAX_AGE = 86400000;

var player = AYPlayer.init('player')
    .onTrackChange(function(info) {
        var a = (info && info.author) ? info.author : '';
        var t = (info && info.title) ? info.title : '';
        document.title = (a && t) ? (a + ' — ' + t) : (t || 'AY Player');
        if (a && t) document.title += ' | AY Player';
    });

function loadPlaylist(playlist) {
    if (playlist.length === 0) {
        document.querySelector('.ayPlayer-trackName').textContent = 'Нет треков в chiptunes/';
        return;
    }
    player.setPlaylist(playlist);
    player.tryPlayTrackFromUrl();
}

function showPlaylistError() {
    document.getElementById('player_playlistItems').innerHTML =
        '<div style="padding:12px;color:#a04040;font-style:italic;">Run: node scripts/generate-m3u-playlist.js</div>';
}

function updatePlaylistFromServer(isBackground) {
    fetch('api/playlist.php?action=all')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.entries) {
                localStorage.setItem(LS_KEY, JSON.stringify(data.entries));
                localStorage.setItem(LS_TIME, Date.now());
                if (!isBackground) loadPlaylist(data.entries);
            } else if (!isBackground) {
                showPlaylistError();
            }
        })
        .catch(function(err) {
            console.error('Failed to load playlist:', err);
            if (!isBackground) showPlaylistError();
        });
}

document.getElementById('player_playlistItems').innerHTML =
    '<div style="padding:12px;color:#007890;font-style:italic;">Loading playlist\u2026</div>';

var cachedStr = localStorage.getItem(LS_KEY);
var cachedTime = localStorage.getItem(LS_TIME);
var usedCache = false;
if (cachedStr && cachedTime && Date.now() - +cachedTime < CACHE_MAX_AGE) {
    try {
        loadPlaylist(JSON.parse(cachedStr));
        usedCache = true;
    } catch(e) {}
}
updatePlaylistFromServer(usedCache);

try {
    var vc = localStorage.getItem('ayPlayer_visits') || 0;
    localStorage.setItem('ayPlayer_visits', ++vc);
} catch(e) {}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js');
    });
}

var flagsEl = document.getElementById('countryFlags');
var state = {visitCount: 0, flagsHtml: ''};

loadStats();

function loadStats() {
    try {
        var counterTime = localStorage.getItem(COUNTER_KEY);
        var counterUrl = counterTime && Date.now() - +counterTime < COUNTER_MAX_AGE ? 'api/flags.php' : 'api/counter.php';
        fetch(counterUrl).then(function(r){return r.json();}).then(function(d){
            if (counterUrl === 'api/counter.php') localStorage.setItem(COUNTER_KEY, Date.now());
            state.visitCount = d.count || 0;
            renderFlags();
        }).catch(function(){renderFlags();});
    } catch(e) { renderFlags(); }
}

function renderFlags() {
    if (!flagsEl) return;
    var html = '<span style="font-size:12px;font-family:sans-serif;color:#003850;">Visit counter: ' + state.visitCount + '</span>';
    flagsEl.innerHTML = html;
}
