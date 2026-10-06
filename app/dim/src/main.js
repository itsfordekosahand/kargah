import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'
import App from './App.vue'
import './modules/cabinet-dimensions/styles/cabinet-dimensions.css'
import './styles-app.css'

const app = createApp(App)
app.use(createPinia())
app.use(ToastService)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: { darkModeSelector: '.cd-dark', cssLayer: false }
  },
  ripple: true
})
app.mount('#app')
