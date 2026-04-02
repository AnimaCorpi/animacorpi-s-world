const CACHE_NAME = 'reader-cache-v1';
const CHAPTER_CACHE = 'chapters-v1';

// On install, cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Cache opened');
      self.skipWaiting();
    })
  );
});

// On activate, clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== CHAPTER_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For chapter API requests (caching chapter content)
  if (url.pathname.includes('/api/') || url.pathname.includes('base44')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Return cached response if available
        if (response) {
          return response;
        }

        // Otherwise, fetch from network and cache it
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone the response to cache it
            const responseToCache = response.clone();
            caches.open(CHAPTER_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // If offline and no cache, return a fallback response
            return new Response(
              JSON.stringify({ error: 'Offline - Chapter not cached' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
      })
    );
  }
});

// Handle messages from the client (e.g., to cache a chapter)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_CHAPTER') {
    const { url, data } = event.data;
    caches.open(CHAPTER_CACHE).then((cache) => {
      const response = new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      cache.put(url, response);
      console.log('Service Worker: Chapter cached', url);
    });
  }
});
