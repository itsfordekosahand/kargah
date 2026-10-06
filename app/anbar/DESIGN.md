# DESIGN — مهاجرت «انبار کارگاه» از Vanilla JS تک‌فایلی به Vue 3 + Vite + PrimeVue

منبع: `/tmp/kargah/x/kargah-super-main/public/anbar/index.html` (3091 خط)
تفکیک: style درون‌خطی لاین 17–448 (`analysis/head-style.css`)، سندکانفیگ لاین 449–454،
استایل سینک ابری لاین 456–479، بدنه HTML لاین 480–545 (`src-analysis/body.html`)،
اسکریپت اصلی لاین 546–3090 → `src-analysis/script.js` (2545 خط).

## ۱) نقشهٔ ساختار جدید

| منبع (تک‌فایلی) | مقصد ماژولار |
|---|---|
| ثابتها (KEY/API_BASE/…) | `config/constants.js` |
| `uid/num/fmt/esc/faNow/uniq` | `utils/format.js` |
| `ico()` | `utils/icons.js` |
| `hwTotal/toolOut/toolAvail/templateTotals/dashboardStats/…` | `core/totals.js` |
| `getInvoiceNumber/invoiceNumberFor/assignInvoiceNumber` | `core/invoice.js` |
| `printInvoice` (ساخت HTML) | `core/invoice-html.js` |
| `mergeRows/mergeWithTombstones/cleanOldTombstones/mergeById/idsBy` | `core/merge.js` |
| `renderSheetResults` (امتیازدهی) | `core/sheet-search.js` |
| `loadDemo` | `core/demo-data.js` |
| `apiOptions/readJson/pullTable/pullAll` | `store/api.js` (fetch تزریقی، بدون شبکه در تست) |
| `syncFromCloud/syncToCloud/queueSyncToCloud/adoptCloud` | `store/sync.js` |
| `state + save/load + اکشنها` | `store/anbar.js` (Pinia) |
| `exportBackup/exportHTML/openImportModal/doImport/wipe/demo` | `management/backup.js` |
| ثبت SW، beforeinstallprompt، رویداد online/offline | `management/pwa.js` |
| style لاین 17–448 + 456–479 | `styles/anbar.css` + `styles/sync-indicator.css` |
| `viewDash/viewTools/viewJobs/viewSheets/viewHardware/viewCalc/viewSettings` | `ui/views/*.vue` |
| مودال‌ها (ابزار، ویزارد، شروع کار، قلم فاکتور، بازیابی) | `ui/modals/*.vue` |
| `setModal/toast/drawer/fab/secHead/crumbs/catCard` | `ui/components/*` + `App.vue` |

## ۲) اتصال دیتابیس/API — باید عیناً حفظ شود

- `API_BASE = https://kargah-anbar-api.itsfordecosahand.workers.dev`
- همهٔ درخواست‌ها هدر `Content-Type: application/json` + `X-API-Key: wYb9X…GutboJ`
- `readJson`: اگر `!ok` → خطا؛ اگر content-type شامل `json` نباشد → خطای «Auth required» (پاسخ HTML از Cloudflare Access).

| متد | مسیر | بدنه/پاسخ |
|---|---|---|
| GET | `/api/tools` `/api/sheets` `/api/hardware` `/api/templates` `/api/jobs` | آرایهٔ ردیف |
| PUT | همان ۵ مسیر | بدنه: آرایهٔ کامل جدول (جایگزینی اتمیک) |
| GET | `/api/lock` | آرایهٔ ردیف‌های کاربر (`u_*` + قدیمی `lock`) |
| PUT | `/api/lock` | upsert یک ردیف کاربر |
| DELETE | `/api/lock/:id` | حذف ردیف کاربر |

