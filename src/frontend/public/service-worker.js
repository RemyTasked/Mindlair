/* eslint-disable no-restricted-globals */

// AUTOMATIC CACHE-BUSTING:
// - Vite generates unique filenames with content hashes (e.g., main-a1b2c3d4.js)
// - Server sends Cache-Control headers to prevent stale content
// - Service worker cache version bumped on each deployment
// - ETags enabled for efficient cache validation
// DEPLOYMENT: 2025-11-07 14:15 EST - Force clear all caches
const CACHE_NAME = 'meetcute-v6';
const RUNTIME_CACHE = 'meetcute-runtime-v6';

// Assets to cache on install
// Logo URLs include timestamp to force cache refresh
const LOGO_TIMESTAMP = '20251107141500'; // YYYYMMDDHHMMSS
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  `/favicon.png?v=${LOGO_TIMESTAMP}`,
  `/og-image.png?v=${LOGO_TIMESTAMP}`,
  `/icons/meetcute-logo.png?v=${LOGO_TIMESTAMP}`,
  `/icons/icon-192x192.png?v=${LOGO_TIMESTAMP}`,
  `/icons/icon-512x512.png?v=${LOGO_TIMESTAMP}`,
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('🎬 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('🎬 Service Worker: Caching app shell');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🎬 Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('🎬 Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network only (always fresh data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline - API unavailable' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // For navigation requests, use network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the response
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to index.html for SPA routing
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // For other requests (CSS, JS, images), use cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone and cache the response
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      });
    })
  );
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('🎬 Service Worker: Background sync triggered', event.tag);
  if (event.tag === 'sync-reflections') {
    event.waitUntil(syncReflections());
  }
});

async function syncReflections() {
  // Placeholder for syncing offline reflections when back online
  console.log('🎬 Service Worker: Syncing offline reflections...');
}

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('🎬 Service Worker: Push notification received', event);
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Meet Cute';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Open', icon: '/icons/icon-72x72.png' },
      { action: 'close', title: 'Close', icon: '/icons/icon-72x72.png' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('🎬 Service Worker: Notification clicked', event.action);
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});
