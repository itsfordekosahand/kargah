# DESIGN.md — طرح بازنویسی ماژول «مالی» (fin) از React/Babel تک‌فایلی به Vue 3 + Vite + PrimeVue

> این سند **قبل از پیاده‌سازی** از کد مبدأ استخراج شده و مبنای تطبیق هر ماژول است.
> کد مبدأ (فقط‌خواندنی): `/tmp/kargah/x/kargah-super-main/public/fin/`
> الگوی مرجع فریم‌ورک: `/data/.hermes/cache/scratch/cabinet-app` (ماژول `cabinet-dimensions`)

---

## ۰. منابع و ابعاد

| فایل مبدأ | حجم/تعداد خط | نقش |
|---|---|---|
| `index.html` | ۱۴۶KB / ۱۳۹۲ خط | CSS (۲۶۴ خط)، seed داده (`#app-data`)، کل اپ React (۱۰۸۶ خط `text/babel`) |
| `sync.js` | ۱۹KB / ۵۶۱ خط | لایه همگام‌سازی ابری (pull → reconcile → یک PUT اتمیک) |
| `lock.js` | ۳۹KB / ۷۶۹ خط | ورود/نقش‌ها (admin/user)، کنسول مدیریت کاربران، کریپتو PBKDF2 |
| `sw.js` | ۹۲ خط | Service worker با precache پوسته + کتابخانه‌های CDN |
| `manifest.webmanifest` | ۲۲ خط | مانیفست فارسی/RTL |
| آیکون‌ها (۸ فایل PNG) | — | favicon / icon-192/512 / maskable / apple-touch |

وابستگی‌های CDN مبدأ (که باید حذف/داخلی شوند):
`react@18`، `react-dom@18`، `@babel/standalone`، `chart.js@4.4.0`، `vazirmatn@33.0.3`.

---

## ۱. فهرست کامل بخش‌ها (صفحات)

ناوبری سایدبار (`App.pages`) — ۷ صفحه + «تنظیمات»:

| # | id | برچسب | کامپوننت مبدأ | کامپوننت مقصد |
|---|---|---|---|---|
| ۱ | `dashboard` | داشبورد | `Dashboard` (خط ۶۷۵) | `ui/DashboardPage.vue` |
| ۲ | `checks` | چک‌ها | `ChecksPage` (۷۹۲) | `ui/ChecksPage.vue` |
| ۳ | `expenses` | هزینه‌ها | `ExpensesPage` (۸۹۹) | `ui/ExpensesPage.vue` |
| ۴ | `debts` | بدهی‌ها | `DebtsPage` (۱۰۰۳) | `ui/DebtsPage.vue` |
| ۵ | `allocations` | تخصیص | `AllocationPage` (۱۰۷۰) | `ui/AllocationPage.vue` |
| ۶ | `reports` | گزارش و تقویم | `ReportsPage` (۱۲۴۶) + `ShamsiCalendar` (۱۱۹۱) | `ui/ReportsPage.vue` + `ui/components/ShamsiCalendar.vue` |
| ۷ | `transactions` | تراکنش‌ها | `TransactionsPage` (۱۱۳۳) | `ui/TransactionsPage.vue` |
| — | — | تنظیمات | `SettingsModal` (۵۰۴) | `management/SettingsModal.vue` |

جزئیات هر صفحه:

### ۱.۱ داشبورد (`Dashboard`)
- سلکتور ماه شمسی (prev/next) با `viewJY/viewJM` پیش‌فرض = ماه جاری.
- آمار ماه: مجموع چک‌های ماه / منتقل‌شده کل دوره / همه منتظرها / نقدشده ماه (با نوار درصد) / هزینه‌های ماه (با نوار درصد پرداخت).
- آمار ۲تایی: مجموع دریافتی کل دوره، مجموع پرداختی کل دوره.
- کارت موجودی فعلی صندوق (`allTimeCashed - allTimePaid`) + پیش‌بینی بعد از تسویه هزینه‌های ماه.
- ۲ نمودار Chart.js: doughnut (دریافتی/منتقل/منتظر/بدهی) و bar افقی (توزیع هزینه‌ها به تفکیک دسته).
- جدول «آخرین تراکنش‌ها» (۵ مورد آخر، `slice(-5).reverse()`) + دکمه «مشاهده همه» → `transactions`.
- افکت‌های محاسباتی: `monthChecks` فیلتر بر اساس بازه `jalaliMonthRange`، `allTimePaid` از `paidRecord.expenses`، `currentBalance`، `projectedBalance`.

