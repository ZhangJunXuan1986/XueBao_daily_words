/* Service Worker —— 带版本更新机制
   每次发新版，只需把 version.json 里的 version 改一下，
   用户打开时会自动检测到并清掉旧缓存。 */
const CACHE = 'ew-v1-8-1';
const ASSETS = [
  './', './index.html', './loader.js', './app.js',
  './dict.js', './dict.z.js', './questions.js',
  './manifest.json', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => { })));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(
      ks.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const u = e.request.url;
  if (e.request.method !== 'GET') return;
  if (!u.startsWith(self.location.origin)) return;

  // version.json 永远走网络，不缓存（否则检测不到更新）
  if (u.includes('version.json')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }

  // 网页导航请求：优先网络，失败才用缓存（保证能拿到新版）
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 静态资源：缓存优先，后台更新
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
