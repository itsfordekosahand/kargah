/**
 * پشتیبان‌گیری/بازیابی — عیناً از index.html مبدأ (خطوط ۴۷۱–۴۷۴).
 *
 * تنها تفاوت نسخهٔ Vue با مبدأ (ثبت‌شده در BUGS.md):
 * exportHtml اکنون CSS/JS باندل را درون‌خط می‌کند، چون در مبدأ اسکریپت‌ها
 * درون‌خطی بودند و فایل خروجی مستقل باز می‌شد؛ در بیلد Vite اسکریپت‌ها
 * بیرونی و نسبی‌اند و بدون درون‌خط‌کردن، فایل خروجی اجرا نمی‌شد.
 */

export const downloadBlob = (content, filename, mime = 'application/octet-stream') => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const exportJson = (data) => {
  const withStamp = { ...data, _savedAt: Date.now() }
  downloadBlob(
    JSON.stringify(withStamp, null, 2),
    'checkYar-backup-' + new Date().toISOString().slice(0, 10) + '.json',
    'application/json;charset=utf-8'
  )
}

const inlineAssets = async (clone) => {
  const nodes = Array.from(clone.querySelectorAll('script[src],link[rel="stylesheet"]'))
  await Promise.all(
    nodes.map(async (el) => {
      try {
        const url = el.tagName === 'SCRIPT' ? el.src : el.href
        if (!url || url.indexOf('data:') === 0) return
        const res = await fetch(url)
        if (!res.ok) return
        const text = await res.text()
        if (el.tagName === 'SCRIPT') {
          const s = document.createElement('script')
          if (el.type) s.type = el.type
          s.textContent = text
          el.replaceWith(s)
        } else {
          const st = document.createElement('style')
          st.textContent = text
          el.replaceWith(st)
        }
      } catch (e) {
        /* اگر ممکن نشد همان لینک بیرونی می‌ماند */
      }
    })
  )
}

export const exportHtml = async (data) => {
  const withStamp = { ...data, _savedAt: Date.now() }
  const dataStr = JSON.stringify(withStamp).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
  const clone = document.documentElement.cloneNode(true)
  const rootEl = clone.querySelector('#root')
  if (rootEl) rootEl.innerHTML = ''
  const dataEl = clone.querySelector('#app-data')
  if (!dataEl) {
    alert('خطا')
    return
  }
  dataEl.textContent = dataStr
  await inlineAssets(clone)
  downloadBlob(
    '<!DOCTYPE html>\n' + clone.outerHTML,
    'checkYar-' + new Date().toISOString().slice(0, 10) + '.html',
    'text/html;charset=utf-8'
  )
}

export const parseImportFile = (file, onParsed) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result)
      if (!parsed || typeof parsed !== 'object') throw new Error('فرمت نامعتبر')
      onParsed(parsed)
    } catch (err) {
      alert('فایل نامعتبر: ' + err.message)
    }
  }
  reader.readAsText(file)
}
