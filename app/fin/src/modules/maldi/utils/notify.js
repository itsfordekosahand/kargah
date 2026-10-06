/**
 * پل Toast بین Pinia و PrimeVue.
 * PrimeVue useToast فقط در setup کامپوننت قابل فراخوانی است؛ بنابراین App.vue
 * هندلر را اینجا ثبت می‌کند و store/کامپوننت‌ها از notify استفاده می‌کنند.
 * رفتار مبدأ: پیام ۳ ثانیه‌ای با دکمه بستن.
 */
let handler = null

export function setToastHandler(fn) {
  handler = fn
}

export function notify(message) {
  if (typeof message === 'string' && message === '') return
  if (handler) handler(message)
  else console.log('[toast]', message)
}
