/* Service worker — cachea el "app shell" para que funcione sin internet. */
const CACHE = 'super-profe-v15';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './data.js',
  './xlsx.full.min.js', './manifest.webmanifest',
  './fonts/nunito-400.woff2', './fonts/nunito-700.woff2', './fonts/nunito-800.woff2',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'
];

self.addEventListener('install', e => {
  // {cache:'reload'} evita que el precache guarde copias VIEJAS desde la caché HTTP del navegador
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u => c.add(new Request(u, {cache: 'reload'})))))
      .then(() => self.skipWaiting())
  );
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
      hit || fetch(e.request).catch(() =>
        // solo las navegaciones caen al index; un recurso (imagen/script) NO debe recibir HTML
        e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()
      )
    )
  );
});
