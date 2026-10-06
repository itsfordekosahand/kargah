/**
 * نقطهٔ ورود اپ انبار — Vue 3 + Pinia + PrimeVue.
 * ترتیب بارگذاری استایل: متغیرهای تم → CSS اصلی → استایل سینک ابری.
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

import './modules/anbar/styles/anbar.css'
import './modules/anbar/styles/sync-indicator.css'

import App from './App.vue'
import { useAnbarStore } from './modules/anbar/store/anbar.js'
import { initPwa } from './modules/anbar/management/pwa.js'

const app = createApp(App)
app.use(createPinia())
app.use(PrimeVue, {
  ripple: false,
  theme: {
    preset: Aura,
    options: { darkModeSelector: '[data-theme="dark"]', cssLayer: false }
  }
})

app.mount('#app')

const store = useAnbarStore()

// تم ذخیره‌شده — لاین 67 اسکریپت قدیمی
let saved = 'dark'
try { saved = localStorage.getItem('kargah_theme') || 'dark' } catch (_) {}
store.setTheme(saved)

// قفل/باز شدن صفحهٔ lock — لاین 2541-2542
window.addEventListener('decor:unlocked', () => { try { store.loadFromLocalStorage() } catch (e) {} })
window.addEventListener('decor:locked', () => {})

store.boot()

initPwa({ onToast: (msg, type) => store.toast(msg, type) })
