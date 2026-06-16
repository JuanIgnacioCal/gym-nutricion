// Service worker mínimo para que la PWA sea instalable y funcione offline básico.
const CACHE = 'overall-nutricion-v1';
const ASSETS = ['/', '/plan', '/registrar', '/buscar', '/favoritos', '/manifest.json', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // No interceptar la API ni métodos que no sean GET (datos siempre frescos).
  if (request.method !== 'GET' || new URL(request.url).pathname.startsWith('/api/')) return;

  // Navegaciones: network-first con fallback a caché (shell offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Resto de assets: cache-first.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
