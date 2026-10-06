/**
 * شماره‌گذاری فاکتور — معادل لاین‌های 648-701 اسکریپت قدیمی.
 * storage قابل تزریق است تا در تستها localStorage واقعی لازم نباشد.
 */
import { INV_COUNTER_KEY } from '../config/constants.js'

const ls = () => (typeof localStorage !== 'undefined' ? localStorage : null)

function safeGet(store, k) {
  try { return store ? store.getItem(k) : null } catch (_) { return null }
}
function safeSet(store, k, v) {
  try { if (store) store.setItem(k, v) } catch (_) {}
}

/**
 * شماره بعدی فاکتور (نسخه محلی). اگر تابع سمت سرور تعریف شده باشد
 * از آن استفاده می‌کند — همان ترتیب نسخه قدیمی.
 */
export async function getInvoiceNumber(templateId, cloudFn, store = ls()) {
  if (typeof cloudFn === 'function') return await cloudFn(templateId)
  let count = parseInt(safeGet(store, INV_COUNTER_KEY) || '0', 10)
  const prefix = 'inv_num_' + templateId.slice(0, 8)
  const stored = safeGet(store, prefix)
  if (!stored) {
    count++
    safeSet(store, INV_COUNTER_KEY, String(count))
    safeSet(store, prefix, String(count))
  }
  return String(count).padStart(3, '0')
}

export function getNextInvoiceNumber(store = ls()) {
  const count = parseInt(safeGet(store, INV_COUNTER_KEY) || '0', 10) + 1
  return String(count).padStart(3, '0')
}

export function assignInvoiceNumber(templateId, store = ls()) {
  const prefix = 'inv_num_' + templateId.slice(0, 8)
  if (!safeGet(store, prefix)) {
    let count = parseInt(safeGet(store, INV_COUNTER_KEY) || '0', 10)
    count++
    safeSet(store, INV_COUNTER_KEY, String(count))
    safeSet(store, prefix, String(count))
  }
}

/**
 * شماره نمایش‌داده‌شده در سربرگ فاکتور. روی خود قالب (t.invNum) نگه داشته
 * می‌شود تا با سینک ابری بین دستگاهها یکسان بماند.
 */
export function invoiceNumberFor(t, store = ls(), onSave = () => {}) {
  const pad = n => String(n).padStart(3, '0')
  if (t.invNum) return pad(t.invNum)
  const prefix = 'inv_num_' + t.id.slice(0, 8)
  let stored = safeGet(store, prefix)
  if (stored) {
    t.invNum = pad(stored)
    return t.invNum
  }
  let count = parseInt(safeGet(store, INV_COUNTER_KEY) || '0', 10) || 0
  count++
  safeSet(store, INV_COUNTER_KEY, String(count))
  safeSet(store, prefix, String(count))
  t.invNum = pad(count)
  onSave()
  return t.invNum
}
