// sw.js — SpinDecks service worker.
// Strategy: network-first for navigations and same-origin GETs, falling back
// to the cache when offline; the app shell is pre-cached on install so a cold
// offline load still works. Bump CACHE when shipping new assets.
const CACHE = "spindeck-v20260801m";

// Core shell — enough to boot the app offline. Tool-page HTML and JS modules
// are cached lazily on first visit (JS carries ?v= tokens, so a bump re-fetches).
const SHELL = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/site.webmanifest",
  "/assets/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll is atomic; tolerate a missing optional asset by adding individually.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let cross-origin pass through

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cache a copy of good responses for offline use.
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        // Offline: serve the cached page/asset, else fall back to the hub.
        caches.match(req).then((hit) => hit || caches.match("/index.html"))
      )
  );
});
