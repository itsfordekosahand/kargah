/**
 * PWA — ثبت service worker، درخواست نصب و پیام‌های اتصال.
 * معادل لاین‌های 2504-2536 اسکریپت قدیمی.
 */

let deferredInstallPrompt = null

export function initPwa({ onToast } = {}) {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()   // دکمهٔ خود اپ مسئول نصب است
    deferredInstallPrompt = e
  })

  window.addEventListener('offline', () => {
    onToast && onToast('آفلاین — تغییرات روی این دستگاه ذخیره و بعداً ارسال می‌شود', 'warn')
  })
  window.addEventListener('online', () => {
    onToast && onToast('اتصال برقرار شد — همگام‌سازی ادامه دارد', 'ok')
  })

  // ثبت SW فقط وقتی که بستر امن است (https یا لوکال). «127.0.0.1» هم مثل
  // localhost بستر امن محسوب می‌شود — وگرنه در پیش‌نمایش محلی اصلاً ثبت
  // نمی‌شد و حالت آفلاین هرگز تست نمی‌شد.
  const secure = location.protocol === 'https:' ||
    location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '[::1]'
  if ('serviceWorker' in navigator && secure) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service worker registered:', reg.scope))
        .catch(err => console.warn('Service worker failed:', err))
    })
  }
}

export function installPwa() {
  if (!deferredInstallPrompt) {
    return 'از منوی مرورگر گزینه «افزودن به صفحه اصلی» یا «نصب برنامه» را بزنید'
  }
  deferredInstallPrompt.prompt()
  deferredInstallPrompt.userChoice
    .then(() => { deferredInstallPrompt = null })
    .catch(() => {})
  return null
}
