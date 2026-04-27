// TR Farias Express — Driver PWA Service Worker v2
const CACHE_NAME = 'trfarias-driver-v2';
const SHELL_URLS = ['/driver', '/driver-manifest.json', '/driver-icon.svg'];

// ── Install: cache app shell ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for shell ───
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // API calls: network only, queue GPS mutations offline
  if (url.pathname.startsWith('/api/')) {
    if (event.request.method === 'POST' && url.pathname.includes('sendLocation')) {
      event.respondWith(
        fetch(event.request.clone()).catch(async () => {
          // Queue offline GPS update in IndexedDB for later flush
          try {
            const body = await event.request.json();
            const db = await openGpsQueue();
            const tx = db.transaction('queue', 'readwrite');
            tx.objectStore('queue').add({ ts: Date.now(), body });
          } catch (_) {}
          return new Response(JSON.stringify({ ok: true, queued: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );
      return;
    }
    return; // all other API calls: let pass through normally
  }

  // App shell & driver pages: network-first with cache fallback
  if (url.pathname.startsWith('/driver') || SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request).then(res => {
        if (res.status === 200 && event.request.method === 'GET') {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
        }
        return res;
      }).catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('/driver');
          return new Response('Offline', { status: 503 });
        })
      )
    );
    return;
  }
});

// ── Flush queued GPS points when back online ──────────────
self.addEventListener('message', (event) => {
  if (event.data === 'FLUSH_GPS_QUEUE') flushGpsQueue();
});

async function flushGpsQueue() {
  try {
    const db = await openGpsQueue();
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const all = await promisifyRequest(store.getAll());
    for (const item of all) {
      try {
        await fetch('/api/trpc/driverApp.sendLocation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.body),
        });
        store.delete(item.id);
      } catch (_) { break; }
    }
  } catch (_) {}
}

function openGpsQueue() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('trfarias-gps-queue', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Push notifications ────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'TR Farias Express', {
      body: data.body || '',
      icon: '/driver-icon.svg',
      badge: '/driver-icon.svg',
      tag: data.tag || 'trfarias-notification',
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
