// ============================================================================
// Brew POS — Service Worker for Offline Support
// ============================================================================

const CACHE_NAME = 'brew-pos-v1';
const STATIC_ASSETS = [
  '/',
  '/app.html',
  '/admin.html',
  '/login.html',
  '/signup.html',
  '/admin-login.html',
  '/admin-signup.html',
  '/css/styles.output.css',
  '/js/app.js',
  '/js/admin-app.js',
  '/js/backend.js',
  '/js/utils.js',
  '/js/auth-guard.js',
  '/js/cart.js',
  '/js/printer.js',
  '/js/order-view.js',
  '/js/history-view.js',
  '/js/settings-view.js',
  '/js/admin-dashboard.js',
  '/js/admin-inventory.js',
  '/js/admin-settings.js',
  '/js/admin-order-history.js',
  '/js/admin-sales-tracker.js',
  '/js/config.js',
  '/lib/chart.umd.min.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[SW] Failed to cache assets:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (like Firebase)
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdn.jsdelivr.net') &&
      !event.request.url.includes('fonts.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response to cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, return offline page for HTML requests
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/app.html');
            }
          });
      })
  );
});
