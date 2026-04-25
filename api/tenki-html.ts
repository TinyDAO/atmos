/**
 * 服务端代拉 tenki.jp 预报 HTML（浏览器式 UA / Referer），避免 Vercel rewrite 出站被 WAF 403。
 * 仅允许 https://*.tenki.jp 下含 /forecast/ 的路径，防止开放代理。
 */

import { TENKI_UPSTREAM_HEADERS } from '../src/config/tenkiUpstreamHeaders'

function parseAllowedTenkiUrl(raw: string | null): URL | null {
  if (!raw || typeof raw !== 'string') return null
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== 'https:') return null
  if (u.hostname !== 'tenki.jp' && !u.hostname.endsWith('.tenki.jp')) return null
  if (!u.pathname.includes('/forecast/')) return null
  return u
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }

    const reqUrl = new URL(request.url)
    const tenki = parseAllowedTenkiUrl(reqUrl.searchParams.get('url'))
    if (!tenki) {
      return new Response(JSON.stringify({ error: 'Invalid or disallowed url parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const upstream = tenki.toString()
    try {
      const res = await fetch(upstream, {
        redirect: 'follow',
        headers: { ...TENKI_UPSTREAM_HEADERS },
      })

      const body = await res.arrayBuffer()
      const ct = res.headers.get('content-type') ?? 'text/html; charset=utf-8'
      return new Response(body, {
        status: res.status,
        headers: {
          'Content-Type': ct,
          'Cache-Control': 'public, max-age=120, s-maxage=120',
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
}
