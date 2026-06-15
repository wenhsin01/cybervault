/* CyberVault Service Worker v1.2 */
const CACHE_NAME = "cybervault-v3";

// 需要快取的核心檔案（離線也能載入 App 殼層）
const CORE_FILES = [
  "/cybervault/index.html",
  "/cybervault/manifest.json",
  "/cybervault/icon-192.png",
  "/cybervault/icon-512.png"
];

// ── 安裝：預先快取核心檔案 ──
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_FILES).catch(err => {
        console.warn("[SW] 部分快取失敗（圖示可能尚未存在）", err);
        return cache.add("/cybervault/index.html");
      });
    })
  );
  self.skipWaiting();
});

// ── 啟用：清除舊快取 ──
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── 攔截請求：網路優先，失敗時回退快取 ──
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Firebase API 與 Google API 永遠走網路，不快取
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("google") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("googleapis")
  ) {
    return;
  }

  // 本地資源：網路優先，離線回退快取
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          return caches.match("/cybervault/index.html");
        });
      })
  );
});
