const CACHE_NAME = 'mindlayer-v1';
const STATIC_CACHE = 'mindlayer-static-v1';
const DYNAMIC_CACHE = 'mindlayer-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/apple-touch-icon.png',
];

const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle share target POST requests
  if (url.pathname === '/share-target' && request.method === 'POST') {
    event.respondWith(handleShareTarget(request));
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - cache first
  event.respondWith(cacheFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, returning offline page');
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle share target submissions
async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';
    const url = formData.get('url') || '';

    // Store in IndexedDB for later processing
    const shareData = { title, text, url, timestamp: Date.now() };
    await storeShareData(shareData);

    // Redirect to share-target page with data
    const params = new URLSearchParams({
      title: title.toString(),
      text: text.toString(),
      url: url.toString(),
    });
    
    return Response.redirect(`/share-target?${params.toString()}`, 303);
  } catch (error) {
    console.error('[SW] Share target error:', error);
    return Response.redirect('/share-target?error=true', 303);
  }
}

// Store share data in IndexedDB
async function storeShareData(data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mindlayer-shares', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('shares')) {
        db.createObjectStore('shares', { keyPath: 'timestamp' });
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('shares', 'readwrite');
      const store = tx.objectStore('shares');
      store.add(data);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'Mindlayer',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'mindlayer-notification',
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline shares
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-shares') {
    event.waitUntil(syncPendingShares());
  }
});

async function syncPendingShares() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mindlayer-shares', 1);
    
    request.onsuccess = async () => {
      const db = request.result;
      const tx = db.transaction('shares', 'readwrite');
      const store = tx.objectStore('shares');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = async () => {
        const shares = getAllRequest.result;
        
        for (const share of shares) {
          try {
            const response = await fetch('/api/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: share.url,
                title: share.title,
                text: share.text,
                source: 'share-target',
              }),
            });
            
            if (response.ok) {
              store.delete(share.timestamp);
            }
          } catch (error) {
            console.error('[SW] Failed to sync share:', error);
          }
        }
        
        resolve();
      };
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Periodic background sync for digest notifications
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);
  
  if (event.tag === 'daily-digest') {
    event.waitUntil(checkForDigest());
  }
});

async function checkForDigest() {
  try {
    const response = await fetch('/api/digest/check');
    const data = await response.json();
    
    if (data.hasDigest) {
      await self.registration.showNotification('Your Daily Mindlayer Digest', {
        body: data.summary,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'daily-digest',
        data: { url: '/digest' },
        actions: [
          { action: 'view', title: 'View Digest' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });
    }
  } catch (error) {
    console.error('[SW] Digest check failed:', error);
  }
}

console.log('[SW] Service worker loaded');
