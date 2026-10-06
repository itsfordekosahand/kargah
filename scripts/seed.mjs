/**
 * انتقال دادهٔ ابریِ موجود به دیتابیس‌های تازه — یک‌بار، بعد از اولین دپلوی.
 *
 *   node scripts/seed.mjs https://kargah-app.<account>.workers.dev
 *
 * چه چیزی منتقل می‌شود؟
 *   • انبار: جدول‌های tools/sheets/hardware/templates/jobs + lock
 *            از worker قدیمی  kargah-anbar-api
 *   • مالی:  سند sync (dump) + lock
 *            از worker قدیمی  ktd-api
 *
 * کارگران قدیمی دست نمی‌خورند — بعداً اگر خواستی می‌توانی خاموششان کنی.
 * این اسکریپت امن است: اول می‌خواند، بعد در دیتابیس تازه می‌نویسد و
 * در پایان با خواندن دوباره تأیید می‌کند.
 */

const NEW = (process.argv[2] || '').replace(/\/+$/, '')
if (!NEW) {
  console.error('استفاده: node scripts/seed.mjs https://<آدرس-دومین-یا-workers.dev-جدید>')
  process.exit(1)
}

const OLD_ANBAR = 'https://kargah-anbar-api.itsfordecosahand.workers.dev'
const OLD_KTD = 'https://ktd-api.itsfordecosahand.workers.dev'
const ANBAR_KEY = 'wYb9XPNSAGPE7ZLEe98hypIfzo8cvZZfHWte6Ug6myGutboJ'
const KTD_KEY = 'OD6Zgiu5tmO5IN2bxHqSzLDgH4564vtbdAUkdcnAwCBtxAmw'

const ANBAR_TABLES = ['tools', 'sheets', 'hardware', 'templates', 'jobs', 'lock']
const KTD_TABLES = ['lock']

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

async function getJson(url, key) {
  const r = await fetch(url, { headers: { 'X-API-Key': key, 'User-Agent': UA }, cache: 'no-store' })
  if (!r.ok) throw new Error(`GET ${url} → HTTP ${r.status}`)
  return r.json()
}

async function putJson(url, key, body) {
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'X-API-Key': key, 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify(body),
    cache: 'no-store'
  })
  if (!r.ok) throw new Error(`PUT ${url} → HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json().catch(() => null)
}

async function main() {
  console.log(`مبدأ: worker های قدیمی   ←   مقصد: ${NEW}\n`)

  // ---- انبار ----
  let anbarRows = 0
  for (const t of ANBAR_TABLES) {
    const rows = await getJson(`${OLD_ANBAR}/api/${t}`, ANBAR_KEY)
    if (!Array.isArray(rows)) throw new Error(`شکل غیرمنتظره برای ${t}`)
    await putJson(`${NEW}/anbar/api/${t}`, ANBAR_KEY, rows)
    const back = await getJson(`${NEW}/anbar/api/${t}`, ANBAR_KEY)
    if (back.length !== rows.length) throw new Error(`تأیید ${t} ناموفق: ${rows.length} ← ${back.length}`)
    anbarRows += rows.length
    console.log(`  ✓ انبار/${t}: ${rows.length} ردیف`)
  }

  // ---- مالی: سند sync ----
  const dump = await getJson(`${OLD_KTD}/api/dump`, KTD_KEY)
  if (!dump || !dump.tables) throw new Error('سند dump معتبر نبود')
  await putJson(`${NEW}/ktd/api/dump`, KTD_KEY, dump)
  const backDump = await getJson(`${NEW}/ktd/api/dump`, KTD_KEY)
  const count = (t) => (t || []).length
  const summaryOld = Object.keys(dump.tables).map(k => `${k}:${count(dump.tables[k])}`).join('، ')
  if (JSON.stringify(backDump.tables) !== JSON.stringify(dump.tables)) {
    throw new Error('تأیید dump ناموفق — محتوای برگشتی یکی نیست')
  }
  console.log(`  ✓ مالی/dump: ${summaryOld}`)

  // ---- مالی: lock ----
  for (const t of KTD_TABLES) {
    const rows = await getJson(`${OLD_KTD}/api/${t}`, KTD_KEY)
    await putJson(`${NEW}/ktd/api/${t}`, KTD_KEY, rows)
    const back = await getJson(`${NEW}/ktd/api/${t}`, KTD_KEY)
    if (back.length !== rows.length) throw new Error(`تأیید مالی/${t} ناموفق`)
    console.log(`  ✓ مالی/${t}: ${rows.length} ردیف`)
  }

  console.log(`\n✔ انتقال کامل شد — انبار: ${anbarRows} ردیف + سند مالی + کاربران`)
}

main().catch(e => {
  console.error('✖ خطا:', e.message)
  process.exit(1)
})
