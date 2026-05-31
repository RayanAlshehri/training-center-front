import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: 'node_modules/.vite-codex',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7122',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
