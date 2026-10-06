/**
 * کارگاه — Worker واحدِ Cloudflare
 * =====================================================================
 * هر سه ماژول (مالی، انبار، ابعاد) و لانچر از یک دامنه سرو می‌شوند و
 * API هم زیر همین دامنه است؛ یعنی بعد از دپلوی، فرانت «خودش» به
 * بک‌اند وصل است و هیچ آدرس دامنه‌ای در کد فرانت تنظیم نمی‌شود.
 *
 *   assets/            → فایل‌های ایستا (لانچر + ماژول‌ها) — سروِ خودکار
 *   /anbar/api/<table> → دیتابیس D1 ماژول انبار   (binding: DB)
 *   /ktd/api/dump|lock → دیتابیس D1 ماژول مالی     (binding: KTD_DB)
 *
 * قراردادها عیناً از فرانتِ موجود است (store/api.js + public/lock.js
 * ماژول انبار، core/api.js ماژول مالی) — هیچ تغییری در شکل داده نیست.
 *
 * دلیل «یک Worker» بودن: دکمهٔ Deploy to Cloudflare یک کلیک است —
 * سایت + دیتابیس + API همه با هم ساخته و وصل می‌شوند.
 */

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
}

/** جدول‌های ماژول انبار (config/constants.js → CLOUD_TABLES) + lock */
const ANBAR_TABLES = ['tools', 'sheets', 'hardware', 'templates', 'jobs', 'lock']

/** حداکثر اندازهٔ یک payload (جلوی سوءاستفاده و خطای D1 را می‌گیرد) */
const MAX_BODY = 6_000_000

/* ---------- اسکیمای خودکار (Self-init) ----------
 * دکمهٔ Deploy فقط بیلد و انتشار می‌کند؛ اسکیما را خودِ Worker در نخستین
 * درخواست API می‌سازد. CREATE TABLE IF NOT EXISTS هم‌زمان امن است، پس
 * حتی اگر چند درخواست با هم برسند مشکلی پیش نمی‌آید. */
const ANBAR_DDL = [
  `CREATE TABLE IF NOT EXISTS tools     (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS sheets    (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS hardware  (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS jobs      (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS lock      (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}')`
]
const KTD_DDL = [
  `CREATE TABLE IF NOT EXISTS ktd_dump (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS lock     (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}')`
]

/* پرچم در سطح isolate — بعد از اولین بار، هر درخواست فقط یک بررسی بولی است */
let anbarSchemaReady = false
let ktdSchemaReady = false

async function ensureAnbarSchema(env) {
  if (anbarSchemaReady) return
  await env.DB.batch(ANBAR_DDL.map(sql => env.DB.prepare(sql)))
  anbarSchemaReady = true
}

async function ensureKtdSchema(env) {
  if (ktdSchemaReady) return
  await env.KTD_DB.batch(KTD_DDL.map(sql => env.KTD_DB.prepare(sql)))
  ktdSchemaReady = true
}

/* ---------- کمکی‌های عمومی ---------- */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

/** خطا هم JSON برمی‌گردد تا فرانت به‌جای HTML پیام بی‌معنا نبیند */
function fail(status, message) {
  return json({ error: message }, status)
}

/** پاسخ OPTIONS برای CORS (رفتار همان نسخهٔ قبلی Worker) */
function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS',
      'Content-Type': 'application/json'
    }
  })
}

/** هدرهای CORS را بدون تکرار به پاسخ اضافه می‌کند */
function withCors(res) {
  const h = new Headers(res.headers)
  h.set('Access-Control-Allow-Origin', '*')
  h.set('Access-Control-Allow-Headers', '*')
  h.set('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS')
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
}

