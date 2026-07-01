const CACHE_NAME = "cv-portal-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",
];

// Paths that are allowed to be cached
const CACHEABLE_PATHS = [
  "/_next/static/",
  "/icons/",
  "/manifest.json",
];

function isCacheablePath(url) {
  const path = new URL(url).pathname;
  return CACHEABLE_PATHS.some((prefix) => path.startsWith(prefix));
}

// Install event - cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first strategy with cache fallback
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  const isNavigation = event.request.mode === "navigate";
  const isCacheable = isCacheablePath(event.request.url);

  // Only cache static assets and navigation requests
  if (!isNavigation && !isCacheable) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache static assets and navigation requests
        if (isCacheable || isNavigation) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If navigation request, return cached home page
          if (isNavigation) {
            return caches.match("/");
          }
          return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
      })
  );
});
