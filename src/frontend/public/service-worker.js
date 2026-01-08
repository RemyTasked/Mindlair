/* eslint-disable no-restricted-globals */

/**
 * Mind Garden Service Worker
 * 
 * Features:
 * - PWA offline support with asset caching
 * - Push notifications with actionable buttons
 * - Deep linking to flows via notification clicks
 * - Automatic updates with cache busting
 */

const CACHE_NAME = 'mind-garden-v3';
const RUNTIME_CACHE = 'mind-garden-runtime-v3';

// Core assets to cache on install for offline use
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/mindgarden-icon-192x192.png',
  '/icons/mindgarden-icon-512x512.png',
  '/favicon.png',
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('🌱 Mind Garden SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('🌱 Mind Garden SW: Caching app shell');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🌱 Mind Garden SW: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('🗑️ Mind Garden SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Mind Garden SW: Claiming clients');
      return self.clients.claim();
    }).then(() => {
      // Notify all clients about the update
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'CACHE_UPDATED',
            version: CACHE_NAME,
          });
        });
      });
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

  // API requests - network only
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

  // Navigation requests - network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Other requests - cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🌱 Mind Garden SW: Background sync:', event.tag);
  if (event.tag === 'sync-garden-data') {
    event.waitUntil(syncGardenData());
  }
});

async function syncGardenData() {
  console.log('🌱 Mind Garden SW: Syncing garden data...');
}

/**
 * Push Notification Handler
 * 
 * Displays rich notifications with actionable buttons:
 * - "Start Flow" - Opens app directly to the flow
 * - "Not Now" - Dismisses the notification
 */
self.addEventListener('push', (event) => {
  console.log('🌱 Mind Garden SW: Push notification received');
  
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || 'Mind Garden';
  
  // Extract nested data (flowType, meetingId, etc. are inside payload.data from backend)
  const nestedData = payload.data || {};
  
  // Build notification options with actionable buttons
  const options = {
    body: payload.body || 'Time for a mindful moment 🌱',
    icon: payload.icon || '/icons/mindgarden-icon-192x192.png',
    badge: '/icons/mindgarden-icon-72x72.png',
    vibrate: [100, 50, 100, 50, 200],
    silent: false,
    requireInteraction: true, // Keep visible until user interacts
    tag: payload.tag || 'mind-garden-notification',
    renotify: true,
    data: {
      url: payload.url || '/',
      flowType: nestedData.flowType || null,
      meetingId: nestedData.meetingId || null,
      meetingTitle: nestedData.meetingTitle || null,
      ...nestedData,
    },
    // Actionable notification buttons
    actions: [
      {
        action: 'start-flow',
        title: '🌱 Start Flow',
        icon: '/icons/mindgarden-icon-72x72.png',
      },
      {
        action: 'dismiss',
        title: 'Not Now',
        icon: '/icons/mindgarden-icon-72x72.png',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * Notification Click Handler
 * 
 * Routes user to the appropriate flow based on:
 * - Which action button was clicked
 * - The flow type from the notification data
 * - Autostart parameter for immediate flow playback
 */
self.addEventListener('notificationclick', (event) => {
  console.log('🌱 Mind Garden SW: Notification clicked:', event.action, event.notification.data);
  event.notification.close();

  const notifData = event.notification.data || {};
  let targetUrl = '/dashboard';

  if (event.action === 'dismiss') {
    // User clicked "Not Now" - just close, don't open anything
    return;
  }

  // User clicked "Start Flow", the notification body, or any action
  if (notifData.flowType) {
    // Build URL with autostart parameter for pre-meeting flows
    targetUrl = `/flow/${notifData.flowType}?autostart=true`;
    if (notifData.meetingId) {
      targetUrl += `&meetingId=${notifData.meetingId}`;
    }
    console.log('🌱 Navigating to flow:', targetUrl);
  } else if (notifData.url) {
    // Use explicit URL from notification data
    targetUrl = notifData.url;
    console.log('🌱 Navigating to URL from data:', targetUrl);
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          // Navigate existing window to the target URL
          console.log('🌱 Navigating existing window to:', targetUrl);
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window if app not open
      console.log('🌱 Opening new window to:', targetUrl);
      return clients.openWindow(targetUrl);
    })
  );
});

// Handle skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🌱 Mind Garden SW: Activating immediately');
    self.skipWaiting();
  }
});
