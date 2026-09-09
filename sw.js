const CACHE_VERSION = 'ayp-v437';
const BASE = self.location.pathname.replace(/\/sw\.js.*$/, '/');
const APP_SHELL = [
  '',
  'index.html',
  'player/ayPlayer.css?v=358',
  'player/pako_inflate.min.js?v=16',
  'player/ayumi.js?v=17',
  'player/opn.js?v=1',
  'player/fym.js?v=16',
  'player/pt3.js?v=16',
  'player/vt2.js?v=13',
  'player/psg.js?v=2',
  'player/snd2psg.js?v=2',
  'player/stc.js?v=3',
  'player/pt2.js?v=1',
  'player/asc.js?v=1',
  'player/tfc.js?v=1',
  'player/stp.js?v=1',
  'player/pt1.js?v=1',
  'player/psc.js?v=4',
  'player/ftc.js?v=9',
  'player/sqt.js?v=4',
  'player/fxm.js?v=4',
  'player/aym_reader.js?v=6',
  'player/z80core.js?v=6',
  'player/ay.js?v=16',
  'player/ui/scope-ui.js?v=2',
  'player/ui/waveform-ui.js?v=4',
  'player/ayPlayer.js?v=413',
  'init.js',
  'player/streamer.js',
  'player/processor.js?v=18',
  'player/player_worklet.js',
  'img/logo_ayplay.svg',
  'img/splash_1260x340.jpg'
].map(p => BASE + p);

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          fetch(url, { cache: 'no-cache' })
            .then((resp) => {
              if (resp.ok) cache.put(url, resp);
            })
            .catch(() => {})
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (!/^https?:$/.test(url.protocol)) return;
  if (url.origin !== self.location.origin) return;

  // Network-First для API
  if (url.pathname.startsWith(BASE + 'api/')) {
    e.respondWith(
      fetch(e.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(e.request, copy));
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-First для чиптюнов и вейвформов
  if (url.pathname.startsWith(BASE + 'chiptunes/') || url.pathname.startsWith(BASE + 'waveforms/')) {
    e.respondWith(
      caches.match(e.request).then((resp) => resp || fetch(e.request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(e.request, responseClone));
        }
        return response;
      }))
    );
    return;
  }

  // Stale-While-Revalidate для App Shell (игнорируем ?v= параметры)
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      const fetchPromise = fetch(e.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});


