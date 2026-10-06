/**
 * واحد پول، قالب‌بندی مبالغ و برچسب‌ها — عیناً از index.html مبدأ (خطوط ۳۴۳–۳۶۴).
 */

export const UNITS = {
  toman: { label: 'تومان', multiplier: 1 },
  thousand: { label: 'هزار تومان', multiplier: 1000 },
  million: { label: 'میلیون تومان', multiplier: 1000000 }
}

export const getUnitLabel = (u) => (UNITS[u] || UNITS.toman).label

export const formatMoney = (n) => {
  if (n == null || isNaN(n)) return '۰'
  const num = Math.floor(Math.abs(n))
  const s = num.toString()
  const parts = []
  for (let i = s.length; i > 0; i -= 3) { parts.unshift(s.slice(Math.max(0, i - 3), i)) }
  const withSep = (n < 0 ? '-' : '') + parts.join(',')
  return withSep.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d])
}

export const numberToPersianWords = (num) => {
  if (num == null || isNaN(num)) return ''
  num = Math.floor(Math.abs(num))
  if (num === 0) return 'صفر'
  const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
  const dah = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده']
  const dahgan = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
  const sadgan = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون']
  const threeDigits = (n) => {
    const parts = []
    const s = Math.floor(n / 100)
    const r = n % 100
    if (s > 0) parts.push(sadgan[s])
    if (r >= 10 && r < 20) parts.push(dah[r - 10])
    else {
      const d = Math.floor(r / 10)
      const y = r % 10
      if (d > 0) parts.push(dahgan[d])
      if (y > 0) parts.push(yekan[y])
    }
    return parts.join(' و ')
  }
  const result = []
  let i = 0
  while (num > 0) {
    const chunk = num % 1000
    if (chunk > 0) { const word = threeDigits(chunk) + (scales[i] ? ' ' + scales[i] : ''); result.unshift(word) }
    num = Math.floor(num / 1000)
    i++
  }
  return result.join(' و ')
}

export const displayMoney = (n, unit) => formatMoney(n) + ' ' + getUnitLabel(unit || 'toman')
export const moneyWords = (n, unit) => numberToPersianWords(n) + ' ' + getUnitLabel(unit || 'toman')

/* باگ نمایشی مبدأ: نتیجهٔ toFixed با رقم لاتین برمی‌گشت در حالی که بقیهٔ رابط
   فارسی است — فقط ارقام به فارسی تبدیل می‌شوند (هیچ داده/قراردادی عوض نمی‌شود). */
const persianDigits = (s) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])

export const formatMoneyTick = (value, unit) => {
  if (!isFinite(value) || Math.abs(value) < 1) return '۰'
  const abs = Math.abs(value)
  if (unit && unit !== 'toman') {
    if (abs >= 1e9) return persianDigits((value / 1e9).toFixed(1).replace(/\.0$/, '')) + ' م'
    if (abs >= 1e6) return persianDigits((value / 1e6).toFixed(1).replace(/\.0$/, '')) + ' هـ'
    return formatMoney(value)
  }
  if (abs >= 1e9) return persianDigits((value / 1e9).toFixed(1).replace(/\.0$/, '')) + ' میلیارد'
  if (abs >= 1e6) return persianDigits((value / 1e6).toFixed(1).replace(/\.0$/, '')) + ' م'
  if (abs >= 1e3) return persianDigits((value / 1e3).toFixed(0)) + ' هـ'
  return formatMoney(value)
}

export const getCategoryLabel = (c) => ({ rent: 'اجاره', salary: 'حقوق', utility: 'قبوض', misc: 'متفرقه', debt: 'بدهی' }[c] || 'متفرقه')
export const getCategoryColor = (c) => ({ rent: '#FF9900', salary: '#60A5FA', utility: '#A855F7', misc: '#A0A0A0', debt: '#EF4444' }[c] || '#A0A0A0')

export const genId = () => '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export function todayISO() {
  const n = new Date()
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0')
}
