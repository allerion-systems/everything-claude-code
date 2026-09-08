// Service worker for the Allerion War Room.
// App shell is precached and served cache-first so the board opens with no
// network. Pursuit data is network-first so a redeploy shows up immediately,
// falling back to cache when offline.

const VERSION = 'warboard-v2';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pursuit data: network-first, so a fresh sweep lands without a reinstall.
  if (url.pathname.endsWith('/data/pursuits.json')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Navigations: serve the shell so deep links work offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(RUNTIME).then((c) => c.put(request, copy));
      return res;
    })),
  );
});
