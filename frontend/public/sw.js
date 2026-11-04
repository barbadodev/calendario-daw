// Service worker para PWA (cachea solo la interfaz, NUNCA los datos) + notificaciones push
const CACHE_NAME = 'caldaw-v2';

// vite-plugin-pwa sustituye self.__WB_MANIFEST por la lista de ficheros generados en el build
const assetsBuild = (self.__WB_MANIFEST || []).map(e => (typeof e === 'string' ? e : e.url));

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  ...assetsBuild
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // allSettled: si un fichero falla no abortamos toda la instalación
    await Promise.allSettled(urlsToCache.map(u => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // limpiar cachés viejas para que la app actualizada se vea enseguida
    for (const clave of await caches.keys()) {
      if (clave !== CACHE_NAME) await caches.delete(clave);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // La API, Supabase y todo lo dinámico van SIEMPRE en vivo (eventos actualizados)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Navegación (abrir la app): primero la red, la caché solo si no hay internet
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/')))
    );
    return;
  }

  // Estáticos (JS/CSS/iconos): se sirven de caché al instante y se actualizan en segundo plano
  event.respondWith(
    caches.match(req).then(cached => {
      const enRed = fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
          }
          return res;
        })
        .catch(() => cached);
      return cached || enRed;
    })
  );
});

// Mostrar notificación push
self.addEventListener('push', event => {
  let data = {};
  try {
    if (event.data) data = event.data.json();
  } catch {
    // Un push sin JSON válido no debe impedir que se muestre la notificación.
    data = {};
  }
  const titulo = data.titulo || 'Calendario DAW';
  const opciones = {
    body: data.cuerpo || 'Nuevo evento',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url }
  };

  event.waitUntil(
    self.registration.showNotification(titulo, opciones)
  );
});

// Click en notificación
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});
