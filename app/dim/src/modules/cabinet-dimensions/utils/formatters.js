/**
 * فرمت اعداد و واحدها.
 * ذخیره‌سازی همیشه لاتین است؛ نمایش فارسی فقط در لایه UI.
 */
const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export function toPersianDigits(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)])
    .replace(/\./g, '٫')
    .replace(/-/g, '−')
}

/** تبدیل ارقام فارسی/عربی به لاتین (برای ورودی‌ها) */
export function toLatinDigits(value) {
  if (value === null || value === undefined) return ''
  const map = { '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
                '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
                '٫':'.', ',':'.' }
  return String(value).replace(/[۰-۹٠-٩٫,]/g, (c) => map[c])
}

/** عدد را با حداکثر ۲ رقم اعشار و بدون صفر اضافه نمایش می‌دهد (لاتین) */
export function formatLatin(n, maxDecimals = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  if (!Number.isFinite(n)) return '—'
  const r = Math.round(n * 100) / 100
  return String(Number(r.toFixed(maxDecimals)))
}

/** نمایش فارسی عدد */
export function formatNumber(n, maxDecimals = 2) {
  return toPersianDigits(formatLatin(n, maxDecimals))
}

/** نمایش فارسی عدد با جداکننده هزارگان */
export function formatNumberGrouped(n, maxDecimals = 2) {
  if (n === null || n === undefined || Number.isNaN(n) || !Number.isFinite(n)) return '—'
  const s = n.toFixed(maxDecimals)
  const [int, dec] = s.split('.')
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const out = dec && Number(dec) !== 0 ? `${withSep}.${dec}` : withSep
  return toPersianDigits(out)
}

export const formatCm = (n) => formatNumber(n) + ' ' + 'سانت'
export const formatM2 = (n) => formatNumberGrouped(n, 3) + ' مترمربع'
export const formatM = (n) => formatNumberGrouped(n, 2) + ' متر'
export const formatCount = (n) => toPersianDigits(formatLatin(n, 0)) + ' عدد'

export function formatDate(ts) {
  if (!ts) return '—'
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ts))
  } catch {
    return '—'
  }
}
