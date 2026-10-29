// Service Worker: speichert die App auf dem Gerät, damit sie offline läuft.
// Bei jeder neuen Version CACHE-Namen hochzählen.
const CACHE = "kompressor-v1.2.0";
const FILES = [
  "./", "index.html", "style.css", "config.js", "pdf.js", "app.js",
  "vendor/jspdf.umd.min.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];

// Beim Update alle Dateien frisch vom Server holen ("reload"), nicht aus dem
// Browser-Zwischenspeicher. GitHub Pages lässt Dateien bis zu 10 Minuten
// zwischenspeichern – sonst würde die neue Version mit alten Dateien gefüllt.
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Erst aus dem Speicher laden (schnell, offline), im Hintergrund beim Server nachfragen.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }).then(res => {
        if (res && res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
