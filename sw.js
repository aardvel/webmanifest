const CACHE_NAME = 'aardvel-shell-v1';
const PRECACHE_URLS = [
  '/',                            // HTML shell
  '/assets/theme.css',            // your compiled CSS
  '/assets/theme.js',             // your main JS
  '/manifest.json',               // so theme_color/urlbar works offline
  '/favicon.png',
  // …add any other static assets/icons you need…
];

// 1) Install: pre-cache core shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())  // activate immediately
  );
});

// 2) Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
         .filter(key => key !== CACHE_NAME)
         .map(oldKey => caches.delete(oldKey))
      )
    ).then(() => self.clients.claim())
  );
});

// 3) Fetch: serve cache-first, then update cache in background
self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin assets
  if (event.request.method !== 'GET' ||
      new URL(event.request.url).origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedRes => {
        // Kick off a network fetch in parallel to update cache
        const networkFetch = fetch(event.request).then(networkRes => {
          // If valid, update cache
          if (networkRes && networkRes.status === 200) {
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, networkRes.clone()));
          }
          return networkRes;
        }).catch(() => {/* fail quietly */});

        // Respond with cache if available, otherwise wait on network
        return cachedRes || networkFetch;
      })
  );
});
