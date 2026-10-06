import { chromium } from '/tmp/cabinet-nm/node_modules/playwright-core/index.mjs'
const t0 = Date.now()
const browser = await chromium.launch({ executablePath: process.env.AGENT_BROWSER_EXECUTABLE_PATH, args: ['--no-sandbox'] })
console.log('launch ms', Date.now() - t0)
const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } })
const page = await ctx.newPage()
const t1 = Date.now()
try {
  await page.goto('http://localhost:4175/', { waitUntil: 'domcontentloaded', timeout: 120000 })
  console.log('goto ms', Date.now() - t1, 'title=', await page.title())
} catch (e) { console.log('goto FAILED after', Date.now() - t1, e.message.split('\n')[0]) }
await browser.close()
