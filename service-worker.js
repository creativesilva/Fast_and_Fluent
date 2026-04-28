const CACHE_NAME = "rocket-book-games-2026-04-28-mobile-shell-1";

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./fast.html",
  "./spell.html",
  "./rainbow.html",
  "./learn.html",
  "./letter_sounds.html",
  "./counting.html",
  "./shapes.html",
  "./colors.html",
  "./mobile-fixes.css",
  "./app-shell.js",
  "./manifest.webmanifest",
  "./version.json",
  "./rocket_book_logo.png",
  "./rocket_book_favicon.png",
  "./fast_and_fluent_logo.png",
  "./rainbow_reader_logo.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(SHELL_ASSETS.map((asset) => cache.add(asset).catch(() => null)))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function fetchFresh(request) {
  return fetch(new Request(request, { cache: "no-store" }));
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetchFresh(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fresh = fetch(request).then((response) => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || fresh;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const acceptsHtml = request.headers.get("accept")?.includes("text/html");
  const isShellFile = /\.(html|css|js|json|webmanifest)$/i.test(url.pathname);

  if (request.mode === "navigate" || acceptsHtml || isShellFile) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
