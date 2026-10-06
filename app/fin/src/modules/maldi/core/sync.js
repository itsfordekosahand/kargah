/* ============================================================
   KTD (finance module) — cloud sync layer
   ------------------------------------------------------------
   Port وفادانه از sync.js مبدأ به ماژول ES.

   Loaded BEFORE the app so the very first paint already
   shows reconciled data; after the app mounts it watches every save
   and pushes changes to the Worker.

   Rules — identical to the warehouse module:
     * never push before a successful pull (a failed request is not an
       empty database)
     * pull -> reconcile -> one atomic PUT (a delete on one device must
       not be re-uploaded by another)
     * a row the last sync knew about but the server no longer returns
       was deleted elsewhere -> drop it
     * a row we never synced that the server has -> it is new -> take it
     * the embedded seed data is never uploaded while the cloud already
       holds something (a fresh phone must not pollute the account)

   Transport (fetch) تماماً در core/api.js متمرکز است.
   ============================================================ */
import { ARRAY_TABLES, OBJECT_TABLES, APP_TABLES, SYNC_TABLES } from '../config/tables.js'
import { pullDump, putDump, cloudOn } from './api.js'
import { getDefaultData, normalizeData } from './data.js'

const API_BASE = '/ktd'
const API_KEY = 'OD6Zgiu5tmO5IN2bxHqSzLDgH4564vtbdAUkdcnAwCBtxAmw'
const STORAGE_KEY = 'checkManager_v2'
const SNAP_KEY = 'ktd_last_sync_ids'
const TOMBSTONE_KEY = 'ktd_tombstones_v1'

const PUSH_DELAY = 400
const RETRY_DELAY = 5000
const BOOT_TIMEOUT = 8000
const PULL_TIMEOUT = 10000

const S = {
  origin: 'storage',
  pulled: false,
  queued: false,
  dirty: false,
  busy: false,
  editGen: 0,
  lastSig: null,
  mountSig: null,
  armed: false,
  warned: false,
  mounted: false,
  selfWrite: false
}
let pushTimer = null, retryTimer = null

/* ---------------- small helpers ---------------- */

function assign() {
  const out = {}
  for (let i = 0; i < arguments.length; i++) {
    const o = arguments[i]
    if (!o) continue
    for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k]
  }
  return out
}

function emptyTables() {
  const t = {}
  SYNC_TABLES.forEach(function (n) { t[n] = [] })
  return t
}

function sig(t) { try { return JSON.stringify(t) } catch (e) { return '!' } }

function idsOf(rows) { return (rows || []).map(function (r) { return r && r.id }).filter(Boolean) }

function snapOf(tables) {
  const o = {}
  APP_TABLES.forEach(function (n) { o[n] = idsOf(tables[n]) })
  return o
}

function loadSnap() {
  try { return JSON.parse(localStorage.getItem(SNAP_KEY) || '{}') } catch (e) { return {} }
}

function storeSnap(tables) {
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(snapOf(tables))) } catch (e) {}
}

/* document <-> { table: [rows] } ------------------------------------- */

function toTables(doc) {
  const t = {}
  ARRAY_TABLES.forEach(function (n) {
    t[n] = (doc && Array.isArray(doc[n]) ? doc[n] : []).filter(function (r) { return r && r.id })
  })
  OBJECT_TABLES.forEach(function (n) {
    const o = doc && doc[n]
    t[n] = (o && typeof o === 'object' && !Array.isArray(o)) ? [assign(o, { id: 'main' })] : []
  })
  t.meta = []
  return t
}

function fromTables(t) {
  const doc = {}
  ARRAY_TABLES.forEach(function (n) { doc[n] = (t[n] || []).slice() })
  OBJECT_TABLES.forEach(function (n) {
    const out = {}
    const row = (t[n] || []).filter(function (r) { return r && r.id === 'main' })[0]
    if (row) for (const k in row) if (k !== 'id' && Object.prototype.hasOwnProperty.call(row, k)) out[k] = row[k]
    doc[n] = out
  })
  return doc
}

function hasData(tables) {
  return APP_TABLES.some(function (n) { return (tables[n] || []).length > 0 })
}

function cloudHasAny(tables) {
  return APP_TABLES.some(function (n) { return (tables[n] || []).length > 0 })
}

function cloudSavedAt(tables) {
  const rows = tables.meta || []
  for (let i = 0; i < rows.length; i++) if (rows[i] && rows[i].id === 'main') return rows[i].savedAt || 0
  return 0
}

