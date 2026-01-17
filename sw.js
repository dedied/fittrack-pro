const CACHE_NAME = 'fittrack-v1.1.0';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Navigation requests (the page itself)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        // Fallback to the cached index.html only for navigation
        return caches.match('index.html') || caches.match('./');
      })
    );
    return;
  }

  // 2. Assets (JS, CSS, Images)
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) return response;
      
      return fetch(request).then((networkResponse) => {
        // Don't cache if not a successful response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Optional: Cache new assets on the fly
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Only cache same-origin assets to be safe
          if (url.origin === self.location.origin) {
            cache.put(request, responseToCache);
          }
        });

        return networkResponse;
      }).catch(() => {
        // Fail silently for assets (do NOT return index.html for a .js request)
        return null;
      });
    })
  );
});