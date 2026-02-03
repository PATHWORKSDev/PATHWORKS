const CACHE_VERSION = "pw-cache-v34";
const CORE_ASSETS = [
  "index.html",
  "pages/game.html",
  "pages/404.html",
  "pages/template.html",
  "assets/css/tokens.css",
  "assets/css/base.css",
  "assets/css/ui.css",
  "assets/css/pages/home.css",
  "assets/css/pages/game.css",
  "assets/js/core.js",
  "assets/js/ui.js",
  "assets/js/app.js",
  "assets/js/footer.js",
  "assets/js/sw-register.js",
  "assets/js/pages/home.js",
  "assets/js/pages/game.js",
  "assets/data/games.json",
  "assets/img/placeholders/banner.jpg",
  "assets/img/placeholders/title.png"
];

const toScopedUrl = (path) => new URL(path, self.registration.scope).toString();

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(CORE_ASSETS.map(toScopedUrl));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const isNavigation = request.mode === "navigate";
  if (isNavigation) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE_VERSION);
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match(toScopedUrl("index.html"));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, fresh.clone());
    return fresh;
  })());
});
