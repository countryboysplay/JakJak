const CACHE = 'jakjak-v6';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];
self.addEventListener('install', event => {
  // Bypass the HTTP cache so a new version never pre-caches a stale file.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Stale-while-revalidate: serve from cache instantly (offline-first), refresh it in the background.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(req).then(hit => {
    const network = fetch(req).then(response => {
      if (response.ok && response.type === 'basic') cache.put(req, response.clone());
      return response;
    });
    if (hit) { event.waitUntil(network.catch(() => {})); return hit; }
    return network.catch(() => req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  })));
});
