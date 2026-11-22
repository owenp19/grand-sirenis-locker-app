/* La PWA conserva los archivos visuales; nunca almacena respuestas de la API ni datos personales.
   Los recursos del shell usan red primero para que una actualización de CSS/JS nunca quede oculta
   detrás de la caché; la caché solo responde cuando no hay servidor local. */
const CACHE = 'grand-sirenis-locker-shell-v8';
const ASSETS = [
  './offline.html',
  './assets/css/theme.css',
  './assets/css/app.css',
  './assets/css/auth.css',
  './assets/css/welcome.css',
  './assets/css/components.css',
  './assets/css/motion.css',
  './assets/fonts/roboto-latin.woff2',
  './assets/icons/lucide-sprite.svg',
  './assets/image/grand-sirenis-locker-app-logo-black-720.png',
  './assets/js/app.js',
  './assets/js/auth.js',
  './assets/js/motion.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.endsWith('/api.php') ||
    url.pathname.endsWith('/login.php') ||
    url.pathname.endsWith('/setup.php') ||
    url.pathname.endsWith('/register.php') ||
    url.pathname.endsWith('/logout.php')
  ) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match('./offline.html')));
    return;
  }

  if (ASSETS.some((asset) => url.pathname.endsWith(asset.replace('./', '/')))) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => caches.match(req).then((hit) => hit || Response.error()))
    );
  }
});
