/**
 * قالب‌بندی ورودی مبلغ — عدد به حروف فارسی + گروه‌بندی هزارگان.
 *
 * دو تابع اصلی:
 *   numToWords(n)  — «صد و بیست و پنج هزار تومان»
 *   thousands(n)    — «۱۲۵٬۰۰۰» با جداکنندهٔ هزارگان و ارقام فارسی
 *
 * هر دو در UI زیرِ فیلدهای مبلغ نمایش داده می‌شوند (`amount-field` در
 * ui/components/AmountField.vue) و در فاکتور چاپی هم استفاده می‌شوند.
 *
 * نکتهٔ طراحی: تبدیل عدد به حروف برای اعداد صحیح انجام می‌شود؛ بخش
 * اعشار جداگانه خوانده می‌شود («صد و پنجاه هزار و سه هزار تومان و پانصد
 * ریال») تا گرد کردن نکند.
 */

/** ارقام فارسی */
const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
export const toFa = v => String(v ?? '').replace(/\d/g, d => FA_DIGITS[+d])

/**
 * ارقام فارسی (۰-۹) و عربی (٠-٩) → لاتین.
 * کاربر ممکن است در هر فیلدی (با کیبورد فارسی یا paste) عدد را با این ارقام
 * وارد کند؛ همهٔ توابع پایین پیش از محاسبه این تبدیل را انجام می‌دهند تا
 * ورودی فارسی دقیقاً مثل ورودی لاتین پردازش شود.
 */
export const toLatin = v => String(v ?? '')
  .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
  .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))

/** اعداد → فارسی (حروف) */
const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده']
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
const SCALES = ['', ' هزار', ' میلیون', ' میلیارد', ' بیلیون']

/** سه رقمی (۰..۹۹۹) → حروف. دقیقاً «صد و بیست و پنج» */
export function threeToWords(n) {
  n = Math.floor(Math.abs(n))
  if (n === 0) return ''
  const parts = []
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h) parts.push(HUNDREDS[h])
  if (r >= 10 && r < 20) parts.push(TEENS[r - 10])
  else {
    const t = Math.floor(r / 10)
    const o = r % 10
    if (t) parts.push(TENS[t])
    if (o) parts.push(ONES[o])
  }
  return parts.join(' و ')
}

/**
 * عدد صحیح → حروف فارسی با تفکیک مقیاس (هزار/میلیون/…).
 * ۰ → «صفر»
 */
export function intToWords(n) {
  n = Math.floor(Math.abs(Number(n) || 0))
  if (n === 0) return 'صفر'
  const groups = []
  while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000) }
  const parts = []
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]
    if (!g) continue
    const w = threeToWords(g)
    parts.push((w ? w + SCALES[i] : SCALES[i].trim()))
  }
  return parts.join(' و ')
}

/**
 * مبلغ → حروف با واحد پیش‌فرض «تومان».
 * ۱۲۵۰۰۰ → «صد و بیست و پنج هزار تومان»
 * ۱۲۵۰۰۰.5 → «صد و بیست و پنج هزار تومان و پانصد ریال» (اعشار ×۱۰۰ ریال)
 * ورودی نامعتبر/خالی → رشتهٔ خالی (تا زیر فیلد چیزی نشان داده نشود).
 */
export function numToWords(value, unit = 'تومان') {
  const raw = toLatin(String(value ?? '')).trim()
  if (raw === '') return ''
  // فقط مقدارِ واقعاً عددی قبول می‌شود؛ ورودی غیرعددی («abc») باید خالی
  // برگردد نه اینکه Number('') === 0 آن را «صفر تومان» کند.
  if (!/^[+-]?\d+(\.\d+)?$/.test(String(raw).replace(/[٬,\s]/g, ''))) return ''
  const n = Number(String(raw).replace(/[^\d.-]/g, ''))
  if (!isFinite(n)) return ''
  const neg = n < 0
  const abs = Math.abs(n)
  const whole = Math.floor(abs)
  const frac = Math.round((abs - whole) * 100)

  let out = intToWords(whole) + ' ' + unit
  if (frac > 0) out += ' و ' + intToWords(frac) + ' ریال'
  if (neg) out = 'منفی ' + out
  return out
}

