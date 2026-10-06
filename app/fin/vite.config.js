import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: { target: 'es2020' },
  preview: { port: 4175, strictPort: true }
})
