import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { SITE_URL } from './src/config/site'
import { TENKI_UPSTREAM_HEADERS } from './src/config/tenkiUpstreamHeaders'

/**
 * 不用 http-proxy 转发 tenki：浏览器对 localhost 的 Sec-Fetch / Cookie 等会被原样带给上游，易 403。
 * 开发环境由 Node fetch 按固定头直连 tenki.jp。
 */
function tenkiDevUpstreamPlugin(): Plugin {
  return {
    name: 'tenki-dev-upstream-fetch',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const u = req.url ?? ''
        if (!u.startsWith('/tenki-fetch')) {
          next()
          return
        }
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        const pathAndQuery = u.slice('/tenki-fetch'.length) || '/'
        const upstream = `https://tenki.jp${pathAndQuery}`
        try {
          const r = await fetch(upstream, {
            method: req.method,
            redirect: 'follow',
            headers: { ...TENKI_UPSTREAM_HEADERS },
          })
          const ct = r.headers.get('content-type') ?? 'text/html; charset=utf-8'
          res.statusCode = r.status
          res.setHeader('Content-Type', ct)
          if (req.method === 'HEAD') {
            res.end()
            return
          }
          const buf = Buffer.from(await r.arrayBuffer())
          res.end(buf)
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(e instanceof Error ? e.message : String(e))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tenkiDevUpstreamPlugin(),
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
      '/moji-fetch': {
        target: 'https://tianqi.moji.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/moji-fetch/, ''),
      },
      '/cma-fetch': {
        target: 'https://weather.cma.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cma-fetch/, ''),
      },
      '/hbt-fetch': {
        target: 'http://wechat.hbt7.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hbt-fetch/, ''),
      },
      '/nws-mapclick': {
        target: 'https://forecast.weather.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nws-mapclick/, ''),
      },
      '/kma-fetch': {
        target: 'https://www.weather.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kma-fetch/, ''),
      },
      // 不代理 /api：vercel dev 时由本地 serverless 处理；pnpm run dev 时需用 dev:full 测试 API
      // '/api': { target: SITE_URL, changeOrigin: true },
    },
  },
})
