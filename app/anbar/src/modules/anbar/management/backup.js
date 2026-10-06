/**
 * پشتیبان‌گیری و بازیابی — معادل exportBackup / exportHTML / openImportModal / doImport
 * (لاین‌های 1984-2131 اسکریپت قدیمی).
 */
import { KEY } from '../config/constants.js'

const stampDate = (d, withTime) => {
  const p = n => String(n).padStart(2, '0')
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  return withTime ? `${day}_${p(d.getHours())}-${p(d.getMinutes())}` : day
}

/** دانلود JSON — لاین 1984 */
export function exportBackup(store) {
  const data = {
    _meta: { app: 'kargah-anbar', version: 8, exportDate: new Date().toISOString() },
    tools: store.data.tools, sheets: store.data.sheets,
    hardware: store.data.hardware, templates: store.data.templates, jobs: store.data.jobs
  }
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    `anbar-backup-${stampDate(new Date(), true)}.json`)
  store.toast('فایل پشتیبان دانلود شد', 'ok')
}

/**
 * «ذخیره در خود فایل HTML» — لاین 2001.
 * BUG-2: نسخه قدیمی `${localStorage.key || 'kargah_anbar_v8'}` را جایگزین می‌کرد در حالی که
 * localStorage.key یک تابع است (کد منبع تابع داخل فایل می‌رفت). اینجا داده‌ها با یک
 * اسکریپت بذر (seed) داخل HTML قرار می‌گیرند تا با باز شدن فایل، localStorage پر شود.
 */
export function exportHTML(store) {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', window.location.href, false) // همان درخواست همزمان نسخه قدیمی
  xhr.send()
  if (xhr.status !== 200) {
    store.toast('خطا در خواندن فایل', 'dan')
    return
  }
  let html = xhr.responseText
  const payload = {
    tools: store.data.tools, sheets: store.data.sheets,
    hardware: store.data.hardware, templates: store.data.templates, jobs: store.data.jobs
  }
  const seed = `<script>window.__ANBAR_SEED__=${JSON.stringify(payload)};
try{localStorage.setItem(${JSON.stringify(KEY)},JSON.stringify({tools:__ANBAR_SEED__.tools,sheets:__ANBAR_SEED__.sheets,hardware:__ANBAR_SEED__.hardware,templates:__ANBAR_SEED__.templates,jobs:__ANBAR_SEED__.jobs,tombstones:{tools:{},sheets:{},hardware:{},templates:{},jobs:{}}}))}catch(e){}<\/script>`
  if (html.includes('</head>')) html = html.replace('</head>', seed + '</head>')
  else html = seed + html

  download(new Blob([html], { type: 'text/html' }), `anbar-${stampDate(new Date(), false)}.html`)
  store.toast('فایل HTML با داده‌ها دانلود شد', 'ok')
}

/** آمار محتوای فایل پشتیبان — لاین 2054 */
export function importStats(data) {
  return {
    tools: (data.tools || []).length,
    sheets: (data.sheets || []).length,
    hardware: (data.hardware || []).length,
    templates: (data.templates || []).length,
    jobs: (data.jobs || []).length
  }
}

/** خواندن فایل انتخاب‌شده و ساخت مودال بازیابی — لاین 2040 */
export function readBackupFile(store, file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result)
        if (!parsed || typeof parsed !== 'object') throw new Error('invalid')
        store.openModal('import', { pendingImport: parsed, importFileName: file.name, importMode: 'merge' })
        resolve(parsed)
      } catch (err) {
        store.toast('فایل نامعتبر است', 'dan')
        reject(err)
      }
    }
    r.onerror = () => reject(new Error('read error'))
    r.readAsText(file)
  })
}

function download(blob, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
