/**
 * منطق ادغام داده (سینک ابری + بازیابی پشتیبان) — عیناً از لاین‌های
 * 733-794 و 2667-2676 اسکریپت قدیمی، فقط با پارامتری کردن ورودی‌ها.
 */
import { uid } from '../utils/format.js'

/**
 * ادغام ردیفهای سرور با نسخه محلی.
 * localWins=false -> کپی سرور برنده است؛ localWins=true -> کپی این دستگاه برنده است.
 * ردیفی که سرور دیگر برنمی‌گرداند حذف شده تلقی می‌شود.
 */
export function mergeRows(prevIds, cloudRows, localRows, localWins) {
  const inCloud = new Set(cloudRows.map(r => r && r.id))
  const synced = new Set(prevIds || [])
  const localList = (localRows || []).filter(r => r && r.id)
  const localIds = new Set(localList.map(r => r.id))

  const keepLocal = localList.filter(r =>
    inCloud.has(r.id) ? !!localWins : !synced.has(r.id))

  const takeCloud = (cloudRows || []).filter(r =>
    r && r.id && (localIds.has(r.id) ? !localWins : !synced.has(r.id)))

  return keepLocal.concat(takeCloud)
}

/** ادغام tombstone‌دار برای انتشار حذف بین دستگاهها — لاین 755-787 */
export function mergeWithTombstones(prevTombs, cloudRows, cloudTombs, localRows, localTombs, localWins, prevIds) {
  const result = [], resultTombs = {}
  const synced = new Set(prevIds || [])
  const allIds = new Set([...(localRows || []).map(r => r && r.id).filter(Boolean), ...(cloudRows || []).map(r => r && r.id).filter(Boolean)])
  Object.keys(localTombs || {}).forEach(id => allIds.add(id))
  Object.keys(cloudTombs || {}).forEach(id => allIds.add(id))

  allIds.forEach(id => {
    const lr = (localRows || []).find(r => r && r.id === id)
    const cr = (cloudRows || []).find(r => r && r.id === id)
    const ldel = !!(localTombs && localTombs[id])
    const cdel = !!(cloudTombs && cloudTombs[id])

    if (ldel && cdel) return
    if (cdel && !ldel) {
      if (!localWins || !lr) { resultTombs[id] = cloudTombs[id]; return }
      if ((lr.updatedAt || 0) >= (cr ? cr.updatedAt : 0)) { resultTombs[id] = cloudTombs[id]; return }
      result.push({ ...cr }); return
    }
    if (ldel && !cdel) {
      if (localWins) { resultTombs[id] = localTombs[id]; return }
      // تا زمانی که کپی سرور قدیمی‌تر از لحظه حذف ماست، حذف‌شده می‌ماند.
      if (!cr || (cr.updatedAt || 0) <= (localTombs[id] || 0)) { resultTombs[id] = localTombs[id]; return }
      result.push({ ...cr }); return
    }
    if (!lr && !cr) return
    if (!lr) { if (!synced.has(id)) result.push({ ...cr }); return }
    if (!cr) { if (!synced.has(id)) result.push({ ...lr }); return }
    result.push((localWins || (lr.updatedAt || 0) >= (cr.updatedAt || 0)) ? { ...lr } : { ...cr })
  })

  return [result, resultTombs]
}

/** حذف tombstone‌های قدیمی‌تر از ۹۰ روز — لاین 789-794 */
export function cleanOldTombstones(tombs, maxAgeMs = 90 * 24 * 60 * 60 * 1000) {
  const now = Date.now()
  const r = {}
  Object.keys(tombs || {}).forEach(id => { if (now - tombs[id] < maxAgeMs) r[id] = tombs[id] })
  return r
}

/** ادغام پشتیبان JSON بر اساس شناسه — لاین 2667-2676 */
export function mergeById(current, incoming) {
  const map = new Map()
  ;(current || []).forEach(x => { if (x && x.id) map.set(x.id, x) })
  ;(incoming || []).forEach(x => {
    if (!x || typeof x !== 'object') return
    if (!x.id) x.id = uid()
    map.set(x.id, x)
  })
  return Array.from(map.values())
}

/** شمارش ردیفها بر اساس جدول (برای snapshot همگام‌سازی) — لاین 726, 857 */
export const idsOf = rows => rows.map(r => r && r.id).filter(Boolean)

export function idsBy(tableRows, tables) {
  const o = {}
  tables.forEach(t => { o[t] = idsOf(tableRows[t] || []) })
  return o
}
