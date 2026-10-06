/**
 * لایهٔ درخواست‌های HTTP — معادل apiOptions/readJson/pullTable/pullAll اسکریپت قدیمی (لاین 273-341).
 * fetch تزریقی است تا تست‌ها بدون شبکه اجرا شوند؛ شکل درخواست/پاسخ عین نسخه قدیمی است.
 */
import { API_BASE, API_KEY, CLOUD_TABLES } from '../config/constants.js'

/** هدرهایی که Worker برای پذیرش درخواست لازم دارد — لاین 273 */
export function apiOptions(extra, key = API_KEY) {
  return Object.assign({
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key }
  }, extra || {})
}

/**
 * پاسخ غیر JSON / HTML یعنی Cloudflare Access به‌جای داده صفحهٔ لاگین فرستاده است — لاین 278
 */
export function readJson(res) {
  const type = (res && res.headers && res.headers.get('content-type')) || ''
  if (!res.ok) throw new Error('HTTP ' + res.status)
  if (type.indexOf('json') === -1) throw new Error('Auth required (login page)')
  return res.json()
}

/** ساخت سرویس API روی هر fetch سازگار */
export function createApi(opts = {}) {
  const fetchImpl = opts.fetchImpl || ((...a) => globalThis.fetch(...a))
  const base = opts.base || API_BASE
  const key = opts.key || API_KEY

  const call = (path, extra) => fetchImpl(base + path, apiOptions(extra, key)).then(readJson)

  return {
    base,
    key,
    /** GET /api/<table> → آرایهٔ ردیف؛ شکست را هرگز «جدول خالی» تفسیر نمی‌کند — لاین 320 */
    pullTable(t) {
      return call('/api/' + t)
        .then(d => {
          if (!Array.isArray(d)) throw new Error('bad payload for ' + t)
          return { ok: true, rows: d }
        })
        .catch(err => ({ ok: false, err: err }))
    },
    /** ۵ GET موازی — لاین 330 */
    pullAll() {
      return Promise.all(CLOUD_TABLES.map(t => this.pullTable(t))).then(results => {
        const failed = results.filter(r => !r.ok)
        if (failed.length) {
          const e = failed[0].err
          return { ok: false, err: (e && e.message) || 'request failed' }
        }
        const byTable = {}
        CLOUD_TABLES.forEach((t, i) => { byTable[t] = results[i].rows })
        return { ok: true, byTable }
      })
    },
    /** PUT /api/<table> با آرایهٔ کامل جدول — لاین 466 */
    putTable(t, rows) {
      return call('/api/' + t, { method: 'PUT', body: JSON.stringify(rows) })
    },
    /** تعداد درخواست‌ها برای ابزار تست/استقرار */
    endpoints: CLOUD_TABLES.map(t => '/api/' + t)
  }
}
