// Cross-origin isolation shim for static hosts (GitHub Pages) that cannot send headers.
// The multithreaded Unity build needs SharedArrayBuffer, which browsers only enable when the
// page is served with COOP: same-origin + COEP. This worker adds those headers to same-origin
// responses. Cross-origin requests (Cesium / tile servers) pass through untouched.
// It replaces Unity's default caching worker, which also kept stale builds forever.

const coep = new URL(self.location).searchParams.get("coep") || "credentialless";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // Drop caches left by the old Unity caching worker.
    for (const key of await caches.keys()) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (new URL(req.url).origin !== self.location.origin) return;
  if (req.cache === "only-if-cached" && req.mode !== "same-origin") return;

  e.respondWith((async () => {
    const res = await fetch(req);
    if (res.status === 0) return res;
    const headers = new Headers(res.headers);
    headers.set("Cross-Origin-Embedder-Policy", coep);
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  })());
});
