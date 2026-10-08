/**
 * بیلد یکپارچه — همه‌چیز را می‌سازد و در assets/ جمع می‌کند.
 *
 *   app/launcher/*  → assets/            (لانچر: index.html، sw.js، آیکن‌ها…)
 *   app/fin/dist/*  → assets/fin/        (ماژول مالی)
 *   app/anbar/dist/*→ assets/anbar/      (ماژول انبار)
 *   app/dim/dist/*  → assets/dim/        (ماژول ابعاد/آنالیز)
 *
 * هر ماژول خودش Vite دارد؛ این اسکریپت فقط build+کپی می‌کند.
 * هم محلی (`npm run build`) و هم روی Cloudflare (قبل از deploy) اجرا می‌شود.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = path.join(ROOT, 'assets')

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) {
    console.error(`\n✖ دستور ناموفق: ${cmd} ${args.join(' ')}`)
    process.exit(r.status || 1)
  }
}

// assets/ همیشه از نو ساخته می‌شود تا فایل حذف‌شده از ماژول در خروجی نماند
rmSync(ASSETS, { recursive: true, force: true })
mkdirSync(ASSETS, { recursive: true })

// ۱) لانچر — فایل‌های ایستا بدون هیچ بیلدی
const launcher = path.join(ROOT, 'app', 'launcher')
if (existsSync(launcher)) {
  cpSync(launcher, ASSETS, { recursive: true })
  console.log('✓ لانچر → assets/')
} else {
  console.warn('! app/launcher پیدا نشد — لانچر کپی نشد')
}

// ۲) هر ماژول: نصب وابستگی (در صورت نیاز) + بیلد + کپی
const MODULES = ['fin', 'anbar', 'dim']
for (const name of MODULES) {
  const dir = path.join(ROOT, 'app', name)
  if (!existsSync(dir)) {
    console.warn(`! app/${name} پیدا نشد — رد شد`)
    continue
  }
  const nm = path.join(dir, 'node_modules')
  // ماژول استاتیک (مثلاً «آنالیز» که تک‌فایل شده): بدون Vite — همان پوشه مستقیم کپی می‌شود
  if (!existsSync(path.join(dir, 'vite.config.js'))) {
    console.log(`… استاتیک ${name} (بدون بیلد)`)
    cpSync(dir, path.join(ASSETS, name), {
      recursive: true,
      filter: (src) => path.basename(src) !== 'node_modules'
    })
    console.log(`✓ ${name} → assets/${name}/`)
    continue
  }
  if (!existsSync(nm)) {
    console.log(`… npm install (${name})`)
    run('npm', ['install', '--no-audit', '--no-fund'], dir)
  }
  console.log(`… بیلد ${name}`)
  run('npm', ['run', 'build'], dir)
  cpSync(path.join(dir, 'dist'), path.join(ASSETS, name), { recursive: true })
  console.log(`✓ ${name} → assets/${name}/`)
}

console.log('\n✔ بیلد کامل شد: assets/')