/* local document ------------------------------------------------------ */

function readRaw() {
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null } catch (e) { return null }
}

function embedded() {
  try {
    const el = document.getElementById('app-data')
    if (el && el.textContent.trim() && el.textContent.trim() !== 'null') return JSON.parse(el.textContent)
  } catch (e) {}
  return null
}

function readDoc() {
  const local = readRaw(), emb = embedded()
  if (!local && !emb) return { doc: null, origin: 'storage' }
  if (!local) return { doc: emb, origin: 'seed' }
  if (!emb) return { doc: local, origin: 'storage' }
  const lT = local._savedAt || 0, eT = emb._savedAt || 0
  return eT > lT ? { doc: emb, origin: 'seed' } : { doc: local, origin: 'storage' }
}

function defaultDoc() {
  return getDefaultData()
}

function writeDoc(doc) {
  S.selfWrite = true
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(doc)) } catch (e) {}
  finally { S.selfWrite = false }
}

/* ---------------- merge (same rules as the warehouse app) ---------------- */

function mergeRows(prevIds, cloudRows, localRows, localWins) {
  const inCloud = {}
  ;(cloudRows || []).forEach(function (r) { if (r && r.id) inCloud[r.id] = true })
  const synced = {}
  ;(prevIds || []).forEach(function (id) { if (id) synced[id] = true })
  const localList = (localRows || []).filter(function (r) { return r && r.id })
  const localIds = {}
  localList.forEach(function (r) { localIds[r.id] = true })

  const keepLocal = localList.filter(function (r) {
    return inCloud[r.id] ? !!localWins : !synced[r.id]
  })
  const takeCloud = (cloudRows || []).filter(function (r) {
    return r && r.id && (localIds[r.id] ? !localWins : !synced[r.id])
  })
  return keepLocal.concat(takeCloud)
}

/* ============================================================
   Tombstone system for LWW delete propagation
   ============================================================ */

function loadTombstones() {
  try { return JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || '{}') } catch (e) { return {} }
}

function storeTombstones(tombs) {
  try { localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(tombs)) } catch (e) {}
}

function softDelete(table, id) {
  const tombs = loadTombstones()
  if (!tombs[table]) tombs[table] = {}
  tombs[table][id] = Date.now()
  storeTombstones(tombs)
}

function isSoftDeleted(table, id) {
  const tombs = loadTombstones()
  return !!(tombs[table] && tombs[table][id])
}

function cleanOldTombstones(maxAgeMs) {
  maxAgeMs = maxAgeMs || (90 * 24 * 60 * 60 * 1000)
  const tombs = loadTombstones()
  const now = Date.now()
  let changed = false
  Object.keys(tombs).forEach(function (table) {
    Object.keys(tombs[table]).forEach(function (id) {
      if (now - tombs[table][id] > maxAgeMs) {
        delete tombs[table][id]
        changed = true
      }
    })
    if (Object.keys(tombs[table]).length === 0) delete tombs[table]
  })
  if (changed) storeTombstones(tombs)
  return changed
}

/* ============================================================
   mergeInto — نسخه‌ی نهایی با پشتیبانی از baseDoc
   baseDoc: عکس لحظه‌ای از State کاربر قبل از هر بازنویسی
   ============================================================ */
function mergeInto(cloudTables, localWins, baseDoc) {
  const info = baseDoc ? { doc: baseDoc } : readDoc()
  const doc = info.doc || defaultDoc()
  const localTables = toTables(doc)
  const snap = loadSnap()
  const out = {}
  APP_TABLES.forEach(function (n) {
    out[n] = mergeRows(snap[n], cloudTables[n] || [], localTables[n] || [], localWins)
  })
  out.meta = (cloudTables.meta || []).slice()

  const next = fromTables(out)
  const lT = doc._savedAt || 0, cT = cloudSavedAt(cloudTables)
  next._savedAt = Math.max(lT, cT) || lT || cT || 0
  return {
    changed: sig(out) !== sig(localTables),
    doc: next,
    tables: out
  }
}

function apply(result) {
  if (!result || !result.changed) return false
  writeDoc(result.doc)
  if (S.mounted && typeof window.__ktdSetData === 'function') {
    let d = result.doc
    try { d = normalizeData(result.doc) } catch (e) {}
    try { window.__ktdSetData(d) } catch (e) { console.warn('[ktd-sync] setData failed', e) }
  }
  return true
}

