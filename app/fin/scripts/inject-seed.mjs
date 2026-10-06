import fs from 'node:fs'

const D = '/data/.hermes/cache/scratch/kargah-migrate/fin-app'
const seed = fs.readFileSync('/tmp/fin-seed.json', 'utf8').trim()
JSON.parse(seed) // اعتبارسنجی
let h = fs.readFileSync(D + '/index.html', 'utf8')
if (!h.includes('<!--APP_DATA-->')) throw new Error('placeholder missing (already injected?)')
h = h.replace('<!--APP_DATA-->', '<script id="app-data" type="application/json">' + seed + '</script>')
fs.writeFileSync(D + '/index.html', h)
console.log('seed bytes', seed.length, 'index bytes', h.length)
