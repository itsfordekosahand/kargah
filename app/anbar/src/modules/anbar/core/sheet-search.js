/**
 * جستجوی نزدیک‌ترین ابعاد ورق — منطق امتیازدهی لاین‌های 1801-1840
 * اسکریپت قدیمی، خالص و بدون DOM.
 */
import { num } from '../utils/format.js'

export function searchSheets(sheets, q) {
  const L = num(q.L), W = num(q.W)
  const tol = (num(q.tol) || 25) / 100

  let rows = (sheets || []).filter(s => num(s.qty) > 0).map(s => {
    const sl = num(s.length), sw = num(s.width)
    const dl = Math.abs(sl - L), dw = Math.abs(sw - W)
    const exact = dl < 0.01 && dw < 0.01
    const fits = sl >= L - 0.01 && sw >= W - 0.01
    const errL = dl / Math.max(L, 1), errW = dw / Math.max(W, 1)
    let score = errL * 0.55 + errW * 0.45
    if (fits) score *= 0.5
    else score += (Math.max(0, L - sl) / Math.max(L, 1) + Math.max(0, W - sw) / Math.max(W, 1)) * 1.6
    return { ...s, dl, dw, exact, fits, score }
  })

  if (q.mode === 'exact') rows = rows.filter(r => r.exact)
  else rows = rows.filter(r => r.exact || r.score <= tol)
  rows.sort((a, b) => a.score - b.score || num(b.qty) - num(a.qty))
  return rows.slice(0, 12)
}