/* ---------------- transport ---------------- */

function pull(timeout) {
  return pullDump(timeout)
}

/* ---------------- user feedback ---------------- */

function warn(msg) {
  if (S.warned) return
  S.warned = true
  console.warn('[ktd-sync]', msg)
  try {
    const el = document.createElement('div')
    el.textContent = msg
    el.setAttribute('role', 'status')
    el.style.cssText = 'position:fixed;z-index:99999;left:50%;bottom:22px;transform:translateX(-50%);' +
      'background:#1A1A1A;color:#fff;border:1px solid #3A3A3A;border-radius:12px;padding:11px 18px;' +
      'font-size:13px;line-height:1.7;box-shadow:0 10px 34px rgba(0,0,0,.55);max-width:92vw;text-align:center;' +
      "font-family:'Vazirmatn',sans-serif;opacity:0;transition:opacity .3s"
    document.body.appendChild(el)
    requestAnimationFrame(function () { el.style.opacity = '1' })
    setTimeout(function () {
      el.style.opacity = '0'
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el) }, 400)
    }, 3600)
  } catch (e) {}
}

function hideSplash() {
  try {
    const el = document.getElementById('bootSplash')
    if (el && el.parentNode) el.parentNode.removeChild(el)
  } catch (e) {}
}

/* ---------------- reconcile ---------------- */

function reconcile(res) {
  S.pulled = true
  const cloud = res.tables
  const info = readDoc()
  const doc = info.doc || defaultDoc()
  const localTables = toTables(doc)

  if (!cloudHasAny(cloud)) {
    storeSnap(emptyTables())
    S.lastSig = null
    S.origin = 'storage'
    if (hasData(localTables)) S.dirty = true
    return
  }

  if (info.origin === 'seed') {
    const taken = fromTables(cloud)
    taken._savedAt = cloudSavedAt(cloud) || doc._savedAt || Date.now()
    storeSnap(cloud)
    S.lastSig = sig(toTables(taken))
    writeDoc(taken)
    S.origin = 'storage'
    return
  }

  const cT = cloudSavedAt(cloud)
  const lT = doc._savedAt || 0
  const localWins = cT > 0 && lT > cT
  const merged = mergeInto(cloud, localWins)
  apply(merged)
  storeSnap(cloud)
  S.lastSig = sig(cloud)
  S.origin = 'storage'
  if (sig(merged.tables) !== sig(cloud)) S.dirty = true
}

function retryLater(fn) {
  if (retryTimer) return
  retryTimer = setTimeout(function () { retryTimer = null; fn() }, RETRY_DELAY)
}

function pullAgain() {
  if (!cloudOn()) return Promise.resolve()
  return pull().then(function (res) {
    if (!res.ok) {
      if (S.queued || S.dirty) retryLater(pullAgain)
      return
    }
    reconcile(res)
    if (S.dirty) queuePush()
  })
}

/* ---------------- push ---------------- */

function queuePush() {
  if (!cloudOn()) return
  S.editGen++
  S.dirty = true
  if (!S.pulled) {
    S.queued = true
    retryLater(pullAgain)
    return
  }
  clearTimeout(pushTimer)
  pushTimer = setTimeout(push, PUSH_DELAY)
}

function retryLaterPush() { retryLater(push) }

