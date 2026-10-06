# NOTES — ماژول «انبار» (anbar-app)

مرجع تم/الگو: ماژول **مالی** (`fin-app/src/modules/maldi`).

---

## وضعیت تحویل

### زیرساخت
- [x] `node_modules` symlink به `/tmp/anbar-nm-anbarapp` — **بدون npm install**.
- [x] لایهٔ داده: `store/api.js`، `store/sync.js`، `store/anbar.js` (Pinia).
- [x] منطق خالص: `core/*`، `utils/*`، `management/{backup,pwa}.js`.
- [x] UI: `App.vue` + `ui/components/*` + `ui/views/*` + `ui/modals/*` + `ui/actions.js`.
- [x] تست‌های موجود پروژه: **هیچ فایل تستی در `src/` وجود ندارد** و اسکریپت
      `test` هم در `package.json` تعریف نشده (`npm test` ⟵ `Missing script`).
      چیزی حذف نشده؛ این وضعیت از ابتدا همین بود. بررسی: `find src -name '*.test.js'` = ۰.

### ناتمام‌های تحویل (بسته شد)
- [x] `scripts/gen-sw.mjs` — تولید `sw.js` از خروجی واقعی `dist`
      (**۱۷ دارایی** precache در کش `decor-anbar-v1`).
- [x] `package.json` — `build` = `vite build && node scripts/gen-sw.mjs` + اسکریپت `gen:sw`.
- [x] `public/sw.js` کهنه حذف شد (فهرست کش باید با `dist` هم‌تراست باشد).
- [x] `vite.config.js` — `preview` روی **4174** با `strictPort`.
- [x] `manifest.webmanifest` + `index.html` (`theme-color`) با پالت هماهنگ شد.
- [x] **اجرای کامل مرورگری**: لاگین mock (PBKDF2 واقعی + glob روی `/api/*`)،
      ۷ تب، ۵ drill-down، جزئیات کار، فاکتور، **۶ مودال** (همه باز و بسته شدند).
- [x] **سرریز موبایل ۳۶۰ / ۳۹۰ / ۴۱۴**: صفر سرریز، صفر عنصر خارج از ویوپورت.
- [x] **تست آفلاین**: `setOffline(true)` + reload ⟵ اپ از کش بالا آمد.
- [x] اسکرین‌شات‌ها: **۳۱** فایل در `/data/.hermes/cache/scratch/anbar-shots/`.
- [x] بیلد نهایی: `npm run build` ⟵ **exit 0**.
- [x] `BUGS.md` و `NOTES.md` به‌روز.

### هماهنگی با ماژول «مالی»
- [x] **رنگ** — پالت `maldi.css` عیناً؛ لهجهٔ `#d97706` و سرمه‌ای `#0b1220` حذف.
      رنگ‌های حالت روشن هم از همان خانوادهٔ خنخی (نه آبی).
- [x] **فونت** — Vazirmatn اول، **محلی و بدون CDN** (md5 یکسان با مالی).
- [x] **مقیاس سایز** — پایه و سطوح با مقیاس مالی هم‌راستا.
- [x] **آیکون** — ۲۰px ناوبری/دراور، ۱۸px دکمه‌های آیکنی؛
      `stroke-width:2`، خط/گوشهٔ گرد، `currentColor`، `viewBox="0 0 24 24"`.
- [x] **شعاع گردی گوشه** — `--radius:12px` / `--radius-sm:8px` / `--radius-lg:16px`.
- [x] **ساختار تم دست‌نخورده ماند** (دستور صریح): بلوک‌های
      `:root,[data-theme="dark"]` و `[data-theme="light"]`، کلاس تم،
      `darkModeSelector:'[data-theme="dark"]'`، `toggleTheme()` +
      `localStorage['kargah_theme']`. حالت روشن **حذف نشد**.

### قابلیت جدید — فرمت مبلغ
- [x] `core/amount-format.js` (util قابل استفادهٔ مجدد) + `ui/components/AmountField.vue`.
- [x] وصل به `ItemModal.unitPrice` + سطوح فاکتور در `TemplateView.vue` و `core/invoice-html.js`.
- [x] **۶۶/۶۶** تست اسکرچ پاس + اثبات مرورگری با اسکرین‌شات.

---

## نکات اجرا

```bash
# بیلد (شامل تولید sw.js)
cd /data/.hermes/cache/scratch/kargah-migrate/anbar-app
npm run build              # exit 0؛ ۱۷ دارایی precache

# فقط بازتولید sw.js
npm run gen:sw

# پیش‌نمایش (پورت ۴۱۷۴) — بعد از هر بیلد باید ری‌استارت شود
npm run preview             # http://127.0.0.1:4174/

# تست مرورگری (باید background اجرا شود؛ foreground تایم‌اوت می‌خورد)
cd /data/.hermes/cache/scratch
node anbar-verify.mjs > anbar-verify.log 2>&1
node amount-format-check.mjs        # ۶۶/۶۶
node invoice-html-check.mjs         # ۵/۵
```

**قواعد محیط**
- `npm install` نکن — `node_modules` از قبل symlink است.
- اسکریپت‌های Playwright باید **background** اجرا شوند (foreground به `exit 124` می‌خورد).
- اگر خروجی خالی یا `browser has been closed` دیدی: `pkill -f chrome-headless-shell`.
- اسکریپت‌های تأییدی فقط در `/data/.hermes/cache/scratch/` — نه داخل پروژه.

---

## نکات حیاتی (درس‌های این تحویل)

1. **SW فقط روی بستر امن ثبت می‌شود** — `127.0.0.1` و `[::1]` هم بستر امن‌اند.
   با شرطِ فقط `localhost`، پیش‌نمایش Vite اصلاً SW ثبت نمی‌کرد و
   `serviceWorker.ready` برای همیشه معلق می‌ماند (دو بار hang شد).
2. **کلید کش = `url.pathname`، نه خود `Request`.** پیش‌نمایش `Vary: Origin` می‌فرستد و
   `caches.match(req)` در آن شرایط هرگز match نمی‌شود ⇒ آفلاین هیچ‌وقت کار نمی‌کند.
3. **`precache` باید فهرست واقعی `dist` باشد.** ارجاع به فایل ناموجود
   (مثل `style.css` که در `dist` نبود) باعث می‌شود کل `install` شکست بخورد و SW از کار بیفتد.
4. **fallback به `index.html` برای هر GET ناموفق نگذار** — ماژول با MIME اشتباه
   `text/html` برمی‌گردد و بوت نمی‌شود.
5. **`v-html` آیکون‌ها نباید پوستهٔ `<svg>` را بگیرد.** حذف پوسته یعنی حذف
   `fill`/`stroke`/`stroke-width` ⇒ گره‌های بی‌والد در DOM و هیچ رسمی.
6. **نمونه‌برداری تم بعد از reflow** — خواندن `getComputedStyle` در همان tick
   بعد از تغییر صفت، مقدارِ پیش از `transition` را می‌دهد. کلیک واقعی + `waitForTimeout`.
7. **کنتراست WCAG را حساب کن، حدس نزن.** سفید روی `#FF9900` = ۲٫۱۴:۱ (شکست AA)؛
   `#111111` روی همان = ۸٫۸۲:۱.

---

## مانده برای بعد

- `public/lock.js` یک `DECOR_LOCK_API_BASE` و یک کلید/توکن **هاردکد** دارد؛
  بهتر است به متغیر محیطی منتقل و چرخش داده شود (خارج از دامنهٔ این تحویل).