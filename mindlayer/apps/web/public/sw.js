const CACHE_VERSION = 'v2';
const STATIC_CACHE = `mindlayer-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `mindlayer-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/map',
  '/wrapped',
  '/login',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/apple-touch-icon.png',
  '/offline',
];

const APP_SHELL_ROUTES = ['/map', '/wrapped', '/inbox', '/timeline', '/nudges', '/settings'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) return;

  if (url.pathname === '/share-target' && request.method === 'POST') {
    event.respondWith(handleShareTarget(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (APP_SHELL_ROUTES.some((r) => url.pathname === r || url.pathname.startsWith(r + '/'))) {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineResponse();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('/offline') || offlineResponse();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(DYNAMIC_CACHE);
        cache.then((c) => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

function offlineResponse() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Mindlayer — Offline</title>
    <style>
      body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
        background:#0f0e0c;color:#e8e4dc;font-family:Inter,system-ui,sans-serif;text-align:center;padding:24px}
      h1{font-size:24px;font-weight:700;margin-bottom:8px}
      p{font-size:14px;color:#7a7469;max-width:320px}
      .dot{width:8px;height:8px;border-radius:50%;background:#52b788;display:inline-block;margin-bottom:20px;
        animation:pulse 2s ease-in-out infinite}
      @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
    </style></head>
    <body><div><div class="dot"></div><h1>You're offline</h1><p>Mindlayer will sync your data when you reconnect. Your map is waiting.</p></div></body>
    </html>`,
    { status: 503, headers: { 'Content-Type': 'text/html' } }
  );
}

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';
    const url = formData.get('url') || '';

    const shareData = { title, text, url, timestamp: Date.now() };
    await storeShareData(shareData);

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
      tx.objectStore('shares').add(data);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

// Push notifications
self.addEventListener('push', (event) => {
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
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      vibrate: [100, 50, 100],
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/map';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});

// Background sync
self.addEventListener('sync', (event) => {
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
        for (const share of getAllRequest.result) {
          try {
            const response = await fetch('/api/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: share.url, title: share.title,
                text: share.text, source: 'share-target',
              }),
            });
            if (response.ok) store.delete(share.timestamp);
          } catch { /* retry next sync */ }
        }
        resolve();
      };
    };
    request.onerror = () => reject(request.error);
  });
}

// Periodic digest check
self.addEventListener('periodicsync', (event) => {
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
        data: { url: '/inbox' },
        actions: [
          { action: 'view', title: 'View Digest' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });
    }
  } catch { /* offline or error — skip */ }
}
