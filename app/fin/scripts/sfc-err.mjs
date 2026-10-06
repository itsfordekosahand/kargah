
import fs from 'node:fs'
import { parse } from '@vue/compiler-sfc'
const f = process.argv[2]
const src = fs.readFileSync(f, 'utf8')
const { errors } = parse(src, { filename: f })
for (const e of errors) {
  console.log(e.message, '=>', JSON.stringify(e.loc && { line: e.loc.start.line, column: e.loc.start.column, source: e.loc.source }))
}
