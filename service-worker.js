const CACHE='cordillera-rush-v1';
const ASSETS=[
  'index.html',
  'manifest.webmanifest',
  'assets/favicon.png',
  '../src/main.js'
];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); });
self.addEventListener('fetch',e=>{ e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request))); });
