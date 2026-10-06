
import fs from 'node:fs'
import { parse } from '@vue/compiler-sfc'
const f = 'src/modules/maldi/ui/pages/Dashboard.vue'
const src = fs.readFileSync(f, 'utf8')
const lines = src.split('\n')
// template body lines are 0-indexed 1..103 (file lines 2..104 => indices 1..103)
const tplStart = 1, tplEnd = 102 // index of '</template>' line is 103
const body = lines.slice(tplStart, tplEnd) // inside <template>...</template> (excludes both)
// root div is body[0] ('  <div>') and last line '  </div>'
const inner = body.slice(1, -1)
// split inner into top-level chunks by indentation (4 spaces)
const chunks = []
let cur = []
for (const l of inner) {
  if (/^    <(\/)/.test(l) && cur.length && !/^    <\//.test(cur[0])) { chunks.push(cur); cur = [l] }
  else if (/^    <[a-zA-Z]/.test(l) && !/^    <\//.test(l) && cur.length && /^    <\//.test(cur[cur.length-1])) { chunks.push(cur); cur = [l] }
  else cur.push(l)
}
if (cur.length) chunks.push(cur)
console.log('chunks:', chunks.length, chunks.map(c=>c[0].trim().slice(0,40)))
for (let i=0;i<chunks.length;i++) {
  const test = ['<template>', '  <div>', ...chunks[i], '  </div>', '</template>', '<script setup></script>'].join('\n')
  const { errors } = parse(test, { filename: 't.vue' })
  console.log(i, chunks[i][0].trim().slice(0,50), '=>', errors.length ? 'ERR ' + errors.map(e=>e.message).join('|') : 'OK')
}
