// اکتشاف: لاگین + گرفتن stack خطای pageerror
import { chromium } from '/tmp/cabinet-nm/node_modules/playwright-core/index.mjs'
import crypto from 'node:crypto'

const BASE = 'http://localhost:4175/'

const SALT = '5f4dcc3b5aa765d61d8327deb882cf99'
const HASH = crypto.pbkdf2Sync('1111', Buffer.from(SALT, 'hex'), 120000, 32, 'sha256').toString('hex')
const ADMIN_ROW = [{ id: 'lock', name: 'admin', legacy: true, hash: HASH, salt: SALT, iter: 120000, alg: 'pbkdf2' }]

const apiLog = []
const browser = await chromium.launch({ executablePath: process.env.AGENT_BROWSER_EXECUTABLE_PATH, args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR' })

await ctx.route('**/ktd-api.itsfordecosahand.workers.dev/**', (route) => {
  const req = route.request()
  const u = req.url()
  apiLog.push(`${req.method()} ${u.replace('https://ktd-api.itsfordecosahand.workers.dev', '')}`)
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: b })
  if (u.includes('/api/lock')) {
    if (req.method() === 'GET') return json(JSON.stringify(ADMIN_ROW))
    return json(JSON.stringify({ ok: true }))
  }
  if (u.includes('/api/dump')) {
    if (req.method() === 'GET') {
      return json(JSON.stringify({ tables: { checks: [], expenses: [], allocations: [], debts: [], transactions: [], settings: [], meta: [{ id: 'main', savedAt: Date.now() }] } }))
    }
    return json(JSON.stringify({ ok: true }))
  }
  return json(JSON.stringify({ ok: true }))
})

const page = await ctx.newPage()
const msgs = []
page.on('console', m => msgs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', e => msgs.push(`[pageerror] ${e.message}\nSTACK:${e.stack}`))

await page.goto(BASE, { waitUntil: 'load' })
await page.waitForTimeout(2000)
console.log('--- after load, texts:')
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 600))
console.log('--- inputs:', await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => `${i.type} ph=${i.placeholder}`)))

// لاگین
await page.fill('input[placeholder="نام کاربری"]', 'admin')
await page.fill('input[placeholder="رمز عبور"]', '1111')
await page.click('button:has-text("ورود")')
await page.waitForTimeout(2500)

console.log('--- after login, body (first 1200):')
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 1200))
console.log('--- nav:', await page.evaluate(() => Array.from(document.querySelectorAll('.nav-item')).map(n => n.innerText.replace(/\n/g, '|'))))
console.log('--- api:', JSON.stringify(apiLog))
console.log('--- console/errors:')
for (const m of msgs) console.log(m)

await browser.close()
