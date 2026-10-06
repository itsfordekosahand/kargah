
import fs from 'node:fs'
function dedent(s) { return s.split('\n').map(l => l.replace(/^ {2}/, '')).join('\n') }
const raw = fs.readFileSync('/tmp/kargah/x/kargah-super-main/public/fin/sync.js', 'utf8').split('\n')
const body = raw.filter((l, i) => i !== 16 && i !== 17 && l !== '})();')
const src = dedent(body.join('\n'))
const mine = fs.readFileSync(process.argv[2], 'utf8').split('\n')
  .filter(l => !/^import |^export /.test(l))
  .join('\n')
  .replace(/const KTD_SYNC = \{/, 'window.KTD_SYNC = {')
const norm = dedent(mine)
fs.writeFileSync('/tmp/sync-src.norm.js', src)
fs.writeFileSync('/tmp/sync-mine.norm.js', norm)
console.log('src lines', src.split('\n').length, 'mine lines', norm.split('\n').length)