/* pull -> reconcile -> one atomic PUT of the whole document */
function push() {
  if (!cloudOn() || S.busy) return Promise.resolve()
  S.busy = true
  const gen = S.editGen
  return pull().then(function (res) {
    if (!res.ok) {
      warn('ارسال متوقف شد — اتصال برقرار نیست؛ داده‌ها روی همین دستگاه می‌مانند')
      if (S.dirty) retryLaterPush()
      return
    }
    S.pulled = true
    const cloud = res.tables
    let out

    if (cloudHasAny(cloud)) {
      // ============ عکس لحظه‌ای از State کاربر قبل از هر بازنویسی ============
      const beforeInfo = readDoc()
      const beforeDoc = beforeInfo.doc || defaultDoc()

      // مرحله ۱: با سرور reconcile کن (localWins=false) تا حذف‌های ریموت پاک بشن
      const reconciled = mergeInto(cloud, false)
      if (reconciled.changed) apply(reconciled)

      // مرحله ۲: از نسخه‌ی اصلی beforeDoc استفاده کن (نه از localStorage که تازه بازنویسی شده)
      const merged = mergeInto(cloud, true, beforeDoc)
      out = merged.tables
      apply(merged)
    } else {
      const info = readDoc()
      out = toTables(info.doc || defaultDoc())
      storeSnap(emptyTables())
    }

    // Skip the write entirely when the merged result equals what the server
    // just returned — saves D1 row-write quota (retries/unchanged cycles).
    // The client's settings table only carries id 'main'; login rows (u_*)
    // are invisible to it and must not take part in the comparison.
    const stable = function (t, isOut) {
      const o = {}
      Object.keys(t || {}).forEach(function (k) {
        if (k === 'meta') return
        let rows = (t[k] || []).slice()
        if (isOut && k === 'settings') rows = rows.filter(function (r) { return r && r.id === 'main' })
        if (!isOut && k === 'settings') rows = rows.filter(function (r) { return r && r.id === 'main' })
        o[k] = rows.sort(function (a, b) {
          const x = String(a && a.id), y = String(b && b.id)
          return x < y ? -1 : x > y ? 1 : 0
        })
      })
      return o
    }
    const outKeys = Object.keys(stable(out, true)).sort().join(',')
    const cloudKeys = Object.keys(stable(cloud, false)).sort().join(',')
    if (cloud && outKeys === cloudKeys && sig(stable(out, true)) === sig(stable(cloud, false))) {
      S.lastSig = sig(out)
      storeSnap(out)
      S.queued = false
      if (S.editGen === gen) S.dirty = false; else retryLaterPush()
      console.log('[ktd-sync] unchanged — write skipped')
      return Promise.resolve()
    }

    out.meta = [{ id: 'main', savedAt: Date.now() }]

    return putDump(out)
      .then(function () {
        S.lastSig = sig(out)
        storeSnap(out)
        S.queued = false
        if (S.editGen === gen) S.dirty = false; else retryLaterPush()
        console.log('[ktd-sync] pushed ✓', {
          tables: Object.keys(out).reduce(function (a, k) { a[k] = (out[k] || []).length; return a }, {})
        })
      })
  })
    .catch(function (e) {
      warn('ارسال ابری ناموفق بود: ' + ((e && e.message) || 'خطای ناشناخته'))
      if (S.dirty) retryLaterPush()
    })
    .finally(function () { S.busy = false })
}

/* ---------------- hooks into the app ---------------- */

function armHook() {
  if (Storage.prototype.__ktdHooked) return
  const orig = Storage.prototype.setItem
  Storage.prototype.setItem = function (key, value) {
    const r = orig.apply(this, arguments)
    try {
      if (key !== STORAGE_KEY || S.selfWrite) return r
      const s = sig(toTables(JSON.parse(value)))
      if (!S.armed) { S.armed = true; S.mountSig = s }
      else if (s !== S.mountSig) { S.origin = 'storage' }
      if (s !== S.lastSig) queuePush()
    } catch (e) {}
    return r
  }
  Storage.prototype.__ktdHooked = true
}

function boot() {
  let work
  if (!cloudOn()) { S.pulled = true; work = Promise.resolve() }
  else {
    work = pull(BOOT_TIMEOUT)
      .then(function (res) {
        if (!res.ok) {
          warn('همگام‌سازی ابری در دسترس نیست — داده‌ها روی همین دستگاه ذخیره و بعداً ارسال می‌شود')
          if (S.queued || S.dirty) retryLater(pullAgain)
          return
        }
        reconcile(res)
      })
      .catch(function (e) { console.warn('[ktd-sync] boot failed', e) })
  }
  return work.then(hideSplash, hideSplash)
}

function start() {
  S.mounted = true
  armHook()
  window.addEventListener('online', function () {
    S.warned = false // اجازه بده دوباره هشدار بده اگه بازم قطع شد
    if (!S.pulled) { pullAgain(); return }
    if (S.dirty && !S.busy) queuePush()
  })
  setInterval(function () {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    if (!S.pulled) { pullAgain(); return }
    if (S.dirty && !S.busy) queuePush()
  }, 20000)
  if (S.dirty) queuePush()
}

export const KTD_SYNC = {
  boot: boot,
  start: start,
  state: function () { return S },
  push: push,
  pull: pullAgain,
  softDelete: softDelete,
  isSoftDeleted: isSoftDeleted,
  tombstones: loadTombstones
}

// سازگاری با کد مبدأ (کدهای قدیمی ممکن است window.KTD_SYNC را بخوانند)
if (typeof window !== 'undefined') window.KTD_SYNC = KTD_SYNC

export default KTD_SYNC
