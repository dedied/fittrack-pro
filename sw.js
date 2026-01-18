const CACHE_NAME = 'fittrack-v1.9.4';

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

  // For navigation requests (HTML), try Network first, then Cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
           // If online and valid, clone to cache
           return caches.open(CACHE_NAME).then((cache) => {
             cache.put(request, response.clone());
             return response;
           });
        })
        .catch(() => {
          // If offline or fetch fails, return the cached index.html.
          // We try multiple variants to be safe against base path issues.
          return caches.open(CACHE_NAME).then((cache) => {
            return cache.match('./index.html', { ignoreSearch: true })
              .then(response => {
                if (response) return response;
                // Fallback 1: Root
                return cache.match('./', { ignoreSearch: true });
              })
              .then(response => {
                 if (response) return response;
                 // Fallback 2: Absolute index.html if stored differently
                 return cache.match('index.html', { ignoreSearch: true });
              });
          });
        })
    );
    return;
  }

  // For assets, Cache First, then Network
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
          return networkResponse;
        }
        // Cache valid responses
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