/** تطبیق کلید به‌صورت زمان‌ثابت تا زمان پاسخ اطلاعات ندهد */
function keyOk(request, expected) {
  if (!expected) return false
  const given = request.headers.get('X-API-Key') || ''
  if (given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

/** آیا خطا از سقف مصرف D1 است؟ (lock.js پیام «exceeded» را می‌شناسد) */
function isQuotaError(err) {
  const m = String((err && err.message) || '').toLowerCase()
  return m.includes('limit') || m.includes('quota') || m.includes('exceeded')
}

/** پاسخ سهمیه — بدنه دقیقاً شامل «exceeded» هست چون lock.js دنبال همین می‌گردد */
function quotaResponse() {
  return new Response('daily write limit exceeded', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  })
}

async function readBody(request) {
  const len = Number(request.headers.get('Content-Length') || 0)
  if (len > MAX_BODY) return { tooBig: true }
  try {
    const body = await request.json()
    return { body }
  } catch (_) {
    return { bad: true }
  }
}

/* ---------- شکل ردیف‌ها (عیناً از توابع نسخهٔ قبلی) ---------- */

/**
 * هر جدول ستون `id` دارد و بقیهٔ فیلدها در `data` به‌صورت JSON؛
 * تغییر شکل رکوردهای فرانت دیتابیس را از ALTER TABLE بی‌نیاز می‌کند.
 */
const rowToRecord = (row) => {
  let data = {}
  try { data = row.data ? JSON.parse(row.data) : {} } catch (_) { data = {} }
  return { id: row.id, ...data }
}

const recordToRow = (rec) => {
  const { id, ...rest } = rec || {}
  return { id: String(id), data: JSON.stringify(rest) }
}

/* =====================================================================
 * ماژول انبار — /anbar/api/<table>  و  /anbar/api/<table>/<id>
 * ===================================================================== */

async function anbarApi(request, env, subPath) {
  const parts = subPath.split('/').filter(Boolean) // ['tools'] یا ['lock','<id>']
  const table = parts[0] || ''
  const id = parts[1] ? decodeURIComponent(parts[1]) : ''

  if (!ANBAR_TABLES.includes(table)) return fail(404, 'جدول نامعتبر: ' + table)
  if (!keyOk(request, env.ANBAR_API_KEY)) return fail(401, 'کلید API نامعتبر است')

  try {
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(`SELECT id, data FROM ${table} ORDER BY rowid`).all()
      return json(results.map(rowToRecord))
    }

    if (request.method === 'PUT') {
      const parsed = await readBody(request)
      if (parsed.tooBig) return fail(413, 'بدنهٔ درخواست بزرگ‌تر از حد مجاز است')
      if (parsed.bad) return fail(400, 'بدنهٔ درخواست JSON معتبر نیست')
      const val = parsed.body

      if (Array.isArray(val)) {
        // «PUT = آپلود کامل جدول» — رفتار api.js putTable
        if (val.length > 5000) return fail(413, 'تعداد ردیف بیش از حد مجاز است')
        const ids = val.map(r => String(r && r.id != null ? r.id : ''))
        if (ids.some(x => !x)) return fail(400, 'هر ردیف باید id داشته باشد')
        const stmts = [env.DB.prepare(`DELETE FROM ${table}`)]
        for (const rec of val) {
          stmts.push(env.DB.prepare(`INSERT INTO ${table} (id, data) VALUES (?, ?)`).bind(rec.id, recordToRow(rec).data))
        }
        await env.DB.batch(stmts)
        return json(true)
      }

      // «PUT = upsert یک ردیف» — رفتار lock.js saveUser
      if (val && val.id != null) {
        const row = recordToRow(val)
        await env.DB.prepare(`INSERT INTO ${table} (id, data) VALUES (?, ?)
                              ON CONFLICT(id) DO UPDATE SET data = excluded.data`)
          .bind(row.id, row.data).run()
        return json(true)
      }
      return fail(400, 'بدنه باید آرایه یا رکوردِ دارای id باشد')
    }

    if (request.method === 'DELETE') {
      if (table !== 'lock') return fail(405, 'حذف ردیف فقط برای جدول lock پشتیبانی می‌شود')
      if (!id) return fail(400, 'id لازم است')
      await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run()
      return json(true)
    }

    return fail(405, 'متد پشتیبانی نمی‌شود: ' + request.method)
  } catch (err) {
    if (isQuotaError(err)) return quotaResponse()
    console.error('anbar api error', table, request.method, err && err.message)
    return fail(500, 'خطای داخلی سرور')
  }
}

/* =====================================================================
 * ماژول مالی — /ktd/api/dump  و  /ktd/api/lock
 *
 * قرارداد (core/api.js مالی):
 *   GET    /api/dump → { tables: {...} }     (pull)
 *   PUT    /api/dump ← { tables: {...} }     (push — یک سند کامل)
 *   GET    /api/lock → [ {id:'u_*'|'lock', …} ]
 *   PUT    /api/lock ← یک رکورد (upsert) یا آرایه (جایگزینی کامل)
 *   DELETE /api/lock/<id>
 *
 * سند dump در یک ردیف واحد (id='doc') نگهداری می‌شود: PUT اتمیک است،
 * همان‌طور که sync.js انتظار دارد («one atomic PUT of the whole document»).
 * ===================================================================== */

