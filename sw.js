// Offline-first service worker. Bump VERSION whenever any file changes
// so phones pick up the new build.
const VERSION = "v2";
const CACHE = "nihongo-trainer-" + VERSION;
const ASSETS = [
  ".",
  "index.html",
  "styles.css",
  "app.js",
  "data/vocab.js",
  "data/kanji.js",
  "data/verbs.js",
  "data/particles.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first, falling back to network (and caching what we fetch).
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && e.request.method === "GET" && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