منطق سینک (باید یکسان بماند):
1. `pullAll` ← ۵ GET موازی؛ هر شکستی یعنی pull ناموفق (هرگز جدول خالی = حذف‌همه تفسیر نشود).
2. اولین pull قبل از هر push انجام می‌شود تا دستگاه تازه کل دیتابیس را پاک نکند.
3. `adoptCloud(byTable, false)` سپس `adoptCloud(byTable, true)` (دو گذار ادغام tombstone‌دار).
4. فقط جدول‌هایی که با پاسخ سرور فرق دارند PUT می‌شوند.
5. Debounce 400ms، صف‌کردن edit قبل از pull، retry 5s، پینگ 20s، رویداد `online`.
6. حذف محلی = tombstone با مقدار `Date.now()` (نگاشت نوع→جدول: tool→tools، sheet→sheets، …).

## ۳) کلیدهای localStorage (باید عیناً حفظ شوند)
- `kargah_anbar_v8` ← `{tools,sheets,hardware,templates,jobs,tombstones}`
- `kargah_theme` ← `dark|light`
- `kargah_last_sync_ids` ← `{tools:[id],…}` (snapshot شناسه‌های آخرین pull موفق)
- `kargah_inv_counter` + `inv_num_<id8>` ← شمارندهٔ فاکتور
- sessionStorage: `decor_session_anbar` (توسط lock.js)
- شمارهٔ فاکتور روی خود قالب (`t.invNum`) نگه داشته می‌شود تا با سینک بین دستگاهها یکسان بماند.

## ۴) رفتار تب‌ها (پاریتی)
- **داشبورد**: ۵ KPI (کلیک → ناوبری)، کارهای در جریان (۴ اول)، هشدار ورق (qty≤2 یا تمام‌شده).
- **ابزار**: دسته‌ها ← لیست ابزارها؛ مودال افزودن/ویرایش (نام، دسته با datalist، تعداد، توضیح)؛
  نمایش «در امانت/موجود» از روی کارهای باز.
- **کارها**: فیلتر باز/بسته/همه؛ شروع کار جدید (جستجو + چک‌box + تعداد با سقف موجودی)؛
  جزئیات: نوار پیشرفت، تحویل تکی/همه، بستن/بازکردن، چاپ.
- **ورق**: دسته ← زیردسته ← لیست؛ ویزارد ۳ مرحله‌ای (دسته/زیردسته/مشخصات)؛ جستجوی ابعاد
  (حالت near/exact، حد تحمل %، امتیاز `errL*0.55+errW*0.45`، فیلتر `score<=tol`، سقف ۱۲ نتیجه).
- **یراق**: همان ساختار دسته/زیردسته + واحد piece/pack و `packSize`.
- **محاسبه و فاکتور**: کارت قالب‌ها؛ ویرایشگر قلم‌ها؛ تخفیف/مالیات/جمع زنده؛ شماره فاکتور؛
  چاپ/PDF با iframe.document.write (سند `core/invoice-html.js`).
- **پشتیبان‌گیری**: Export JSON، «ذخیره در خود فایل HTML»، Import با انتخاب ادغام/جایگزینی،
  دادهٔ نمونه، پاک‌کردن همه، آمار، نصب PWA، کارت ادمین (فقط `DecorAuth.isAdmin()`).

## ۵) باگ‌های شناسایی‌شده (رفع در BUGS.md)
1. نگاشت نادرست tombstone: `state.tombstones['tool']` (مفرد) به‌جای `'tools'` ← حذف بین دستگاهی برای tool/sheet/template/job کار نمی‌کرد.
2. `exportHTML`: `${localStorage.key || …}` ← `localStorage.key` تابع است و کد منبعش جایگزین می‌شد.
3. ویرایش ابزار و تغییر دسته ← ردیف از لیست فعلی ناپدید می‌شد (`toolCat` به‌روز نمی‌شد).
4. `viewTemplate` هر رندر `invoiceNumberFor` را صدا می‌زد (side-effect داخل render ⇒ push ابری).
5. `viewDash`: `'flag' in window ? 'tool' : 'tool'` ← شرط بی‌معنا.
6. `sw.js` فهرست precache شامل `style.css` بود که لینک نمی‌شد و خروجی بیلد را پوشش نمی‌داد.
7. ورودی‌های موبایل با فونت کوچک‌تر از ۱۶px ← زوم خودکار iOS.
8. `window.print()` inline در HTML (`onclick`) ← حذف (CSP/پاکی کد) و جایگزینی با `@click`.
