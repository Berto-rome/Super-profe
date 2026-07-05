/* Service worker — cachea el "app shell" para que funcione sin internet. */
const CACHE = 'super-profe-v12';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './data.js',
  './xlsx.full.min.js', './manifest.webmanifest',
  './fonts/nunito-400.woff2', './fonts/nunito-700.woff2', './fonts/nunito-800.woff2',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).catch(() => caches.match('./index.html'))
    )
  );
});
