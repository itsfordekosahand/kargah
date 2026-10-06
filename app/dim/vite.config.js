import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // مسیرهای بایلد باید نسبی باشند تا dist روی هر مسیری (زیرپوشهٔ استاتیک) سرو شود
  base: './',
  plugins: [vue()],
  build: { target: 'es2020' }
})
