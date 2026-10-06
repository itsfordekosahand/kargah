/**
 * محاسبات خالص روی داده‌های انبار — معادل لاین‌های 1071-1096 اسکریپت قدیمی.
 * هیچ دسترسی به DOM یا localStorage ندارند تا قابل تست باشند.
 */
import { num } from '../utils/format.js'

/** مجموع واقعی یراق (تعداد × اندازه بسته) — لاین 1071 */
export const hwTotal = h => num(h.qty) * (h.unit === 'pack' ? (num(h.packSize) || 1) : 1)

/** ابزارهای خارج‌رفته از کارهای باز — لاین 1076-1083 */
export function toolOut(jobs, id) {
  let n = 0
  ;(jobs || []).forEach(j => {
    if (j.closed) return
    ;(j.items || []).forEach(it => { if (it.toolId === id && !it.returned) n += num(it.qty) })
  })
  return n
}

/** موجودی قابل استفاده یک ابزار — لاین 1084 */
export const toolAvail = (jobs, t) => num(t.total) - toolOut(jobs, t.id)

/** جمع اقلام/تخفیف/مالیات/نهایی یک قالب فاکتور — لاین 1086-1092 */
export function templateTotals(t) {
  const sub = (t.items || []).reduce((a, it) => a + num(it.qty) * num(it.unitPrice), 0)
  const disc = sub * num(t.discountPercent) / 100
  const taxBase = sub - disc
  const tax = taxBase * num(t.taxPercent) / 100
  return { sub, disc, tax, total: taxBase + tax }
}

export const jobPendingCount = j => (j.items || []).filter(i => !i.returned).length
export const jobsOpen = jobs => (jobs || []).filter(j => !j.closed)
export const jobsClosed = jobs => (jobs || []).filter(j => j.closed)

/** آمار داشبورد — لاین 1240-1245 */
export function dashboardStats(state) {
  const sheetQty = state.sheets.reduce((a, s) => a + num(s.qty), 0)
  const tplTotal = state.templates.reduce((a, t) => a + templateTotals(t).total, 0)
  const open = jobsOpen(state.jobs)
  const totalPending = open.reduce((a, j) => a + jobPendingCount(j), 0)
  const lowSheets = state.sheets.filter(s => num(s.qty) <= 2 && num(s.qty) > 0)
  const outSheets = state.sheets.filter(s => num(s.qty) <= 0)
  return { sheetQty, tplTotal, open, totalPending, lowSheets, outSheets }
}
