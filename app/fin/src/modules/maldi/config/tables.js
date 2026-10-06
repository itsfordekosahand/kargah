/**
 * جدول‌های سند مالی — عیناً از sync.js مبدأ (خطوط ۲۷–۳۰).
 * این ثابت‌ها هم در لایه API و هم در هسته همگام‌سازی استفاده می‌شوند
 * تا قرارداد داده در یک نقطه واحد تعریف شده باشد.
 */

export const ARRAY_TABLES = ['checks', 'expenses', 'allocations', 'debts', 'transactions', 'expenseTemplates']
export const OBJECT_TABLES = ['settings', 'paidRecord']
export const APP_TABLES = ARRAY_TABLES.concat(OBJECT_TABLES)
export const SYNC_TABLES = APP_TABLES.concat(['meta'])
