
import fs from 'node:fs'
import { parse } from '@vue/compiler-sfc'
const f = 'src/modules/maldi/ui/pages/Dashboard.vue'
const src = fs.readFileSync(f, 'utf8')
const lines = src.split('\n')
const tplOpen = lines.findIndex(l => l.trim() === '<template>')
const tplClose = lines.findIndex((l,i) => i > tplOpen && l.trim() === '</template>')
for (let i = tplOpen + 1; i < tplClose; i++) {
  const test = [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n')
  const { errors } = parse(test, { filename: 't.vue' })
  if (!errors.length) console.log('REMOVING line', i + 1, 'fixes it:', JSON.stringify(lines[i]))
}
console.log('done')
