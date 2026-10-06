# NOTES.md — پیشرفت مهاجرت «مالی» (fin → Vue3/Vite/PrimeVue)

مسیر مقصد: `/data/.hermes/cache/scratch/kargah-migrate/fin-app`
منابع (فقط‌خواندنی): `/tmp/kargah/x/kargah-super-main/public/fin/` و مرجع `cabinet-app`

## وضعیت

| مرحله | وضعیت |
|---|---|
| استخراج inventory → DESIGN.md | ✅ انجام شد |
| اسکلت پروژه (package.json, vite.config, node_modules symlink, index.html + seed) | ✅ |
| asset: آیکون‌ها، Vazirmatn (self-host)، chart.umd.js (vendor) | ✅ |
| CSS مبدأ → `styles/maldi.css` (۳۱,۵۷۵ بایت / ۲۶۴ خط) | ✅ |
| `utils/icons.js` (۲۲ آیکون از JSX) | ✅ |
| `core/jalali.js`, `config/units.js`, `core/finance.js`, `core/data.js`, `utils/backup.js` | ✅ |
| `core/api.js` (تنها fetch: dump + lock), `config/tables.js` | ✅ |
| `core/sync.js` (پورت وفادانه sync.js) | ✅ |
| `core/lock-crypto.js` + `core/lock.js` (پورت با اسکریپت scripts/port-lock.mjs) | ✅ (syntax با esbuild چک شد) |
| store (Pinia) + notify | ✅ |
| صفحات و مودال‌ها (۷ صفحه + ۱۰ مودال) | ✅ |
| sw/manifest | ✅ sw با precache ۲۰ دارایی (کش `decor-fin-v1`) |
| build + preview(4175) + تأیید Playwright | ✅ انجام شد (۱۴۰۵/۱۰/۰۵) |
| تست‌های core | طبق دستور کاربر حذف شد (فایل تست جدید ساخته نشد) |
| BUGS.md | ✅ |

## تصمیم‌های کلیدی
- **seed داده** در `index.html` به‌صورت inline (`#app-data`) حفظ شد — عیناً مانند مبدأ.
- **ترتیب بوت**: `boot()` → `KTD_SYNC.start()` → `app.mount()` تا هوک `Storage.prototype.setItem`
  قبل از اولین `saveData` نصب شود (در React این ترتیب به‌صورت طبیعی رخ می‌داد چون effect ها بعد از commit
  اجرا می‌شوند؛ در Vue onMounted همگام است) — بدون این ترتیب، آپلود اولیه سند انجام نمی‌شد.
- **lock.js** با اسکریپت `scripts/port-lock.mjs` از منبع پورت شده (IIFE حذف، کریپتو → `lock-crypto.js`
  و transport → `api.js`). گارد `typeof document` اضافه شد تا در `node --test` قابل import باشد.
- **fetch فقط در `core/api.js`**؛ sync و lock از آن import می‌کنند.
- chart.js به‌صورت UMD در `public/vendor/chart.umd.js` (بدون CDN) و `<script>` کلاسیک در index.html.

## نکات اجرا
- `node_modules` → symlink به `/tmp/cabinet-nm/node_modules` (بدون npm install).
- پیش‌نمایش: `npm run preview` (پورت 4175).

## دو نکتهٔ ریز که فقط در `sw.js` معتبر است
- **کلید کش = pathname، نه شیء Request.** سرور هدر `Vary: Origin` می‌فرستد، پس
  `caches.match(request)` برای درخواست‌های CORS (اسکریپت ماژول/CSS) هرگز به رکورد کش
  نمی‌رسد. `caches.match(url.pathname)` درست است.
- **fallback به `index.html` فقط برای navigate.** برای دارایی‌ها یعنی MIME اشتباه و
  اپ بالا نمی‌آید (BUG-2 در BUGS.md).
- برای ریشه‌یابی سریع خطاهای باندل minify‌شده: `dist/assets/index-*.js` را با
  `grep -o` روی نام کوتاهِ کمپینگ (مثل `e0`) پیدا کن و با فایل منبع تطبیق بده.
