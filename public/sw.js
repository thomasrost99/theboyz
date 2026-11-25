// Network first: new deploys and data show up immediately. The cache is only an offline fallback.
const C = "boyz-v2";
self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((k) => Promise.all(k.filter((x) => x !== C).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || ["/api", "/messages", "/beer", "/photo", "/auth"].includes(u.pathname)) return;
  e.respondWith(fetch(e.request, { cache: "no-store" }).then((r) => { const c = r.clone(); caches.open(C).then((x) => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match("/"))));
});