/**
 * گروه‌بندی هزارگان با جداکنندهٔ فارسی و ارقام فارسی.
 * ۱۲۵۰۰۰ → «۱۲۵٬۰۰۰» (جداکننده U+066C — همان چیزی که Intl fa-IR می‌دهد)
 * اعشار تا ۲ رقم نگه داشته می‌شود و فقط وقتی اعشار واقعی باشد نمایش می‌یابد.
 */
export function thousands(value, opts = {}) {
  const raw = toLatin(String(value ?? '')).trim()
  if (raw === '' || raw === '-' || raw === '.') return raw === '' ? '' : raw
  const n = Number(String(raw).replace(/[^\d.-]/g, ''))
  if (!isFinite(n)) return ''
  const maxFrac = opts.maximumFractionDigits != null ? opts.maximumFractionDigits : 2
  // Intl خودش جداکنندهٔ فارسی (٬) و ارقام فارسی را می‌گذارد
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: maxFrac }).format(n)
}

/**
 * جداکننده را در حین تایپ اضافه می‌کند و ارقام را فارسی می‌کند.
 * ورودی کاربر («125000») → نمایش («۱۲۵٬۰۰۰»).
 *
 * مکان‌نما: چون تبدیل طول رشته را عوض می‌کند، `liveCaret` تعداد رقم‌های
 * *قبل* از مکان‌نما را برمی‌گرداند تا در فایل‌فیلد به‌روز نشود (پرش مکان‌نما).
 * چون هر رقم لاتین دقیقاً یک کاراکتر فارسی است، نسبت ۱ به ۱ است.
 */
export function liveThousands(value) {
  // ارقام فارسی/عربی کاربر به لاتین تبدیل می‌شوند تا گروه‌بندی روی همان
  // منطق لاتین انجام شود و دوباره به فارسی نمایش داده شود (۱:۱، بدون افت).
  const raw = toLatin(String(value ?? ''))
  const neg = raw.trim().startsWith('-')
  const body = raw.replace(/[^\d.]/g, '')
  const [i, ...rest] = body.split('.')
  const f = rest.join('.')
  if (i === '' && f === '') return ''
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, '٬')
  return (neg ? '-' : '') + toFa(grouped) + (f ? '٫' + toFa(f) : '')
}

/** آیا کاراکتر، رقم است؟ (لاتین + فارسی + عربی — نمایش، ارقام فارسی است) */
const isDigitCh = ch => /[0-9۰-۹٠-٩]/.test(ch)

/**
 * مکان‌نما را بعد از قالب‌بندی زنده نگه می‌دارد: تعداد ارقام (نه کاراکترها)
 * قبل از مکان‌نما در رشتهٔ خام را می‌شمارد و رشتهٔ نمایشی را تا همان رقم جلو
 * می‌برد. چون جداکننده‌ها کاراکتر می‌افزایند، شمردن کاراکتر مکان‌نما را
 * عقب می‌کشید؛ اینجا فقط رقم‌ها شمرده می‌شوند و مکان‌نما همیشه دقیقاً بعد
 * از رقمِ nام (نه وسط جداکننده) می‌افتد.
 */
export function liveCaret(rawValue, caret, formatted) {
  const before = toLatin(String(rawValue ?? '')).slice(0, caret)
  const digits = (before.match(/\d/g) || []).length
  const f = String(formatted ?? '')
  if (!digits) return 0
  let seen = 0
  for (let i = 0; i < f.length; i++) {
    if (!isDigitCh(f[i])) continue
    if (++seen === digits) return i + 1
  }
  // ارقام ورودی از ارقام نمایشی بیشتر بود (حالت ناسازگار) → انتهای رشته
  return f.length
}

/** فقط رقم‌های معتبر نگه می‌دارد (برای اتصال به ورودی عددی) */
export const sanitizeNumber = v => toLatin(String(v ?? '')).replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