### ۱.۲ چک‌ها (`ChecksPage`)
- تب‌ها: همه / منتظر پاس / نقد شده / منتقل شده / برگشتی.
- جدول: صاحب چک (نام + یادداشت + گیرنده انتقال)، مبلغ + حروف فارسی، سررسید شمسی، وضعیت، عملیات.
- عملیات شرطی بر اساس status:
  - `pending`: «نقد کردن»، «انتقال» (→ `TransferModal`)، «برگشتی»، ویرایش، حذف
  - `cashed`: «تخصیص‌ها» (نمایش)، «برگشت به انتظار»، ویرایش، حذف
  - `transferred`: «برگشت به انتظار»، ویرایش، حذف
- فرم چک (مودال افزودن/ویرایش یکسان): نام، مبلغ، تاریخ سررسید، تاریخ صدور (`JalaliDatePicker`)، توضیحات. اعتبارسنجی: سه فیلد اجباری → toast «لطفاً تمام فیلدها را پر کنید».
- همه تغییرات از طریق `recordTx` لاگ تراکنش می‌شوند (`check_add/edit/delete/cash/bounce/transfer/revert`).
- حذف چک: confirm سفارشی + حذف تخصیص‌های وابسته + بازمحاسبه `syncPaidFromAllocations`.
- مرتب‌سازی: `sort by dueDate`.

### ۱.۳ هزینه‌ها (`ExpensesPage`)
- دکمه «قالب‌ها» → `ExpenseTemplatesModal`، دکمه «هزینه جدید».
- تب‌ها: همه / تکرارشونده / یکبار.
- جدول: نام، مبلغ+حروف، روز سررسید (با روز مؤثر `effectiveDueDay`)، دکمه پرداخت ماه جاری (`togglePaid` — سبز/قرمز، تگ «امروز»)، دسته، نوع، ویرایش/حذف.
- فرم: نام، مبلغ، روز (۱..۳۱)، دسته (اجاره/حقوق/قبوض/متفرقه)، چک‌باکس تکرارشونده + دکمه «ذخیره قالب».
- `add/update/delete` → `syncPaidFromAllocations` + `recordTx`.
- تأیید حذف با `confirm` (متن `"«نام» حذف شود؟"`).

### ۱.۴ بدهی‌ها (`DebtsPage`)
- ۳ کارت آمار (پرداخت‌نشده / پرداخت‌شده / تعداد کل)، تب‌ها: همه/پرداخت نشده/پرداخت شده.
- عملیات: پرداخت شد / بازگشت / ویرایش / حذف (confirm) — همه با `recordTx` (`debt_*`).
- فرم: نام (اجباری)، مبلغ (اجباری)، توضیحات.

### ۱.۵ تخصیص (`AllocationPage`)
- کارت «صندوق نقدی»: موجودی (`calcCashBalance`)، جمع دریافتی/پرداختی، دکمه «پرداخت از صندوق» (غیرفعال اگر `cashBalance<=0`) → `CashAllocationModal`.
- لیست چک‌های نقد‌شده با نوار پیشرفت تخصیص + دکمه «تخصیص/ویرایش» → `AllocationModal`.
- حالت خالی: «هنوز چک نقد شده‌ای نیست».
- `handleSaveAlloc`: جایگزینی تخصیص‌های همان چک، ساخت آرایه جدید با `genId()`، `syncPaidFromAllocations`، لاگ `alloc`.

