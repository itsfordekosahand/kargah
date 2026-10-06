# کارگاه — دکور سهند

محصول یکپارچهٔ کارگاه: لانچر + سه ماژول (**مالی**، **انبار**، **ابعاد/آنالیز**)،
همه در یک مکان، با یک دکمهٔ دپلوی.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/itsfordekosahand/kargah)

---

## یک کلیک یعنی چه؟

دکمهٔ بالا را که بزنی، Cloudflare:

1. از تو **اتورایز** می‌گیرد (یک‌بار — همان «دسترسی لازم»)
2. ریپو را در حساب تو کلون می‌کند
3. **هر دو دیتابیس D1** را می‌سازد و به Worker وصل می‌کند
   (`kargah-anbar` برای انبار، `kargah-ktd` برای مالی)
4. **فرانت را بیلد** می‌کند (Vite: لانچر + سه ماژول)
5. **اسکیما را اعمال** می‌کند (`schema/*.sql` — امن در هر بار اجرا)
6. Worker را منتشر می‌کند

پایان کار: یک آدرسِ آماده که هم فرانت است هم API — فرانت هم که از همان
دامنه سرو می‌شود، یعنی «وصل بودن فرانت به بک‌اند» نیازی به تنظیم ندارد.

## بعد از اولین دپلوی (فقط یک‌بار اگر دادهٔ ابریِ قبلی داری)

داده‌هایی که روی worker های قدیمی هستند را با یک دستور منتقل کن:

```bash
npm run seed -- https://kargah-app.<حساب>.workers.dev
```

کارگران قدیمی دست نمی‌خورند؛ هر وقت مطمئن شدی می‌توانی خاموششان کنی.

## توسعهٔ محلی

```bash
npm install          # یک‌بار
npm run dev          # بیلد + دیتابیس محلی + wrangler dev
```

- `npm run build` — فقط بیلد و جمع‌کردن در `assets/`
- `npm run deploy` — بیلد + اسکیما + انتشار (بدون دکمه، نیاز به `wrangler login`)

## ساختار

```
src/index.js      Worker: /anbar/api/* و /ktd/api/* (+ سروِ assets)
schema/           اسکیمای هر دو دیتابیس (idempotent)
scripts/          build.mjs · deploy.mjs · seed.mjs
app/launcher/     لانچر (index.html، sw.js، آیکن‌ها)
app/fin/          ماژول مالی (Vue 3 + Vite)
app/anbar/        ماژول انبار (Vue 3 + Vite)
app/dim/          ماژول ابعاد/آنالیز (Vue 3 + Vite)
```

## قرارداد API

| مسیر | متد | کار |
|---|---|---|
| `/anbar/api/<table>` | GET | همهٔ ردیف‌های جدول (آرایه) |
| `/anbar/api/<table>` | PUT | آرایه = جایگزینی کامل جدول · رکورد = upsert |
| `/anbar/api/lock/<id>` | DELETE | حذف کاربر |
| `/ktd/api/dump` | GET/PUT | سند کامل sync — `{ tables: {...} }` |
| `/ktd/api/lock` | GET/PUT/DELETE | کاربران/هش‌ها |

احراز هویت: هدر `X-API-Key` (کلید مشترک — همان مقادیری که در کد فرانت هستند).
