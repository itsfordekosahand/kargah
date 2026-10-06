import fs from 'node:fs'

const SRC = '/tmp/kargah/x/kargah-super-main/public/fin/index.html'
const OUT = '/data/.hermes/cache/scratch/kargah-migrate/fin-app/src/modules/maldi/utils/icons.js'
const lines = fs.readFileSync(SRC, 'utf8').split('\n')

// خطوط 476 تا 499 (1-based) = شیء Icons در کد مبدأ
const block = lines.slice(475, 499).join('\n')
const start = block.indexOf('const Icons={')
if (start < 0) throw new Error('Icons block not found')
const body = block.slice(start + 'const Icons={'.length).replace(/}\s*;?\s*$/, '')

const re = /([A-Za-z0-9_]+):\s*(<svg[\s\S]*?<\/svg>)/g
const entries = []
let m
while ((m = re.exec(body)) !== null) {
  const svg = m[2].replace(/className=/g, 'class=').replace(/strokeWidth=/g, 'stroke-width=')
  entries.push({ name: m[1], svg })
}
if (entries.length < 20) throw new Error('too few icons: ' + entries.length)
for (const e of entries) {
  if (!e.svg.startsWith('<svg') || !e.svg.endsWith('</svg>')) throw new Error('bad svg: ' + e.name)
}

const code = `/**
 * آیکونهای SVG ماژول مالی — عیناً از index.html مبدأ (JSX) استخراج شده‌اند
 * و فقط className -> class و strokeWidth -> stroke-width تبدیل شده است.
 * استفاده: <span class="ico" v-html="ICONS.dashboard"></span>
 */
export const ICONS = {
${entries.map((e) => `  ${e.name}: ${JSON.stringify(e.svg)},`).join('\n')}
}

export default ICONS
`
fs.writeFileSync(OUT, code)
console.log('icons written:', entries.length, 'bytes:', code.length)
console.log(entries.map((e) => e.name).join(', '))