### ۱.۶ گزارش و تقویم (`ReportsPage`)
- سلکتور ماه، ۵ کارت آمار (دریافتی/منتقل/منتظر/برگشتی/بدهی معوق).
- نمودار bar روزانه: «هزینه» مقابل «پرداخت شده» برای ۳۰ روز ماه.
- `ShamsiCalendar`: تقویم ماه با رویدادها (هزینه/هزینه پرداخت‌شده/چک منتظر/نقد‌شده/منتقل‌شده) + روز انتخابی + راهنمای رنگ.
- جدول «جزئیات هزینه‌ها» با وضعیت پرداخت ماه انتخابی.

### ۱.۷ تراکنش‌ها (`TransactionsPage`)
- ۳ کارت آمار (کل / مجموع ورودی‌ها `kind==='in'` / مجموع خروجی‌ها `kind==='out'`).
- فیلترها: از تاریخ، تا تاریخ (`JalaliDatePicker`)، نوع (select از کلیدهای `TX_TYPES`)، دکمه پاک کردن فیلتر.
- صفحه‌بندی ۱۰تایی با دکمه‌های اول/قبلی/۵ صفحه/بعدی/آخر.
- مرتب‌سازی نزولی بر `createdAt`.

### ۱.۸ مودال‌های مشترک (management/)
| مبدأ | مقصد | رفتار کلیدی |
|---|---|---|
| `SettingsModal` | `management/SettingsModal.vue` | انتخاب واحد پول (toman/thousand/million) + بخش حساب کاربری (`window.DecorAuth.isAdmin` → مدیریت کاربران / بازگشت به لانچر / خروج) |
| `TransferModal` | `management/TransferModal.vue` | گیرنده (اجباری، alert در صورت خالی)، تاریخ، توضیح → `check_transfer` |
| `AllocationModal` | `management/AllocationModal.vue` | نقشه مبلغ به ازای هر هزینه، «تخصیص خودکار»، «پاک کردن همه»، کلamped به `remaining`، جلوگیری از بیش‌تخصیص |
| `CashAllocationModal` | `management/CashAllocationModal.vue` | انتخاب هزینه‌های پرداخت‌نشده ماه، قفل بودجه (`>cashBalance` مجاز نیست)، ثبت `paidRecord.expenses` + لاگ `cash_pay` |
| `ImportModal` | `management/ImportModal.vue` | نمایش آمار فایل + دو حالت ادغام/جایگزینی |
| `ReminderPopup` | `management/ReminderPopup.vue` | یادآوری امروز (چک سررسید امروز + هزینه‌ای که روزش امروز است) + «تایید پرداخت» |
| `JalaliDatePicker` | `ui/components/JalaliDatePicker.vue` | تقویم شمسی popup، امروز/پاک کردن، بسته شدن با کلیک بیرون |
| `Toast` | PrimeVue `Toast` | پیام ۳ ثانیه‌ای |
| `Modal` | `ui/components/Modal.vue` | overlay + بسته شدن با کلیک بیرون + `wide` (720px) |
| (فرم‌های درون صفحات) | `management/CheckFormModal.vue`, `ExpenseFormModal.vue`, `ExpenseTemplatesModal.vue`, `DebtFormModal.vue` | جداسازی فرم‌ها از صفحات |

---

## ۲. لایه هسته (core) — توابع خالص

### ۲.۱ `core/jalali.js` (از خطوط ۳۰۶–۳۴۱)
- `JalaliDate.gregorianToJalali / jalaliToGregorian / toString / today / formatGregorian / toISO`
  (نکته: `jalaliToGregorian` شامل `gy += 1595` — فیکس نسخه ۶.۲ «فیکس باگ تاریخ شمسی»)
- `daysInJYear`, `daysInJMonth` (۳۱/۳۰/۲۹ یا ۳۰), `jalaliMonthRange`, `effectiveDueDay`
- `getPersianMonth`

### ۲.۲ `config/units.js` و قالب‌بندی مبالغ (خطوط ۳۴۳–۳۶۲)
- `UNITS` (toman ×1 / thousand ×1000 / million ×1000000) با برچسب فارسی
- `formatMoney` (ارقام فارسی + جداکننده سه‌رقمی)، `numberToPersianWords` (صفر/هزار/میلیون/…)، `displayMoney`، `moneyWords`، `formatMoneyTick`
- `getCategoryLabel/getCategoryColor` (rent/salary/utility/misc/debt)
- `genId()`، `todayISO()`

