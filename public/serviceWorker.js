const CACHE_VERSION = 'pg-hub-pwa-v7';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Core static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.jpg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Install event - pre-cache core static shell and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  const allowedCaches = [STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!allowedCaches.includes(cacheName)) {
              console.log('[SW] Deleting legacy cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Message listener for skipWaiting trigger
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - cache strategy router
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Never cache authenticated backend/Supabase APIs
  const isApiOrAuth =
    url.hostname.endsWith('.supabase.co') ||
    request.headers.has('authorization') ||
    request.headers.has('apikey') ||
    url.pathname.startsWith('/rest/v1/') ||
    url.pathname.startsWith('/auth/v1/');

  if (isApiOrAuth) {
    return;
  }

  // 3. Document / Navigation (HTML pages) -> Network-first
  // Ensures user always gets the latest index.html pointing to latest JS chunks on Vercel
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  // 4. Vite hashed assets (/assets/*) -> Cache-first
  // Vite appends unique hash to every chunk; cached chunks never become stale
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  // 5. Static icons, images, fonts -> Stale while revalidate
  if (
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // 6. Default -> Network first with cache fallback
  event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
});

// Network-first for HTML documents
async function networkFirstDocument(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  try {
    const networkResponse = await fetch(request, { cache: 'no-store' });
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Fallback to root shell
    const rootShell = await cache.match('/');
    if (rootShell) {
      return rootShell;
    }
    return new Response('PG HUB is currently offline. Please check your internet connection.', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Cache-first for hashed Vite assets
async function cacheFirstAsset(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return cached || new Response(null, { status: 404 });
  }
}

// Stale-while-revalidate for images & static files
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response(null, { status: 503 });
}

// Network-first with cache fallback
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response(JSON.stringify({ error: 'Network unavailable', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Push notification listener
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      self.registration.showNotification(data.title || 'PG HUB Notification', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: data.url || '/',
      });
    } catch {
      self.registration.showNotification('PG HUB', {
        body: event.data.text(),
        icon: '/icon-192.png',
      });
    }
  }
});

// Notification click -> open or focus PWA window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
