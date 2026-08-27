// PixelForge PWA service worker — prototype offline support.
// Strategy: network-first for page navigations (fall back to cache, then a
// bundled offline page); cache-first for hashed static assets and icons.

const CACHE = "pixelforge-v2";
const OFFLINE_URL = "/offline";
const PRECACHE = ["/offline", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin

  // Page navigations: network-first, fall back to cache then offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static assets: cache-first, then network (and cache the result).
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icon") || url.pathname.endsWith(".png") || url.pathname.endsWith(".svg")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
      )
    );
  }
});
