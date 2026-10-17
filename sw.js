const CACHE_PREFIX = `centered-clock:${self.registration.scope}:`;
// Bump the version whenever any app-shell file changes, including this list.
const CACHE_VERSION = 2;
const CACHE_NAME = `${CACHE_PREFIX}v${CACHE_VERSION}`;
const APP_SHELL = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./js/main.js",
  "./js/config.js",
  "./js/state.js",
  "./js/settings.js",
  "./js/ui.js",
  "./js/clock.js",
  "./js/matrix.js",
  "./js/audio/engines.js",
  "./js/audio/manager.js",
  "./manifest.webmanifest",
  "./icons/clock-192.png",
  "./icons/clock-512.png",
].map((path) => new URL(path, self.registration.scope).href);
const INDEX_URL = new URL("./index.html", self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          APP_SHELL.map((url) => new Request(url, { cache: "reload" })),
        ),
      ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => {
            if (!name.startsWith(CACHE_PREFIX)) return false;
            const version = name.slice(CACHE_PREFIX.length).match(/^v(\d+)$/);
            // A newer worker may already be populating its cache.
            return version !== null && Number(version[1]) < CACHE_VERSION;
          })
          .map((name) => caches.delete(name)),
      ),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  url.search = "";
  const assetURL =
    event.request.mode === "navigate" && url.href === self.registration.scope
      ? INDEX_URL
      : url.href;
  if (!APP_SHELL.includes(assetURL)) return;

  // Keep HTML and modules on the same release until the next worker activates.
  event.respondWith(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.match(assetURL))
      .then((response) => response || fetch(event.request)),
  );
});
