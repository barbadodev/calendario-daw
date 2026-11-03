// Service worker básico para PWA
const CACHE_NAME = 'caldaw-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Mostrar notificación push
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
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
