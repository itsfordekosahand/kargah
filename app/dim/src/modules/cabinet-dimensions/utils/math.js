/** محاسبات عددی کمکی */

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
export const round = (n, digits = 3) => {
  const p = 10 ** digits
  return Math.round((n + Number.EPSILON) * p) / p
}
export const sum = (arr) => arr.reduce((a, b) => a + b, 0)
export const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/** برابری دو عدد با تلرانس (پیش‌فرض ۰٫۰۱ سانت) */
export const approxEqual = (a, b, eps = 0.01) => isNum(a) && isNum(b) && Math.abs(a - b) <= eps

export const avg = (arr) => (arr.length ? sum(arr) / arr.length : 0)

export function variance(arr) {
  if (arr.length < 2) return 0
  const m = avg(arr)
  return avg(arr.map((x) => (x - m) ** 2))
}

/** رگرسیون خطی ساده y = a.x + b — برای پیشنهاد فرمول خطی */
export function linearRegression(xs, ys) {
  const n = xs.length
  if (n < 2) return null
  const mx = avg(xs), my = avg(ys)
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  if (Math.abs(den) < 1e-12) return null
  const a = num / den
  const b = my - a * mx
  return { a, b }
}

/** خروجی لیست، مرتب‌شده بر اساس ترتیب نمایش */
export const byOrder = (list) => [...list].sort((x, y) => (x.order ?? 0) - (y.order ?? 0))
