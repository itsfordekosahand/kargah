/**
 * توابع قالب‌بندی و کمکی — معادل لاین‌های 638-646 اسکریپت قدیمی.
 * رفتارشان دقیقاً همان نسخه قدیمی است (اعداد فارسی، escape کردن HTML).
 */

export const uid = () => Math.random().toString(36).slice(2, 9)
export const nowMs = () => Date.now()

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export const num = v => { const n = parseFloat(String(v ?? '').replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : n }

export const fmt = n => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(num(n))
export const fmtInt = n => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(num(n))
export const faNow = () => new Date().toLocaleDateString('fa-IR')
export const uniq = arr => [...new Set(arr.filter(Boolean))]
