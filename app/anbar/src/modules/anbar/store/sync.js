/**
 * موتور همگام‌سازی ابری — عین منطق لاین‌های 346-488 اسکریپت قدیمی
 * (adoptCloud / syncFromCloud / queueSyncToCloud / syncToCloud) با وابستگی تزریقی.
 *
 * قواعد حفظ‌شده:
 *  - هرگز قبل از اولین pull موفق push نمی‌شود (وگرنه دستگاه تازه کل دیتابیس را پاک می‌کند).
 *  - pull ناموفق هرگز به‌معنی جدول خالی نیست.
 *  - دو گذار ادغام: localWins=false سپس localWins=true.
 *  - فقط جدول‌هایی که از پاسخ سرور فرق دارند PUT می‌شوند.
 *  - tombstone برای حذف بین دستگاهی + پاک‌سازی قدیمی‌تر از ۹۰ روز.
 */
import { CLOUD_TABLES, SYNC_KEY } from '../config/constants.js'
import { mergeWithTombstones, cleanOldTombstones, idsBy as idsByImpl, idsOf } from '../core/merge.js'

/** نگاشت شناسه‌های جدول‌ها به فرمت کلید SYNC_KEY — لاین 312 اسکریپت قدیمی */
const idsBy = tableRows => idsByImpl(tableRows, CLOUD_TABLES)

const emptyTombs = () => ({ tools: {}, sheets: {}, hardware: {}, templates: {}, jobs: {} })
const byId = rows => (rows || []).slice().sort((a, b) =>
  String(a && a.id) < String(b && b.id) ? -1 : String(a && a.id) > String(b && b.id) ? 1 : 0)

export function cloudHasAny(byTable) {
  return CLOUD_TABLES.some(t => (byTable[t] || []).length > 0)
}

