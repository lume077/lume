/* Lume · 我的光 — Service Worker：離線快取 */
const CACHE = 'lume-v2-21';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/style.css',
  './assets/css/theme.css',
  './assets/js/core/theme-boot.js',
  './assets/js/core/utils.js',
  './assets/js/core/store.js',
  './assets/js/core/idb.js',
  './assets/js/core/ui.js',
  './assets/js/core/input.js',
  './assets/js/core/sync.js',
  './assets/js/core/data.js',
  './assets/js/core/quotes.js',
  './assets/js/core/extras.js',
  './assets/js/modules/home.js',
  './assets/js/modules/today.js',
  './assets/js/modules/todo.js',
  './assets/js/modules/study.js',
  './assets/js/modules/water.js',
  './assets/js/modules/reading.js',
  './assets/js/modules/diary.js',
  './assets/js/modules/murmurs.js',
  './assets/js/modules/body.js',
  './assets/js/modules/tarot.js',
  './assets/js/modules/firsts.js',
  './assets/js/modules/notes.js',
  './assets/js/modules/outfit.js',
  './assets/js/modules/period.js',
  './assets/js/modules/wishes.js',
  './assets/js/modules/review.js',
  './assets/js/app.js',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;          // 字型、雲端同步等外部請求不攔截
  const needFresh = e.request.mode === 'navigate' || /\.(js|css|html|webmanifest)$/.test(url.pathname);

  // 程式碼類資源採「網路優先」，確保永遠拿到最新版本
  if (needFresh) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // 圖片等靜態資源採「快取優先」
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
