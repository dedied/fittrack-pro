
const CACHE_NAME = 'fittrack-v1.0.8';
const ASSETS = [
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache with 'reload' to bypass potentially broken local cache during update
      return cache.addAll(ASSETS.map(url => new Request(url, {cache: 'reload'})));
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

  // For navigation requests (loading the app entry point)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If network response is okay, use it
          if (response.ok) return response;
          // If GitHub Pages returns a 404, fallback to cached index.html shell
          return caches.match('index.html');
        })
        .catch(() => {
          // Offline fallback
          return caches.match('index.html');
        })
    );
    return;
  }

  // Standard asset handling
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(request).catch(() => {
        // Fallback for missing assets to avoid breakages
        if (request.destination === 'image') return null;
        return caches.match('index.html');
      });
    })
  );
});
