/* 미녀 덱 서비스 워커: 코드(html/js/css)는 네트워크 우선, 그림은 캐시 우선 */
const CACHE = 'beautydeck-v1.5.1';
const CORE = ['./', 'index.html', 'style.css?v=1.5.1', 'artmap.js?v=1.5.1', 'art.js?v=1.5.1', 'data.js?v=1.5.1', 'story.js?v=1.5.1', 'engine.js?v=1.5.1', 'ui.js?v=1.5.1', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'sfx/bgm.mp3'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (/\.(webp|png|jpg|jpeg)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
    return;
  }
  e.respondWith(fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; }).catch(() => caches.match(req).then(hit => hit || caches.match('index.html'))));
});
