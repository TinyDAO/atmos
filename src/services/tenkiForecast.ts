/**
 * tenki.jp 2 週間天気（10days.html）先頭 4 日 — 与 scripts/tenki.util.js 同源逻辑。
 * 浏览器经 `/tenki-fetch`（开发：Vite Node fetch）或 `/api/tenki-html`（生产）拉取。
 */

import { TENKI_UPSTREAM_HEADERS } from '../config/tenkiUpstreamHeaders'

const DAY_LABELS = ['today', 'tomorrow', 'in2Days', 'in3Days'] as const

/** 发往同域代理；勿带 Sec-* / Cookie（开发由 Vite 插件用 TENKI_UPSTREAM_HEADERS 直连上游） */
const DEFAULT_HEADERS: Record<string, string> = {
  Accept: TENKI_UPSTREAM_HEADERS.Accept,
  'Accept-Language': TENKI_UPSTREAM_HEADERS['Accept-Language'],
}

function rewriteTenkiUrlForProxy(url: string): string {
  if (typeof window === 'undefined') return url
  try {
    const u = new URL(url)
    if (u.hostname === 'tenki.jp' || u.hostname.endsWith('.tenki.jp')) {
      // 开发：Vite 代理改写出站头。生产：Vercel 对外 rewrite 易被 403，改走同域 API。
      if (import.meta.env.DEV) {
        return `/tenki-fetch${u.pathname}${u.search}`
      }
      return `/api/tenki-html?url=${encodeURIComponent(url)}`
    }
  } catch {
    /* ignore */
  }
  return url
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const decodeBasicEntities = (s: string): string =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))

const stripTags = (s: string): string => s.replace(/<[^>]+>/g, '')

const pad2 = (n: number): string => String(n).padStart(2, '0')

function parseMonthDayJa(daysInnerHtml: string): { m: number; d: number } | null {
  const t = stripTags(daysInnerHtml).trim()
  const m = t.match(/(\d{1,2})月(\d{1,2})日/)
  if (!m) return null
  return { m: Number(m[1]), d: Number(m[2]) }
}

function parseCelsiusFromCell(html: string): number | null {
  const t = decodeBasicEntities(html).replace(/[℃°]/g, '').trim()
  const m = t.match(/-?\d+(?:\.\d+)?/)
  return m ? toNumber(m[0]) : null
}

function parseMmFromCell(html: string): number | null {
  const t = decodeBasicEntities(html).replace(/\s/g, '').replace(/㎜/g, 'mm')
  const m = t.match(/(-?\d+(?:\.\d+)?)\s*mm/i)
  return m ? toNumber(m[1]) : null
}

function extractAnnounceYmd(html: string): string | null {
  const m = html.match(/forecast_announce_datetime"\s*:\s*"(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

function addCalendarDays(ymd: string, deltaDays: number): string {
  const [y, mo, d] = ymd.split('-').map(Number)
  const u = Date.UTC(y, mo - 1, d + deltaDays)
  const t = new Date(u)
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`
}

export interface TenkiForecastDay {
  label: string
  date: string
  minTemp: number | null
  maxTemp: number | null
  windDirection: string | null
  windSpeed: number | null
  weather: string | null
  humidity: number | null
  precipitation: number | null
}

const DAY_HEADER_RE =
  /<dd class="forecast10days-actab">\s*<div class="days">([\s\S]*?)<\/div>\s*<div class="forecast">[\s\S]*?<span class="forecast-telop">([^<]*)<\/span>[\s\S]*?<div class="temp"><span class="high-temp">([^<]*)<\/span><span class="low-temp">([^<]*)<\/span><\/div>\s*<div class="prob-precip">([^<]*)<\/div>\s*<div class="precip">([^<]*)<\/div>/g

function parseTenki10DayHeaders(html: string): Array<{
  daysHtml: string
  weather: string
  highHtml: string
  lowHtml: string
  probText: string
  precipHtml: string
}> {
  const rows: Array<{
    daysHtml: string
    weather: string
    highHtml: string
    lowHtml: string
    probText: string
    precipHtml: string
  }> = []
  const re = new RegExp(DAY_HEADER_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    rows.push({
      daysHtml: m[1],
      weather: decodeBasicEntities(m[2]).trim(),
      highHtml: m[3],
      lowHtml: m[4],
      probText: stripTags(m[5]).trim(),
      precipHtml: m[6],
    })
  }
  return rows
}

function assertTenkiForecastUrl(url: string): void {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    throw new Error('tenki: invalid URL')
  }
  if (!u.hostname.endsWith('tenki.jp') && u.hostname !== 'tenki.jp') {
    throw new Error('tenki: URL must be on tenki.jp')
  }
  if (!u.pathname.includes('/forecast/')) {
    throw new Error('tenki: URL path must include /forecast/')
  }
}

function toForecastRow(
  label: string,
  dateStr: string,
  maxC: number | null,
  minC: number | null,
  weather: string | null,
  precipitation: number | null
): TenkiForecastDay {
  return {
    label,
    date: dateStr,
    minTemp: minC,
    maxTemp: maxC,
    windDirection: null,
    windSpeed: null,
    weather,
    humidity: null,
    precipitation,
  }
}

export interface TenkiDailyResult {
  source: string
  forecast: TenkiForecastDay[]
}

/**
 * tenki.jp の 10days ページから先頭 4 日分（今日〜）を取得。
 */
export async function getTenkiDaily(
  url: string,
  init: RequestInit & { signal?: AbortSignal } = {}
): Promise<TenkiDailyResult> {
  assertTenkiForecastUrl(url)
  const fetchUrl = rewriteTenkiUrlForProxy(url)

  const res = await fetch(fetchUrl, {
    ...init,
    /** 避免把页面来源（localhost / 部署域）作为 Referer 带给上游，触发 tenki WAF */
    referrerPolicy: 'no-referrer',
    headers: { ...DEFAULT_HEADERS, ...init.headers },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`tenki fetch failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`)
  }

  const html = await res.text()
  const rows = parseTenki10DayHeaders(html)
  if (rows.length < 4) {
    throw new Error(
      'tenki: expected at least 4 daily rows (forecast10days-actab); check that the URL is a 10days / 2-week forecast page',
    )
  }

  const announceYmd = extractAnnounceYmd(html)
  const md0 = parseMonthDayJa(rows[0].daysHtml)
  if (!md0) {
    throw new Error('tenki: could not parse date from first forecast row')
  }

  let row0Ymd: string
  if (announceYmd) {
    const [ay, am, ad] = announceYmd.split('-').map(Number)
    if (am === md0.m && ad === md0.d) {
      row0Ymd = announceYmd
    } else {
      row0Ymd = `${ay}-${pad2(md0.m)}-${pad2(md0.d)}`
    }
  } else {
    const y = new Date().getUTCFullYear()
    row0Ymd = `${y}-${pad2(md0.m)}-${pad2(md0.d)}`
  }

  const picked = rows.slice(0, 4)
  const forecast = picked.map((row, i) => {
    const dateStr = addCalendarDays(row0Ymd, i)
    const maxC = parseCelsiusFromCell(row.highHtml)
    const minC = parseCelsiusFromCell(row.lowHtml)
    const precipMm = parseMmFromCell(row.precipHtml)
    const label = DAY_LABELS[i] ?? `day${i}`
    return toForecastRow(label, dateStr, maxC, minC, row.weather || null, precipMm)
  })

  return { source: fetchUrl, forecast }
}