async function ktdApi(request, env, subPath) {
  const parts = subPath.split('/').filter(Boolean) // ['dump'] یا ['lock'] / ['lock','<id>']
  const route = parts[0] || ''
  const id = parts[1] ? decodeURIComponent(parts[1]) : ''

  if (route !== 'dump' && route !== 'lock') return fail(404, 'مسیر نامعتبر: ' + route)
  if (!keyOk(request, env.KTD_API_KEY)) return fail(401, 'کلید API نامعتبر است')

  try {
    if (route === 'dump') {
      if (request.method === 'GET') {
        const row = await env.KTD_DB.prepare(`SELECT data FROM ktd_dump WHERE id = 'doc'`).first()
        const doc = row ? JSON.parse(row.data) : { tables: {} }
        return json(doc && typeof doc === 'object' && doc.tables ? doc : { tables: {} })
      }
      if (request.method === 'PUT') {
        const parsed = await readBody(request)
        if (parsed.tooBig) return fail(413, 'بدنهٔ درخواست بزرگ‌تر از حد مجاز است')
        if (parsed.bad) return fail(400, 'بدنهٔ درخواست JSON معتبر نیست')
        const doc = parsed.body
        if (!doc || typeof doc !== 'object' || !doc.tables || typeof doc.tables !== 'object') {
          return fail(400, 'سند باید شکل { tables: {...} } را داشته باشد')
        }
        await env.KTD_DB.prepare(
          `INSERT INTO ktd_dump (id, data) VALUES ('doc', ?)
           ON CONFLICT(id) DO UPDATE SET data = excluded.data`
        ).bind(JSON.stringify({ tables: doc.tables })).run()
        return json({ ok: true })
      }
      return fail(405, 'متد پشتیبانی نمی‌شود: ' + request.method)
    }

    // route === 'lock'
    if (request.method === 'GET') {
      const { results } = await env.KTD_DB.prepare(`SELECT id, data FROM lock ORDER BY rowid`).all()
      return json(results.map(rowToRecord))
    }

    if (request.method === 'PUT') {
      const parsed = await readBody(request)
      if (parsed.tooBig) return fail(413, 'بدنهٔ درخواست بزرگ‌تر از حد مجاز است')
      if (parsed.bad) return fail(400, 'بدنهٔ درخواست JSON معتبر نیست')
      const val = parsed.body

      if (Array.isArray(val)) {
        // برای اسکریپت seed/مهاجرت: جایگزینی کامل جدول کاربران
        const stmts = [env.KTD_DB.prepare(`DELETE FROM lock`)]
        for (const rec of val) {
          if (!rec || rec.id == null) return fail(400, 'هر ردیف باید id داشته باشد')
          stmts.push(env.KTD_DB.prepare(`INSERT INTO lock (id, data) VALUES (?, ?)`).bind(rec.id, recordToRow(rec).data))
        }
        await env.KTD_DB.batch(stmts)
        return json(true)
      }

      if (val && val.id != null) {
        const row = recordToRow(val)
        await env.KTD_DB.prepare(`INSERT INTO lock (id, data) VALUES (?, ?)
                                  ON CONFLICT(id) DO UPDATE SET data = excluded.data`)
          .bind(row.id, row.data).run()
        return json(true)
      }
      return fail(400, 'رکورد باید id داشته باشد')
    }

    if (request.method === 'DELETE') {
      if (!id) return fail(400, 'id لازم است')
      await env.KTD_DB.prepare(`DELETE FROM lock WHERE id = ?`).bind(id).run()
      return json(true)
    }

    return fail(405, 'متد پشتیبانی نمی‌شود: ' + request.method)
  } catch (err) {
    if (isQuotaError(err)) return quotaResponse()
    console.error('ktd api error', route, request.method, err && err.message)
    return fail(500, 'خطای داخلی سرور')
  }
}

/* =====================================================================
 * مسیریاب — زیر این مسیرها، فایل‌های ایستا (assets) خودکار سرو می‌شوند
 * (assets را Wrangler قبل از Worker پاسخ می‌دهد؛ اینجا فقط API و 404)
 * ===================================================================== */

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname

    if (request.method === 'OPTIONS') {
      if (path.startsWith('/anbar/api/') || path.startsWith('/ktd/api/')) return corsPreflight()
      return new Response(null, { status: 204 })
    }

    if (path.startsWith('/anbar/api/')) {
      let res
      try {
        await ensureAnbarSchema(env)
        res = await anbarApi(request, env, path.slice('/anbar/api/'.length))
      } catch (err) {
        console.error('anbar schema/err', err && err.message)
        res = fail(500, 'خطای داخلی سرور')
      }
      return withCors(res)
    }

    if (path.startsWith('/ktd/api/')) {
      let res
      try {
        await ensureKtdSchema(env)
        res = await ktdApi(request, env, path.slice('/ktd/api/'.length))
      } catch (err) {
        console.error('ktd schema/err', err && err.message)
        res = fail(500, 'خطای داخلی سرور')
      }
      return withCors(res)
    }

    // هیچ دارایی و هیچ مسیر API پیدا نشد
    return new Response('یافت نشد — 404', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  }
}