### ۲.۳ `core/finance.js` (خطوط ۳۶۶–۴۰۵)
- `TX_TYPES` — ۲۰ نوع تراکنش با `label` و `kind` (`in/out/info/warn`)
- `recordTx(data, tx)` → افزودن `{id, date, createdAt, ...tx}` به `transactions`
- `syncPaidFromAllocations(data)` → گروه‌بندی تخصیص‌ها بر اساس (expenseId, سال, ماهِ چک) و علامت‌گذاری پرداخت وقتی `sum >= expense.amount`
- `calcCashBalance(data)` → چک‌های نقد‌شده منهای هزینه‌های پرداخت‌شده

### ۲.۴ `core/data.js` (خطوط ۴۴۲–۴۷۴ + ۱۳۰۳–۱۳۳۱)
- `STORAGE_KEY='checkManager_v2'`، `REMINDER_KEY='checkManager_reminderDismissed'`
- `getEmbeddedData()` (خواندن `#app-data`)، `loadData()` (جدول تصمیم: محلی vs seed بر اساس `_savedAt`)، `saveData()` (افزودن `_savedAt`)
- `getDefaultData()`، `normalizeData()`، `mergeArrayById()`، `mergeData()`، `countImportItems()`
- `downloadBlob/exportJson/exportHtml/parseImportFile` → `utils/backup.js`
- قرارداد سند: `{checks[], expenses[], allocations[], debts[], transactions[], paidRecord:{checks,expenses,debts}, expenseTemplates[], settings:{unit,currency}, _savedAt}`

---

## ۳. جریان‌های داده

```
┌─ بوت ─────────────────────────────────────────────────────────────┐
│ index.html: window.DECOR_LOCK_* → lock.js (init)                  │
│            → #bootSplash («در حال همگام‌سازی…»)                   │
│ main.js   → KTD_SYNC.boot()  [GET /api/dump با timeout=8s]        │
│            → reconcile  (seed vs storage vs cloud)                │
│            → hideSplash + app.mount('#app') + KTD_SYNC.start()    │
└───────────────────────────────────────────────────────────────────┘

┌─ ذخیره محلی ──────────────────────────────────────────────────────┐
│ store.$patch(data) → watch → saveData(data)                       │
│   → localStorage.setItem('checkManager_v2', JSON+ _savedAt)       │
│   → هوک sync.js روی Storage.prototype.setItem                    │
│       → اگر امضای جدول‌ها ≠ lastSig → queuePush() (debounce 400ms)│
└───────────────────────────────────────────────────────────────────┘

┌─ push (تلاش مجدد/آفلاین) ─────────────────────────────────────────┐
│ queuePush → اگر pull نشده: queued=true و retry بعد ۵ ثانیه        │
│ push → GET /api/dump → reconcile → اگر تغییری نیست: skip          │
│       → وگرنه PUT /api/dump {tables:{... , meta:[{id:'main',      │
│         savedAt}]} } → storeSnap(امضا) + storeTombstones           │
│ خطا → warn() (یک هشدار شناور) + retry بعد ۵ ثانیه                 │
│ رویداد online / هر ۲۰ ثانیه → اگر dirty → push                    │
└───────────────────────────────────────────────────────────────────┘

┌─ ورود (lock.js) ──────────────────────────────────────────────────┐
│ GET /api/lock → ردیف‌ها (u_* + legacy 'lock')                      │
│ → اگر u_admin نیست: PUT /api/lock با رکورد admin/1111 (pbkdf2)     │
│ → صفحه ورود → hashPassword(pw,salt,iter,alg) → hashEquals         │
│ → sessionStorage['decor_session_fin']=username → overlay مخفی      │
│ → window.DecorLock / window.DecorAuth منتشر می‌شوند                │
│ ادمین: کنسول مدیریت (ساخت/تغییر رمز/حذف کاربر)                    │
└───────────────────────────────────────────────────────────────────┘
```

