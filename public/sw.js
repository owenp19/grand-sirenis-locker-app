/* La PWA conserva los archivos visuales; nunca almacena respuestas de la API ni datos personales.
   Los recursos del shell usan red primero para que una actualización de CSS/JS nunca quede oculta
   detrás de la caché; la caché solo responde cuando no hay servidor local. */
const CACHE = 'grand-sirenis-locker-shell-v12';
const ASSETS = [
  './offline.html',
  './assets/css/theme.css',
  './assets/css/app.css',
  './assets/css/auth.css',
  './assets/css/welcome.css',
  './assets/css/components.css',
  './assets/css/motion.css',
  './assets/css/settings.css',
  './assets/fonts/roboto-latin.woff2',
  './assets/icons/lucide-sprite.svg',
  './assets/image/grand-sirenis-locker-app-logo-black-720.png',
  './assets/image/grand-sirenis-locker-app-favicon.png',
  './assets/js/app.js',
  './assets/js/auth.js',
  './assets/js/motion.js',
  './assets/js/settings.js',
  './assets/js/profile.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
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

// Solo rutas estáticas exactas pueden entrar en Cache Storage.
// Ninguna respuesta de API, sesión ni dato privado se almacena.
const STATIC_PATHS = new Set(ASSETS.map((a) => new URL(a, self.location.href).pathname));
const PRIVATE_PATHS = ['/api.php', '/login.php', '/logout.php', '/setup.php', '/register.php',
                       '/index.php', '/welcome.php'];

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Consultas (incluidas las de api.php?resource=...) nunca se cachean.
  if (url.search) return;
  if (PRIVATE_PATHS.some((p) => url.pathname.endsWith(p))) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match('./offline.html')));
    return;
  }

  if (!STATIC_PATHS.has(url.pathname)) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response && response.ok && !String(response.headers.get('Cache-Control') || '').includes('no-store')) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(url.pathname, copy));
        }
        return response;
      })
      .catch(() => caches.match(url.pathname).then((hit) => hit || Response.error()))
  );
});
