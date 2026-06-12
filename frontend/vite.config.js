import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/ask':      { target: BACKEND, changeOrigin: true },
      '/upload':   { target: BACKEND, changeOrigin: true },
      '/files':    { target: BACKEND, changeOrigin: true },
      '/clear':    { target: BACKEND, changeOrigin: true },
      '/status':   { target: BACKEND, changeOrigin: true },
      '/stats':    { target: BACKEND, changeOrigin: true },
      '/admin':    { target: BACKEND, changeOrigin: true },
      '/agent':    { target: BACKEND, changeOrigin: true },
      '/chroma':   { target: BACKEND, changeOrigin: true },
      '/sessions': { target: BACKEND, changeOrigin: true },
      '/memory':   { target: BACKEND, changeOrigin: true },
      '/chat':     { target: BACKEND, changeOrigin: true },
    }
  }
})
