
import { compile } from '@vue/compiler-dom'
const cases = [
 'v => (form.dueDate = v)',
 'v => { startDate = v; page = 1 }',
 'typeFilter = $event.target.value; page = 1',
 'foo(); bar()',
 'setStartDate(v)'
]
for (const c of cases) {
  const r = compile(`<div @input="${c}"></div>`)
  const i = r.code.indexOf('onInput')
  console.log(JSON.stringify(c), '=>', r.code.slice(i, i+140).replace(/\n/g,' '))
}
