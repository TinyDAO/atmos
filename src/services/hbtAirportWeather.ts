/**
 * 湖北机场微信天气页 HTML 解析；逻辑与 `scripts/hbt.util.js` 对齐。
 * 开发 / 线上通过 `/hbt-fetch` 代理避免 CORS（见 vite.config.ts、vercel.json）。
 */

function rewriteHbtUrlForProxy(url: string): string {
  if (typeof window === 'undefined') return url
  try {
    const u = new URL(url)
    if (u.hostname === 'wechat.hbt7.com') {
      return `/hbt-fetch${u.pathname}${u.search}`
    }
  } catch {
    /* ignore */
  }
  return url
}

const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

export interface HbtDailyTempRange {
  minC: number | null
  maxC: number | null
  raw: string | null
}

/** 从机场天气页 HTML 解析 `<div class="temperature">11℃~17℃</div>` 或文末区间。 */
export function parseDailyTempRangeFromHtml(html: string): HbtDailyTempRange {
  if (typeof html !== 'string' || !html.trim()) {
    return { minC: null, maxC: null, raw: null }
  }

  const divMatch = html.match(
    /<div[^>]*\bclass\s*=\s*['"]temperature['"][^>]*>\s*([^<]+?)\s*<\/div>/i,
  )
  const rawFromDiv = divMatch ? divMatch[1]!.trim() : null

  const parsePair = (text: string): Pick<HbtDailyTempRange, 'minC' | 'maxC'> => {
    const m = text.match(/(-?\d+(?:\.\d+)?)\s*℃\s*[~～]\s*(-?\d+(?:\.\d+)?)\s*℃/u)
    if (!m) return { minC: null, maxC: null }
    const a = Number(m[1])
    const b = Number(m[2])
    if (!Number.isFinite(a) || !Number.isFinite(b)) return { minC: null, maxC: null }
    return { minC: Math.min(a, b), maxC: Math.max(a, b) }
  }

  if (rawFromDiv) {
    const pair = parsePair(rawFromDiv)
    if (pair.maxC !== null) return { ...pair, raw: rawFromDiv }
  }

  const tail = html.slice(Math.max(0, html.length - 8000))
  const re = /(-?\d+(?:\.\d+)?)\s*℃\s*[~～]\s*(-?\d+(?:\.\d+)?)\s*℃/gu
  let last: string | null = null
  for (const m of tail.matchAll(re)) last = m[0]!
  if (!last) return { minC: null, maxC: null, raw: null }
  const pair = parsePair(last)
  return { ...pair, raw: last }
}

export async function fetchHbtSearchWeatherHtml(
  pageUrl: string,
  init?: RequestInit
): Promise<string> {
  const url = rewriteHbtUrlForProxy(pageUrl)
  const res = await fetch(url, {
    ...init,
    headers: { ...DEFAULT_HEADERS, ...init?.headers },
  })
  if (!res.ok) {
    throw new Error(`HBT searchWeather HTTP ${res.status}: ${res.statusText}`)
  }
  return res.text()
}

/** 拉取页面并返回当日最高温（°C），失败抛错（由调用方 try/catch）。 */
export async function fetchHbtDailyHighCelsius(
  pageUrl: string,
  init?: RequestInit
): Promise<number | null> {
  const html = await fetchHbtSearchWeatherHtml(pageUrl, init)
  const { maxC } = parseDailyTempRangeFromHtml(html)
  return maxC
}
