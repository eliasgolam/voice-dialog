import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // allow importing from workspace root (e.g. src/dialog/controller)
      allow: ['..', '../..', '../../src']
    },
    proxy: {
      '/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/openai/, ''),
        configure: proxy => {
          proxy.on('proxyReq', req => {
            const key = process.env.OPENAI_API_KEY
            if (key) req.setHeader('Authorization', `Bearer ${key}`)
          })
        }
      }
    }
  }
})


