
const CACHE_NAME = 'fittrack-v1.9.2';

// We determine the base path dynamically or use relative paths
const ASSETS_TO_PRECACHE = [
  './',
  './index.html',
  './manifest.json'
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

  // For navigation requests, assume it's the SPA index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        // Fallback to cached index.html
        // We use ignoreSearch to match requests regardless of query params
        return caches.match('./index.html', { ignoreSearch: true })
          .then(response => {
             // If ./index.html path fails to match, try matching the scope root
             return response || caches.match('./', { ignoreSearch: true });
          });
      })
    );
    return;
  }

  // For other assets, use Cache-First strategy
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Only cache assets from our own origin or specific trusted CDNs
          if (url.origin === self.location.origin || url.hostname.includes('fonts.') || url.hostname.includes('esm.sh')) {
            try {
              cache.put(request, responseToCache);
            } catch (e) {
              // Ignore cache put errors
            }
          }
        });
        return networkResponse;
      }).catch(() => null);
    })
  );
});
