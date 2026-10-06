
import fs from 'node:fs'
import { parse, compileTemplate } from '@vue/compiler-sfc'
const f = process.argv[2]
const src = fs.readFileSync(f, 'utf8')
const { descriptor, errors } = parse(src, { filename: f })
if (errors.length) { console.log('PARSE ERRORS', errors.map(e=>e.message)) }
if (descriptor.template) {
  const r = compileTemplate({ source: descriptor.template.content, filename: f, id: 'x' })
  console.log('compile errors:', r.errors.map(e => (e.loc ? `${e.loc.start.line}:${e.loc.start.column} ` : '') + (e.message || e)))
}
