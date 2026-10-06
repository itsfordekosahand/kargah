// بررسی وضعیت فیلدهای صفحهٔ ورود
import { chromium } from '/tmp/cabinet-nm/node_modules/playwright-core/index.mjs'
import crypto from 'node:crypto'

const SALT = '5f4dcc3b5aa765d61d8327deb882cf99'
const HASH = crypto.pbkdf2Sync('1111', Buffer.from(SALT, 'hex'), 120000, 32, 'sha256').toString('hex')
const ADMIN_ROW = [{ id: 'lock', name: 'admin', legacy: true, hash: HASH, salt: SALT, iter: 120000, alg: 'pbkdf2' }]

const browser = await chromium.launch({ executablePath: process.env.AGENT_BROWSER_EXECUTABLE_PATH, args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR' })
await ctx.route('**/ktd-api.itsfordecosahand.workers.dev/**', (route) => {
  const req = route.request()
  const u = req.url()
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: b })
  if (u.includes('/api/lock')) return json(JSON.stringify(req.method() === 'GET' ? ADMIN_ROW : { ok: true }))
  if (u.includes('/api/dump')) return json(JSON.stringify(req.method() === 'GET'
    ? { tables: { checks: [], expenses: [], allocations: [], debts: [], transactions: [], settings: [], meta: [{ id: 'main', savedAt: Date.now() }] } }
    : { ok: true }))
  return json(JSON.stringify({ ok: true }))
})

const page = await ctx.newPage()
page.on('pageerror', e => console.log('[pageerror]', e.message, '\n', e.stack))
await page.goto('http://localhost:4175/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(2000)

console.log(await page.evaluate(() => {
  const out = []
  for (const i of document.querySelectorAll('input')) {
    const r = i.getBoundingClientRect()
    const cs = getComputedStyle(i)
    out.push({ id: i.id, ph: i.placeholder, rect: [r.x, r.y, r.width, r.height], display: cs.display, vis: cs.visibility, op: cs.opacity, dis: i.disabled, ro: i.readOnly })
  }
  // والدین
  const p = document.getElementById('lk-pass')
  let chain = []
  let n = p
  while (n && n !== document.documentElement) {
    const cs = getComputedStyle(n)
    chain.push(`${n.tagName}.${n.className} disp=${cs.display} vis=${cs.visibility} op=${cs.opacity} rect=${JSON.stringify(n.getBoundingClientRect())}`)
    n = n.parentElement
  }
  return { inputs: out, chain, rootChildren: Array.from(document.body.children).map(c => `${c.tagName}#${c.id}.${c.className}`) }
}))
await browser.close()
