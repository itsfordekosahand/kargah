/**
 * اسکلت لایه API برای سینک با Cloudflare (فاز بعد).
 *
 * در این فاز: هیچ درخواست شبکه‌ای ارسال نمی‌شود.
 * توابع هرگز exception پرتاب نمی‌کنند؛ اگر شبکه در دسترس نباشد
 * همان { ok:false, offline:true } برمی‌گردانند.
 */

const ENABLE_SYNC = false // در فاز بعد فعال می‌شود
const BASE_URL = '/api/cabinet-dimensions'

function offlineResult(reason = 'آفلاین: سینک در این فاز غیرفعال است.') {
  return { ok: false, offline: true, error: reason, data: null }
}

/** دریافت تغییرات از سرور از یک زمان مشخص */
export async function fetchChanges(since = 0) {
  if (!ENABLE_SYNC) return offlineResult()
  try {
    const res = await fetch(`${BASE_URL}/changes?since=${encodeURIComponent(since)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!res.ok) return { ok: false, offline: false, error: `خطای سرور: ${res.status}`, data: null }
    const data = await res.json()
    return { ok: true, offline: false, error: null, data }
  } catch (e) {
    return { ok: false, offline: true, error: e?.message || 'عدم دسترسی به شبکه', data: null }
  }
}

/** ارسال تغییرات محلی */
export async function pushChanges(payload = {}) {
  if (!ENABLE_SYNC) return offlineResult()
  try {
    const res = await fetch(`${BASE_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, updatedAt: Date.now() })
    })
    if (!res.ok) return { ok: false, offline: false, error: `خطای سرور: ${res.status}`, data: null }
    const data = await res.json()
    return { ok: true, offline: false, error: null, data }
  } catch (e) {
    return { ok: false, offline: true, error: e?.message || 'عدم دسترسی به شبکه', data: null }
  }
}

/** بررسی وضعیت اتصال سینک */
export async function ping() {
  if (!ENABLE_SYNC) return { ok: false, offline: true, error: 'سینک غیرفعال است.' }
  try {
    const res = await fetch(`${BASE_URL}/ping`, { method: 'GET' })
    return { ok: res.ok, offline: !res.ok, error: res.ok ? null : `خطای سرور: ${res.status}` }
  } catch (e) {
    return { ok: false, offline: true, error: e?.message || 'عدم دسترسی به شبکه' }
  }
}

export { ENABLE_SYNC }
