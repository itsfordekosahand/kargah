import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: { target: 'es2020' },
  preview: { port: 4174, host: '127.0.0.1', strictPort: true }
})
