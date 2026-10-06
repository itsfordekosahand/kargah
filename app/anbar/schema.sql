-- =====================================================================
-- اسکیمای دیتابیس ماژول انبار (Cloudflare D1 / SQLite)
-- ---------------------------------------------------------------------
-- چرا این شکل؟ هر جدول فقط دو ستون دارد:
--     id    کلید اصلیِ متنی (شناسهٔ رکورد در فرانت)
--     data  کل رکورد به‌صورت JSON
--
-- فایده: فرانت رکوردها را با فیلدهای دلخواه می‌فرستد (ابزار، ورق، یراق،
-- قالب، کار…). با ستون JSON نیازی به ALTER TABLE برای افزودن فیلد تازه
-- نیست و ساختار جدول هیچ‌وقت با تغییرات UI نمی‌شکند.
--
-- ستون‌های دادهٔ کاربر (lock) هم در همان شکل ذخیره می‌شوند:
--     {"v":3,"alg":"pbkdf2","iter":120000,"salt":"…","hash":"…","updated_at":"…"}
-- رمز اصلی هرگز ذخیره نمی‌شود — فقط هش PBKDF2.
--
-- اجرای دستی (یک‌بار، بعد از ساخت D1):
--     npx wrangler d1 execute kargah-anbar --remote --file=./schema.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS tools     (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS sheets    (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS hardware  (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS jobs      (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}');

-- جدول کاربران/رمزها (lock.js روی همین کار می‌کند)
CREATE TABLE IF NOT EXISTS lock      (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}');