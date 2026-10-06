import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'

import App from './App.vue'
// ترتیب مهم است: CSS مبدأ اول، سپس افزوده‌های نسخهٔ Vue (override ها)
import './modules/maldi/styles/maldi.css'
import './modules/maldi/styles/maldi-vue.css'
import './styles-app.css'

// قرارداد داده/فایل‌های مشترک — همان ترتیب بارگذاری index.html مبدأ:
//   lock.js و sync.js قبل از mount؛ Chart.js از /vendor/chart.umd.js
import { KTD_SYNC } from './modules/maldi/core/sync.js'
import './modules/maldi/core/lock.js'

const app = createApp(App)
app.use(createPinia())
// PrimeVue 4: ToastService یک آبجکت { install } است، نه کارخانه —
// `ToastService()` باعث «e0 is not a function» و mount نشدن اپ می‌شد.
app.use(ToastService)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: { darkModeSelector: false, cssLayer: false }
  },
  ripple: true
})

// پیکربندی سراسری Chart.js — عیناً از index.html مبدأ (خطوط ۳۰۱–۳۰۴)
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#A0A0A0'
  Chart.defaults.borderColor = '#2A2A2A'
  Chart.defaults.font.family = 'Vazirmatn'
  Chart.defaults.plugins.tooltip.backgroundColor = '#1A1A1A'
  Chart.defaults.plugins.tooltip.titleColor = '#FFFFFF'
  Chart.defaults.plugins.tooltip.bodyColor = '#FFFFFF'
  Chart.defaults.plugins.tooltip.borderColor = '#2A2A2A'
  Chart.defaults.plugins.tooltip.borderWidth = 1
  Chart.defaults.plugins.tooltip.padding = 10
}

// ترتیب مبدأ (index.html خطوط ۱۳۷۹–۱۳۸۴): boot() → mount → start()
// اینجا start() عمداً قبل از mount است: هوک setItem در start نصب می‌شود و
// باید پیش از اولین saveData (که در setup اپ اجرا می‌شود) فعال باشد تا رفتار
// صف push/mountSig با مبدأ یکسان بماند.
Promise.resolve()
  .then(() => KTD_SYNC.boot())
  .catch((e) => { console.warn('[ktd-sync] boot error', e) })
  .then(() => {
    KTD_SYNC.start()
    app.mount('#root')
  })
