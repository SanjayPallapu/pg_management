const STATIC_CACHE = 'pg-static-v6';
const DYNAMIC_CACHE = 'pg-dynamic-v6';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache authenticated API data. Cache Storage keys do not safely
  // isolate responses by Supabase user session, which can surface stale or
  // incorrect room/tenant data after an account or PG switch.
  const isAuthenticatedApiRequest =
    url.hostname.endsWith('.supabase.co') ||
    request.headers.has('authorization') ||
    request.headers.has('apikey');
  if (isAuthenticatedApiRequest) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // JavaScript bundles - Network first to avoid stale chunk mismatches & white screens
  if (request.destination === 'script') {
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
    return;
  }

  // Static media/styles/fonts - Cache first, fallback to network
  if (request.destination === 'style' || 
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }

  // HTML pages - Network first with cache fallback
  if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  // Default - Stale while revalidate
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// Always check the network for the application shell. Hashed JavaScript files
// change on every deployment, so serving an old HTML shell can request chunks
// that no longer exist on the server.
async function networkFirstDocument(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  try {
    const networkResponse = await fetch(request, { cache: 'no-store' });
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Cache first strategy
async function cacheFirstWithNetwork(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network first strategy
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);
  
  return cachedResponse || fetchPromise || new Response('Offline', { status: 503 });
}

// Handle background sync for offline mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-payments') {
    event.waitUntil(syncPendingPayments());
  }
});

async function syncPendingPayments() {
  // Placeholder for syncing pending mutations when back online
  console.log('Syncing pending payments...');
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });
  }
});
