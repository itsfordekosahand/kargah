/**
 * لایه انتقال داده (Data Access Layer) — تنها نقطه‌ای که در ماژول «مالی»
 * fetch می‌شود. همه endpoint ها، هدرها و شکل request/response دقیقاً مطابق
 * sync.js و lock.js مبدأ هستند؛ هیچ تغییری در قرارداد داده داده نشده است.
 *
 *   GET    /api/dump  → { tables: {...} }       (sync.js: pull)
 *   PUT    /api/dump  → { tables: out }         (sync.js: push)
 *   GET    /api/lock  → [ {id:'u_*'|'lock',…} ] (lock.js: fetchUsers)
 *   PUT    /api/lock  → boolean                 (lock.js: saveUser)
 *   DELETE /api/lock/:id → boolean              (lock.js: deleteRow)
 */

import { SYNC_TABLES } from '../config/tables.js'

export const API_BASE = '/ktd'
export const API_KEY = 'OD6Zgiu5tmO5IN2bxHqSzLDgH4564vtbdAUkdcnAwCBtxAmw'
export const DUMP_PATH = '/api/dump'
export const LOCK_PATH = '/api/lock'

export const PULL_TIMEOUT = 10000

/* قرارداد lock.js مبدأ: پایه و کلید lock از window خوانده می‌شوند
   (index.html آن‌ها را ست می‌کند)؛ اگر ست نشده باشد عملیات lock غیرفعال است. */
export function lockBase() {
  return (typeof window !== 'undefined' && window.DECOR_LOCK_API_BASE) || ''
}
export function lockKey() {
  return (typeof window !== 'undefined' && window.DECOR_LOCK_API_KEY) || ''
}

export const LOCK_QUOTA_MSG = 'سرور موقتاً محدود است (سهمیه روزانه نوشتن). کمی بعد دوباره تلاش کنید.'
export const LOCK_NET_MSG = 'در اتصال به سرور مشکلی پیش آمد.'

export function headers() {
  return { 'Content-Type': 'application/json', 'X-API-Key': API_KEY }
}

export function readJson(res) {
  const ct = (res.headers.get('content-type') || '')
  if (!res.ok) throw new Error('HTTP ' + res.status)
  if (ct.indexOf('json') === -1) throw new Error('پاسخ غیرمنتظره از سرور')
  return res.json()
}

export function withTimeout(ms) {
  if (typeof AbortController === 'undefined') return { ctrl: null, clear: function () {} }
  const ctrl = new AbortController()
  const t = setTimeout(function () { try { ctrl.abort() } catch (e) {} }, ms)
  return { ctrl: ctrl, clear: function () { clearTimeout(t) } }
}

export function cloudOn() { return !!API_BASE && !!API_KEY }

/** ساخت خروجی خالیِ همه جدول‌ها (شامل meta) — همان emptyTables در sync.js */
export function emptySyncTables() {
  const t = {}
  SYNC_TABLES.forEach(function (n) { t[n] = [] })
  return t
}

/** فیلتر payload خام: هر جدول فقط ردیف‌های دارای id را نگه می‌دارد (sync.js حلقه SYNC_TABLES) */
export function normalizeDumpTables(rawTables) {
  const t = emptySyncTables()
  SYNC_TABLES.forEach(function (n) {
    const rows = Array.isArray(rawTables && rawTables[n]) ? rawTables[n] : []
    t[n] = rows.filter(function (r) { return r && r.id })
  })
  return t
}

/* ---------------- GET /api/dump ---------------- */
/* هرگز reject نمی‌کند: {ok:true,tables} یا {ok:false,err} (رفتار عیناً sync.js) */
export function pullDump(timeout) {
  const to = withTimeout(timeout || PULL_TIMEOUT)
  return fetch(API_BASE + DUMP_PATH, {
    method: 'GET', headers: headers(), cache: 'no-store', signal: to.ctrl ? to.ctrl.signal : undefined
  })
    .then(readJson)
    .then(function (d) {
      to.clear()
      if (!d || typeof d !== 'object' || !d.tables) throw new Error('bad payload')
      return { ok: true, tables: normalizeDumpTables(d.tables) }
    })
    .catch(function (e) {
      to.clear()
      return { ok: false, err: (e && e.message) || 'request failed' }
    })
}

/* ---------------- PUT /api/dump ---------------- */
export function putDump(tables) {
  return fetch(API_BASE + DUMP_PATH, {
    method: 'PUT', headers: headers(), body: JSON.stringify({ tables: tables }), cache: 'no-store'
  }).then(readJson)
}

/* ---------------- /api/lock (چندکاربره) ---------------- */

/* GET /api/lock -> every user row (u_*) plus legacy 'lock'. */
export function lockFetchRows() {
  const base = lockBase()
  const key = lockKey()
  if (!base) return Promise.reject(new Error('no-config'))
  const req = new Request(base + LOCK_PATH, { headers: { 'X-API-Key': key, 'Content-Type': 'application/json' } })
  return fetch(req, { cache: 'no-store' }).then(function (r) {
    if (!r.ok) return Promise.reject(new Error('http ' + r.status))
    return r.json().then(function (rows) {
      if (!Array.isArray(rows)) return []
      return rows.filter(function (r) { return r && r.id })
    })
  })
}

/* PUT one user record (upsert). Returns Promise<{ok, msg}> — پیام، همان
   SERVER_MSG در lock.js مبدأ است. */
export function lockPut(rec) {
  const base = lockBase()
  const key = lockKey()
  if (!base || !rec) return Promise.resolve({ ok: false, msg: '' })
  return fetch(base + LOCK_PATH, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
    body: JSON.stringify(rec)
  }).then(function (r) {
    if (r.ok) return { ok: true, msg: '' }
    return r.text().then(function (t) {
      return {
        ok: false,
        msg: (t && t.indexOf('exceeded') !== -1)
          ? LOCK_QUOTA_MSG
          : 'ارسال به سرور ناموفق بود (HTTP ' + r.status + ')'
      }
    })
  }).catch(function () {
    return { ok: false, msg: LOCK_NET_MSG }
  })
}

/* DELETE one row by id. Returns Promise<{ok, msg}>. */
export function lockDelete(id) {
  const base = lockBase()
  const key = lockKey()
  if (!base) return Promise.resolve({ ok: false, msg: '' })
  return fetch(base + LOCK_PATH + '/' + encodeURIComponent(id), {
    method: 'DELETE',
    headers: { 'X-API-Key': key }
  }).then(function (r) {
    if (r.ok) return { ok: true, msg: '' }
    return r.text().then(function (t) {
      return { ok: false, msg: (t && t.indexOf('exceeded') !== -1) ? LOCK_QUOTA_MSG : '' }
    })
  }).catch(function () {
    return { ok: false, msg: LOCK_NET_MSG }
  })
}
