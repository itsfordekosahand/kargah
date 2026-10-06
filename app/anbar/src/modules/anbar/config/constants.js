/**
 * ثابتهای پیکربندی — معادل بلوک‌های بالای index.html قدیمی.
 * هیچ تغییری در مقادیر نسبت به نسخه قدیمی داده نشده تا رفتار API/دیتابیس یکسان بماند.
 */

/** آدرس Cloudflare Worker — index.html لاین 451 */
export const API_BASE = '/anbar'
/** کلید مشترک همه درخواست‌ها — index.html لاین 453 (Worker بدون آن درخواست را رد می‌کند) */
export const API_KEY = 'wYb9XPNSAGPE7ZLEe98hypIfzo8cvZZfHWte6Ug6myGutboJ'

/** کلید localStorage برای داده‌های اصلی — index.html لاین 602 */
export const KEY = 'kargah_anbar_v8'
/** کلید localStorage برای تم — لاین 603 */
export const THEME_KEY = 'kargah_theme'
/** شناسه‌های همگام‌شده در آخرین pull موفق — لاین 717 */
export const SYNC_KEY = 'kargah_last_sync_ids'
/** شمارنده شماره فاکتور — لاین 649 */
export const INV_COUNTER_KEY = 'kargah_inv_counter'

/** جدول‌هایی که Worker نگه می‌دارد — لاین 716 */
export const CLOUD_TABLES = ['tools', 'sheets', 'hardware', 'templates', 'jobs']

/** ساختار خالی tombstone‌ها برای هر جدول */
export const emptyTombs = () => ({ tools: {}, sheets: {}, hardware: {}, templates: {}, jobs: {} })
