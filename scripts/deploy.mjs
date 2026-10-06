/**
 * دپلوی کامل — همان «یک کلیک».
 *
 *   ۱) بیلد همه‌چیز (لانچر + سه ماژول → assets/)
 *   ۲) ساخت/به‌روزرسانی دیتابیس‌ها (idempotent — هر بار امن)
 *   ۳) انتشار Worker + assets
 *
 * اجرای محلی:            npm run deploy        (نیاز به wrangler login)
 * اجرای با دکمهٔ گیت‌هاب: Deploy to Cloudflare  (اتورایز خودِ دکمه)
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, args) {
  console.log(`\n▸ ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) {
    console.error(`✖ ناموفق: ${cmd} ${args.join(' ')}`)
    process.exit(r.status || 1)
  }
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

run('node', ['scripts/build.mjs'])
run(npx, ['wrangler', 'd1', 'execute', 'kargah-anbar', '--file', 'schema/anbar.sql', '--remote'])
run(npx, ['wrangler', 'd1', 'execute', 'kargah-ktd', '--file', 'schema/ktd.sql', '--remote'])
run(npx, ['wrangler', 'deploy'])

console.log('\n✔ دپلوی کامل شد.')
