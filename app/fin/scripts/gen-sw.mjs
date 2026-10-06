/**
 * تولید service worker با precache کامل دارایی‌ها (الگوی cabinet-app).
 * بعد از `vite build` اجرا می‌شود و فهرست دقیق فایل‌های dist را در sw.js
 * می‌نویسد تا حالت آفلاین کامل (با رفرش) کار کند.
 *
 * اجرا: node scripts/gen-sw.mjs   (بسته به npm run build)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const CACHE = 'decor-fin-v1'

if (!fs.existsSync(DIST)) {
  console.error('dist پیدا نشد؛ اول `vite build` را اجرا کنید.')
  process.exit(1)
}

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, base, out)
    else out.push('./' + path.relative(base, abs).split(path.sep).join('/'))
  }
  return out
}

const files = walk(DIST)
  .filter(f => f !== './sw.js')
  .sort()
// شل اولیه: index.html همیشه باید باشد تا fallback برقرار بماند
const shell = ['./', ...files.filter(f => f !== './')]

const tpl = `/* Service worker for the «مالی» module — offline-first with a generated precache list.
   Rفتارِ ناوبری عیناً مثل sw.js مبدأ: HTML همیشه network-first (تا آخرین استقرار
   دیده شود) و فقط وقتی شبکه نیست از کش برمی‌گردد؛ دارایی‌های same-origin
   (اسکریپت/استایل/فونت) cache-first. اگر همه‌چیز cache-first بود، رفرش با
   نسخهٔ کهنهٔ index.html بالا می‌آمد و فایل اسکریپتِ هشِ جدید precache نشده
   بود؛ اگر fallback به index.html برای همهٔ درخواست‌ها بود (نسخهٔ قبل این
   فایل)، در حالت آفلاین اسکریپت ماژول با MIME اشتباه text/html برمی‌گشت و
   اپ بالا نمی‌آمد. */
const CACHE = ${JSON.stringify(CACHE)}
const SHELL = ${JSON.stringify(shell, null, 2)}
const ASSET = new Set(SHELL.filter((u) => !/\\.(html)$/.test(u) && u !== './').map((u) => new URL(u, self.location.href).pathname))

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => fetch(u, { cache: 'reload' }).then((r) => (r && r.ok) ? c.put(u, r) : null))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k.startsWith('decor-fin')).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  // ناوبری: اول شبکه، fallback به کش (مثل مبدأ)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./').then((r) => r || Response.error())))
    )
    return
  }

  // سایر دارایی‌های پوسته: اول کش، سپس شبکه. fallback به HTML ممنوع.
  // نکته: تطبیق کش با URL انجام می‌شود نه با شیء Request — چون سرور
  // (vite preview) هدر Vary: Origin می‌فرستد و تطبیق با Vary برای درخواست
  // ماژول (mode=cors) هرگز به رکورد کش‌شده نمی‌رسید (script/css در حالت
  // آفلاین با ERR_FAILED می‌افتادند).
  if (!ASSET.has(url.pathname)) return
  e.respondWith(
    caches.match(url.pathname, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(url.pathname, copy))
      }
      return res
    }))
  )
})
`

fs.writeFileSync(path.join(DIST, 'sw.js'), tpl)
console.log(`sw.js نوشته شد — ${shell.length} دارایی precache شد (کش ${CACHE})`)
