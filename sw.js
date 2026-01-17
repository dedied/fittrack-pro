
const CACHE_NAME = 'fittrack-v1.1.1';
const ASSETS_TO_PRECACHE = [
  './',
  'index.html',
  'manifest.json'
];

// On install, cache the core shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_PRECACHE);
    })
  );
});

// On activate, clean up old caches and take control of clients immediately
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

  // 1. Handle Navigation (Loading the App)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        // Only return index.html for page navigation requests
        return caches.match('index.html') || caches.match('./');
      })
    );
    return;
  }

  // 2. Handle Assets (JS, CSS, Images, ESM.sh imports)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Don't cache if not a successful response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
          return networkResponse;
        }

        // Cache successful requests dynamically (includes esm.sh and other assets)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // We cache assets from our origin and the esm.sh CDN
          if (url.origin === self.location.origin || url.hostname.includes('esm.sh') || url.hostname.includes('fonts.')) {
            cache.put(request, responseToCache);
          }
        });

        return networkResponse;
      }).catch(() => {
        // Return nothing for failed asset requests (prevents returning HTML for JS)
        return null;
      });
    })
  );
});
