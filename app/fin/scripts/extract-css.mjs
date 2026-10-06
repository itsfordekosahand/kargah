// استخراج بلوک CSS از index.html مبدأ (خطوط 15..278) → src/modules/maldi/styles/maldi.css
import fs from 'node:fs'

const SRC = '/tmp/kargah/x/kargah-super-main/public/fin/index.html'
const OUT = '/data/.hermes/cache/scratch/kargah-migrate/fin-app/src/modules/maldi/styles/maldi.css'

const src = fs.readFileSync(SRC, 'utf8').split('\n')
const css = src.slice(14, 278).join('\n').trim()

if (!css.includes(':root')) throw new Error('css block looks wrong: ' + css.slice(0, 80))
if (!css.endsWith('}')) throw new Error('css block does not end with }: ...' + css.slice(-80))
if (css.startsWith('<style>') || css.includes('</style>')) throw new Error('style tags leaked into css')

const header = `/**
 * استایل ماژول «مالی» — عیناً از بلوک <style> کد مبدأ (index.html خطوط ۱۵–۲۷۸) استخراج شده است.
 * تغییرات عمداً در انتهای همین فایل اعمال شده‌اند (بخش «اصلاحات موبایل-فیرست و سازگاری PrimeVue»).
 */\n`

fs.writeFileSync(OUT, header + css + '\n')
console.log('css bytes', css.length, 'lines', css.split('\n').length)
