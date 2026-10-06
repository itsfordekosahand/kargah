
import fs from 'node:fs'
import path from 'node:path'
const ROOT = process.cwd() + '/src'
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const abs = path.join(d, e.name)
    if (e.isDirectory()) walk(abs, out)
    else if (/\.(vue|js|mjs)$/.test(e.name)) out.push(abs)
  }
  return out
}
let bad = 0
for (const f of walk(ROOT)) {
  const src = fs.readFileSync(f, 'utf8')
  const re = /from\s+['"](\.{1,2}\/[^'"]+)['"]|import\s+['"](\.{1,2}\/[^'"]+)['"]/g
  let m
  while ((m = re.exec(src))) {
    const spec = m[1] || m[2]
    const target = path.resolve(path.dirname(f), spec)
    const ok = fs.existsSync(target) || fs.existsSync(target + '.js') || fs.existsSync(target + '.vue') || fs.existsSync(path.join(target, 'index.js'))
    if (!ok) { console.log('MISSING', path.relative(process.cwd(), f), '->', spec); bad++ }
  }
}
console.log(bad ? `${bad} missing imports` : 'all imports resolve')
process.exit(bad ? 1 : 0)