---

## ۴. قرارداد API — بدون هیچ تغییری حفظ می‌شود

| # | متد | URL | هدرها | بدنه/پاسخ |
|---|---|---|---|---|
| ۱ | GET | `https://ktd-api.itsfordecosahand.workers.dev/api/dump` | `Content-Type: application/json`, `X-API-Key: OD6Zgiu5tmO5IN2bxHqSzLDgH4564vtbdAUkdcnAwCBtxAmw`, `cache:no-store` | پاسخ: `{tables: {checks:[...], expenses:[...], allocations:[...], debts:[...], transactions:[...], expenseTemplates:[...], settings:[{id:'main',...}], paidRecord:[{id:'main',...}], meta:[{id:'main',savedAt}]}}`؛ هر ردیف باید `id` داشته باشد |
| ۲ | PUT | همان URL | همان هدرها | بدنه `{tables: out}` که `out.meta=[{id:'main',savedAt:Date.now()}]`؛ پاسخ باید JSON باشد (`readJson`) |
| ۳ | GET | `…/api/lock` | `X-API-Key`, `Content-Type` | آرایه ردیف‌ها: `[{id:'u_<name>', v:3, alg:'pbkdf2'|'sha256-iter', iter, salt(hex), hash(hex), updated_at}]` + ردیف legacy `id:'lock'` |
| ۴ | PUT | `…/api/lock` | همان | بدنه: یک رکورد کاربر (upsert) → `Promise<boolean>`؛ پاسخ متن حاوی `exceeded` → پیام سهمیه |
| ۵ | DELETE | `…/api/lock/<id>` | `X-API-Key` | → `Promise<boolean>` |

زمان‌بندی‌ها (دقیقاً مقدار مبدأ): `PUSH_DELAY=400ms`, `RETRY_DELAY=5000ms`, `BOOT_TIMEOUT=8000ms`, `PULL_TIMEOUT=10000ms`.

قوانین reconcile (کلمه‌به‌کلمه از sync.js):
1. هرگز قبل از یک pull موفق push نکن.
2. pull → reconcile → یک PUT اتمیک کل سند.
3. ردیفی که سرور دیگر برنگرداند حذف شده → باید پاک شود (مگر localWins).
4. ردیفی که ما هرگز نفرستادیم و سرور دارد → جدید است → برمی‌داریم.
5. seed تعبیه‌شده هرگز آپلود نمی‌شود وقتی ابری چیزی دارد.
6. `localWins = cloudSavedAt>0 && localSavedAt>cloudSavedAt` (LWW).
7. مقایسه‌ی `stable()` برای صرفه‌جویی در سهمیه D1 (فقط ردیف `settings.id==='main'`).
8. tombstone (حذف نرم LWW) در `ktd_tombstones_v1` با عمر ۹۰ روز.

کلیدهای ذخیره‌سازی (فهرست کامل):

| کلید | محل | محتوا |
|---|---|---|
| `checkManager_v2` | localStorage | سند اصلی اپ + `_savedAt` |
| `checkManager_reminderDismissed` | localStorage | `YYYY-MM-DD` روز بسته شدن یادآور |
| `ktd_last_sync_ids` | localStorage | `{table:[id,…]}` امضای آخرین sync موفق |
| `ktd_tombstones_v1` | localStorage | `{table:{id:ts}}` حذف‌های نرم |
| `decor_session_fin` | sessionStorage | نام کاربری واردشده در این تب |
| `decor_lock_v1..v4`, `decor_lock_admin_device` | localStorage | **فقط پاک‌سازی** (migrate از نسخه قدیم) |
| `decor_lock_session_v1` | sessionStorage | **فقط پاک‌سازی** |

---

## ۵. نگاشت React → Vue

