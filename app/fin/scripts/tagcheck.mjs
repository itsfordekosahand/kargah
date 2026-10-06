
import fs from 'node:fs'
const src = fs.readFileSync(process.argv[2], 'utf8')
const tpl = src.slice(src.indexOf('<template>')+10, src.lastIndexOf('</template>'))
const lines = tpl.split('\n')
const VOID = new Set(['br','hr','img','input','meta','link','source','track','area','base','col','embed','param','wbr' ])
const stack = []
let lineNo = 0
// scan tags preserving line numbers
const re = /<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g
let m, offset = 0
const lineAt = (pos) => { const before = tpl.slice(0,pos); return before.split('\n').length }
while ((m = re.exec(tpl))) {
  const tag = m[1]
  const isClose = m[0][1] === '/'
  const selfClose = /\/>$/.test(m[0])
  const ln = lineAt(m.index)
  if (isClose) {
    const top = stack.pop()
    if (!top || top.tag !== tag) console.log('MISMATCH line', ln, 'closing', tag, 'but open was', top && top.tag, 'opened at line', top && top.line)
  } else {
    if (VOID.has(tag) || selfClose) continue
    stack.push({ tag, line: ln })
  }
}
console.log('UNCLOSED:', stack.map(s=>s.tag+'@'+s.line).join(', ') || 'none')
