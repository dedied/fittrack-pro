const CACHE_NAME = 'fittrack-v1.2.3';
const BASE_PATH = '/fittrack-pro/';
const ASSETS_TO_PRECACHE = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_PRECACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle Navigation (Loading the App)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        // Fallback to cached index.html
        return caches.match(BASE_PATH + 'index.html') || caches.match(BASE_PATH);
      })
    );
    return;
  }

  // Handle Assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Cache assets from our origin or CDNs
          if (url.origin === self.location.origin || url.hostname.includes('fonts.')) {
            cache.put(request, responseToCache);
          }
        });

        return networkResponse;
      }).catch(() => null);
    })
  );
});