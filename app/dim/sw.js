/* Service Worker ماژول «آنالیز» (نسخهٔ جدید — محاسبه‌گر کابینت).
   - سوییس قبلی همین ماژول (decor-dim-v*) که offline-first بود رو شناسایی و پاک می‌کنه،
     تا بعد از این دپلوی نسخهٔ کهنه از کش سرو نشه.
   - خودش هیچ چیزی کش نمی‌کنه: همهٔ درخواست‌ها به‌صورت پیش‌فرض از شبکه می‌آیند. */
self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k.indexOf('decor-dim') === 0; })
                               .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* بدون fetch handler یعنی عبور شبکه‌ای (passthrough) — کشی در کار نیست. */