export function createSyncEngine(env) {
  const { api, storage, hooks } = env
  const state = () => hooks.state()

  let cloudPulled = false
  let cloudPushQueued = false
  let cloudPushTimer = null
  let cloudRetryTimer = null
  let cloudWarned = false
  let cloudDirty = false
  let cloudBusy = false
  let editGen = 0

  const cloudOn = () => !!(api && api.base)
  const loadSyncedIds = () => {
    try { return JSON.parse(storage.getItem(SYNC_KEY) || '{}') } catch (_) { return {} }
  }
  const storeSyncedIds = ids => {
    try { storage.setItem(SYNC_KEY, JSON.stringify(ids)) } catch (_) {}
  }

  function cloudUnreachable(reason) {
    hooks.log('warn', 'Cloud sync unavailable:', reason)
    if (cloudWarned) return
    cloudWarned = true
    hooks.notify('همگام‌سازی ابری در دسترس نیست — داده‌ها روی همین دستگاه ذخیره و بعداً ارسال می‌شود', 'warn')
  }

  /** ادغام پاسخ سرور در state — لاین 346 */
  function adoptCloud(byTable, localWins) {
    const st = state()
    const prev = loadSyncedIds()
    const prevTombs = st.tombstones || emptyTombs()
    const cloudTombs = byTable.tombstones || {}
    const snap = () => JSON.stringify(CLOUD_TABLES.map(t => st[t]))
    const before = snap()

    CLOUD_TABLES.forEach(t => {
      const [rows, tombs] = mergeWithTombstones(
        prevTombs[t] || {},
        byTable[t] || [],
        cloudTombs[t] || {},
        st[t] || [],
        prevTombs[t] || {},
        localWins,
        prev[t] || []
      )
      st[t] = rows
      st.tombstones[t] = tombs
    })

    Object.keys(st.tombstones).forEach(t => {
      st.tombstones[t] = cleanOldTombstones(st.tombstones[t])
    })

    const changed = before !== snap()
    storeSyncedIds(idsBy(byTable))
    if (changed) hooks.persist()
    return changed
  }

  function retryLater(fn) {
    if (cloudRetryTimer) return
    cloudRetryTimer = setTimeout(() => { cloudRetryTimer = null; fn() }, 5000)
  }

  /** pull هنگام بالا آمدن — لاین 385 */
  function syncFromCloud() {
    if (!cloudOn()) return Promise.resolve()
    return api.pullAll().then(res => {
      if (!res.ok) {
        cloudUnreachable('pull failed: ' + res.err)
        cloudPulled = true
        if (cloudPushQueued || cloudDirty) retryLater(syncFromCloud)
        return
      }
      cloudPulled = true
      if (cloudPushQueued) {
        cloudPushQueued = false
        return syncToCloud()
      }
      if (!cloudHasAny(res.byTable)) {
        storeSyncedIds(idsBy(res.byTable))
        if (localHasData()) return syncToCloud()
        return
      }
      adoptCloud(res.byTable, false)
    }).catch(err => {
      cloudUnreachable(err && err.message)
      cloudPulled = true
      if (cloudPushQueued || cloudDirty) retryLater(syncFromCloud)
    })
  }

  function localHasData() {
    const st = state()
    return !!(st.tools.length || st.sheets.length || st.hardware.length ||
              st.templates.length || st.jobs.length)
  }

  /** صف کردن push بعد از هر ویرایش محلی — لاین 414 */
  function queueSyncToCloud() {
    if (!cloudOn()) return
    editGen++; cloudDirty = true
    if (!cloudPulled) { cloudPushQueued = true; return }
    clearTimeout(cloudPushTimer)
    cloudPushTimer = setTimeout(syncToCloud, 400)
  }

  /** pull، ادغام، سپس PUT فقط جدول‌های تغییرکرده — لاین 426 */
  function syncToCloud() {
    if (!cloudOn() || cloudBusy) return Promise.resolve()
    cloudBusy = true
    const gen = editGen
    return api.pullAll().then(res => {
      if (!res.ok) {
        cloudUnreachable('push skipped — pull failed: ' + res.err)
        if (cloudDirty) retryLater(syncToCloud)
        return
      }
      cloudPulled = true
      if (cloudHasAny(res.byTable)) {
        adoptCloud(res.byTable, false)
        adoptCloud(res.byTable, true)
      } else storeSyncedIds(idsBy(res.byTable))

      const st = state()
      const snapshot = {}
      CLOUD_TABLES.forEach(t => { snapshot[t] = st[t] })
      snapshot.tombstones = st.tombstones || emptyTombs()

      const dirtyTables = CLOUD_TABLES.filter(t =>
        JSON.stringify(byId(snapshot[t])) !== JSON.stringify(byId(res.byTable[t])))
      if (!dirtyTables.length) {
        storeSyncedIds(idsBy(snapshot))
        cloudPushQueued = false
        if (editGen === gen) cloudDirty = false; else retryLater(syncToCloud)
        hooks.log('log', 'Cloud sync OK (server already up to date)')
        return
      }
      return Promise.all(dirtyTables.map(t => api.putTable(t, snapshot[t]))).then(() => {
        storeSyncedIds(idsBy(snapshot))
        cloudPushQueued = false
        if (editGen === gen) cloudDirty = false
        else retryLater(syncToCloud)
        hooks.log('log', 'Cloud sync OK')
      })
    }).catch(err => cloudUnreachable(err && err.message))
      .finally(() => { cloudBusy = false })
  }

  function start() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { if (cloudDirty) syncToCloud() })
      setInterval(() => {
        if (cloudDirty && !cloudBusy && (typeof navigator === 'undefined' || navigator.onLine !== false)) syncToCloud()
      }, 20000)
    }
    return syncFromCloud()
  }

  return {
    adoptCloud, syncFromCloud, syncToCloud, queueSyncToCloud, start,
    cloudHasAny: () => cloudHasAny,
    isPulled: () => cloudPulled,
    isDirty: () => cloudDirty,
    loadSyncedIds, storeSyncedIds
  }
}

export { idsOf }
