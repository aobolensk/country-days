const CACHE_NAME = "country-days";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./sync.js",
  "./google-drive.js",
  "./manifest.webmanifest",
  "./icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("country-days-v"))
          .map((key) => caches.delete(key).catch(() => false))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || request.headers.has("Authorization") || request.cache === "no-store"
    || url.origin === "https://www.googleapis.com" || url.origin === "https://accounts.google.com") {
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok || response.type === "opaque") {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, response.clone()))
            .catch(() => {})
        );
      }
      return response;
    } catch (error) {
      const cached = await caches.open(CACHE_NAME)
        .then(async (cache) => await cache.match(request)
          || (request.mode === "navigate" && await cache.match("./index.html")))
        .catch(() => null);
      if (cached) {
        return cached;
      }
      throw error;
    }
  })());
});
