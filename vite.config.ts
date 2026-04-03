import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { SITE_URL } from './src/config/site'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'inject-site-config',
      transformIndexHtml(html) {
        return html.replace(/\{\{SITE_URL\}\}/g, SITE_URL)
      },
    },
  ],
  server: {
    proxy: {
      '/aviation-weather': {
        target: 'https://aviationweather.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/aviation-weather/, ''),
      },
      '/polymarket-gamma': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/polymarket-gamma/, ''),
      },
      '/polymarket-clob': {
        target: 'https://clob.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/polymarket-clob/, ''),
      },
      '/hko-wxinfo': {
        target: 'https://www.weather.gov.hk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hko-wxinfo/, '/wxinfo'),
      },
      // 不代理 /api：vercel dev 时由本地 serverless 处理；pnpm run dev 时需用 dev:full 测试 API
      // '/api': { target: SITE_URL, changeOrigin: true },
    },
  },
})
