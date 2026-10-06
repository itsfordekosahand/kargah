-- =====================================================================
-- اسکیمای دیتابیس ماژول مالی (Cloudflare D1 / SQLite) — binding: KTD_DB
-- ---------------------------------------------------------------------
-- سند sync در یک ردیف واحد نگهداری می‌شود تا PUT اتمیک باشد
-- (sync.js: «one atomic PUT of the whole document»).
-- جدول lock هم کاربران/هش‌ها را مثل نسخهٔ قبل نگه می‌دارد.
--
-- اجرای خودکار: npm run db:init (همزمان با هر deploy — idempotent)
-- =====================================================================

CREATE TABLE IF NOT EXISTS ktd_dump (
  id   TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}'
);

-- جدول کاربران/رمزها (lock.js ماژول مالی روی همین کار می‌کند)
CREATE TABLE IF NOT EXISTS lock (
  id   TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}'
);