| React (مبدأ) | Vue (مقصد) |
|---|---|
| `useState` در صفحات | `ref/computed` داخل `<script setup>` |
| `data` + `setData(fn)` در کل اپ | Pinia store: `state.data` + اکشن‌های `update(fn)` |
| `useEffect(saveData,[data])` | `watch(data, saveData, {deep:true})` در store |
| `window.__ktdSetData` (پل sync) | `window.__ktdSetData = d => store.replaceData(d)` |
| `useEffect` نمودارها (`Chart`) | `onMounted/onBeforeUpdate` + `watch` با `destroy()` قبل از ساخت |
| `setToast(msg)` | PrimeVue `useToast().add({summary, life:3000})` |
| `alert/confirm` | `window.alert/confirm` (عیناً — رفتار تأیید حفظ شود) |
| `renderPage()` switch | `<DashboardPage v-if="page==='dashboard'">` … در `App.vue` |
| `Icons.x` JSX | `v-html="ICONS.x"` (خروجی `utils/icons.js`) |

پیکربندی PrimeVue دقیقاً مانند مرجع: `PrimeVue({theme:{preset:Aura, darkModeSelector:'.maldi-dark'}, ripple:true})` + `ToastService`.

---

## ۶. ساختار مقصد (الگوی `cabinet-dimensions`)

```
fin-app/
├── index.html                  (lang=fa dir=rtl، #app-data، #bootSplash، SW)
├── package.json  vite.config.js
├── scripts/extract-icons.mjs   scripts/gen-sw.mjs
├── public/  (آیکون‌ها، fonts/Vazirmatn-Variable.woff2، vendor/chart.umd.js،
│             manifest.webmanifest، sw.js[مولد])
├── DESIGN.md  BUGS.md  NOTES.md
└── src/
    ├── main.js  App.vue  styles-app.css
    └── modules/maldi/
        ├── index.js
        ├── config/    constants.js · defaults.js · units.js · labels.js · navigation.js
        ├── core/      jalali.js · data.js · finance.js · api.js · sync.js · lock.js
        │              ── jalali.test.js · units.test.js · data.test.js ·
        │                 finance.test.js · api.test.js · sync.test.js · lock.test.js
        ├── store/     maldi-store.js · selectors.js
        ├── ui/        DashboardPage.vue · ChecksPage.vue · ExpensesPage.vue ·
        │              DebtsPage.vue · AllocationPage.vue · ReportsPage.vue ·
        │              TransactionsPage.vue
        │              components/ AppIcon.vue · Modal.vue · JalaliDatePicker.vue
        │                          MonthSelector.vue · ShamsiCalendar.vue · EmptyState.vue
        ├── management/ SettingsModal · TransferModal · AllocationModal ·
        │               CashAllocationModal · CheckFormModal · ExpenseFormModal ·
        │               ExpenseTemplatesModal · DebtFormModal · ImportModal · ReminderPopup
        ├── styles/    maldi.css   (CSS مبدأ عیناً + اصلاحات لمسی/۱۶px + overrides PrimeVue)
        └── utils/     icons.js · backup.js · charts.js
```

لایه دسترسی به داده **متمرکز** است: `core/api.js` (تنها جای fetch) + `core/sync.js` (تنها جای صف/تلاش مجدد) + `store/maldi-store.js` (تنها جای نوشتن localStorage سند).

---

## ۷. معیارهای پذیرش (تأیید اجباری)

1. `node --test src/modules/maldi/core/*.test.js` → همه pass (خروجی واقعی).
2. `npm run build` موفق؛ خروجی بدون Babel/React CDN.
3. پیش‌نمایش پورت **4175** + Playwright:
   - باز شدن اپ، ۲–۳ جریان کلیدی (ثبت/ویرایش/حذف رکورد + صفحه اصلی) با `route`-mock شدن `/api/dump` و `/api/lock`.
   - صفر خطای console/pageerror.
   - چک سرریز افقی در ۳۶۰/۳۹۰/۴۱۴ → صفر مشکل؛ ورودی‌ها ۱۶px؛ دکمه‌ها ≥۳۴px.
   - `setOffline(true)` + reload → اپ باز می‌شود (SW precache).
4. اسکرین‌شات دسکتاپ و موبایل در `/tmp`.
