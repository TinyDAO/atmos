/**
 * Browser-side copy of scripts/cma.util.js — 中央气象台城市页 HTML 解析。
 * 开发 / 线上通过 /cma-fetch 代理避免 CORS（见 vite.config.ts、vercel.json）。
 */

function rewriteCmaUrlForProxy(url: string): string {
  if (typeof window === 'undefined') return url
  try {
    const u = new URL(url)
    if (u.hostname === 'weather.cma.cn') {
      return `/cma-fetch${u.pathname}${u.search}`
    }
  } catch {
    /* ignore */
  }
  return url
}

const DAY_LABELS = ['today', 'tomorrow', 'dayAfterTomorrow'] as const

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const toNumber = (value: unknown): number | null => {
  if (isNumber(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const pickNumber = (obj: Record<string, unknown> | null | undefined, keys: string[]): number | null => {
  if (!obj || typeof obj !== 'object') return null
  for (const key of keys) {
    const value = toNumber(obj[key])
    if (value !== null) return value
  }
  return null
}

const pickString = (obj: Record<string, unknown> | null | undefined, keys: string[]): string | null => {
  if (!obj || typeof obj !== 'object') return null
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

const detectDailyArray = (data: unknown): unknown[] | null => {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if (Array.isArray(o.daily)) return o.daily
  if (Array.isArray(o.forecastday)) return o.forecastday
  if (Array.isArray(o.forecasts)) return o.forecasts
  if (Array.isArray(o.days)) return o.days
  if (Array.isArray((o.result as Record<string, unknown>)?.daily))
    return (o.result as { daily: unknown[] }).daily
  if (Array.isArray((o.data as Record<string, unknown>)?.daily))
    return (o.data as { daily: unknown[] }).daily
  if (Array.isArray((o.data as Record<string, unknown>)?.forecast))
    return (o.data as { forecast: unknown[] }).forecast
  if (Array.isArray((o.forecast as Record<string, unknown>)?.forecastday))
    return (o.forecast as { forecastday: unknown[] }).forecastday
  if (Array.isArray((o.weather as Record<string, unknown>)?.daily))
    return (o.weather as { daily: unknown[] }).daily
  return null
}

const extractInnerHtmlById = (html: string, id: string): string | null => {
  const needle = `id="${id}"`
  const start = html.indexOf(needle)
  if (start === -1) return null
  const open = html.lastIndexOf('<div', start)
  if (open === -1) return null
  const openEnd = html.indexOf('>', open)
  if (openEnd === -1) return null
  let i = openEnd + 1
  let depth = 1
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', i)
    const nextClose = html.indexOf('</div>', i)
    if (nextClose === -1) return null
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1
      i = nextOpen + 4
    } else {
      depth -= 1
      i = nextClose + 6
    }
  }
  return html.slice(openEnd + 1, i - 6)
}

const extractPullLeftDayColumns = (dayListInner: string): string[] => {
  const columns: string[] = []
  const prefix = 'pull-left day'
  let pos = 0
  while (pos < dayListInner.length) {
    const idx = dayListInner.indexOf(prefix, pos)
    if (idx === -1) break
    const blockStart = dayListInner.lastIndexOf('<div', idx)
    if (blockStart === -1 || blockStart < pos) break
    if (!dayListInner.slice(blockStart, idx + 40).includes('pull-left day')) {
      pos = idx + 1
      continue
    }
    const openEnd = dayListInner.indexOf('>', blockStart)
    if (openEnd === -1) break
    let i = openEnd + 1
    let depth = 1
    while (i < dayListInner.length && depth > 0) {
      const nextOpen = dayListInner.indexOf('<div', i)
      const nextClose = dayListInner.indexOf('</div>', i)
      if (nextClose === -1) break
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1
        i = nextOpen + 4
      } else {
        depth -= 1
        i = nextClose + 6
      }
    }
    columns.push(dayListInner.slice(openEnd + 1, i - 6))
    pos = i
  }
  return columns
}

const parseWindLevelText = (text: string | null | undefined): number | null => {
  if (!text || typeof text !== 'string') return null
  const level = text.match(/(\d+(?:\.\d+)?)\s*级/)
  if (level) return toNumber(level[1])
  return null
}

export interface CmaPageForecastDay {
  label: string
  date: string | null
  minTemp: number | null
  maxTemp: number | null
  windDirection: string | null
  windSpeed: number | null
  weather: string | null
  humidity: number | null
  precipitation: number | null
}

export interface CmaPageWeatherResult {
  source: string
  forecast: CmaPageForecastDay[]
}

const parseCmaHtmlForecast = (html: string): CmaPageForecastDay[] | null => {
  if (typeof html !== 'string' || !html.includes('weather.cma.cn')) return null

  const pubMatch = html.match(/7天天气预报（(\d{4})\/(\d{2})\/(\d{2})/)
  const year = pubMatch ? pubMatch[1] : String(new Date().getFullYear())

  const dayListInner = extractInnerHtmlById(html, 'dayList')
  if (!dayListInner) return null

  const columns = extractPullLeftDayColumns(dayListInner)
  if (columns.length < 3) return null

  const forecast: CmaPageForecastDay[] = []
  for (let i = 0; i < 3; i += 1) {
    const fragment = columns[i]
    const label = DAY_LABELS[i]

    const dateMatch = fragment.match(
      /<div class="day-item">\s*([^<]+)<br>\s*(\d{1,2}\/\d{1,2})\s*<\/div>/,
    )
    let date: string | null = null
    if (dateMatch) {
      const [, , mmdd] = dateMatch
      const parts = mmdd.split('/')
      if (parts.length === 2) {
        const mm = parts[0].padStart(2, '0')
        const dd = parts[1].padStart(2, '0')
        date = `${year}-${mm}-${dd}`
      }
    }

    const highMatch = fragment.match(/<div class="high">\s*([\d.]+)\s*℃/)
    const lowMatch = fragment.match(/<div class="low">\s*([\d.]+)\s*℃/)
    const maxTemp = highMatch ? toNumber(highMatch[1]) : null
    const minTemp = lowMatch ? toNumber(lowMatch[1]) : null

    const dayBlockMatch = fragment.match(
      /<div class="day-item dayicon">[\s\S]*?<\/div>\s*<div class="day-item">\s*([^<]+?)\s*<\/div>\s*<div class="day-item">\s*([^<]+?)\s*<\/div>\s*<div class="day-item">\s*([^<]+?)\s*<\/div>\s*<div class="day-item bardiv">/,
    )
    const weather = dayBlockMatch ? dayBlockMatch[1].trim() : null
    const windDirection = dayBlockMatch ? dayBlockMatch[2].trim() : null
    const windSpeed = parseWindLevelText(dayBlockMatch ? dayBlockMatch[3] : null)

    forecast.push({
      label,
      date,
      minTemp,
      maxTemp,
      windDirection,
      windSpeed,
      weather,
      humidity: null,
      precipitation: null,
    })
  }

  return forecast.length === 3 && forecast.every((d) => d.weather !== null || d.maxTemp !== null)
    ? forecast
    : null
}

const normalizeDay = (day: unknown, fallbackDate: string | null) => {
  const d = day as Record<string, unknown> | null | undefined
  const dayNode =
    d?.day && typeof d.day === 'object' ? (d.day as Record<string, unknown>) : d

  return {
    date:
      pickString(dayNode, ['date', 'fxDate', 'datetime', 'valid_date']) ??
      pickString(d, ['date', 'fxDate', 'datetime', 'valid_date']) ??
      fallbackDate,
    minTemp: pickNumber(dayNode, [
      'minTemp',
      'mintemp_c',
      'min_temp',
      'tempMin',
      'min',
      'low',
      'temperature_2m_min',
      'night_temp',
    ]),
    maxTemp: pickNumber(dayNode, [
      'maxTemp',
      'maxtemp_c',
      'max_temp',
      'tempMax',
      'max',
      'high',
      'temperature_2m_max',
      'day_temp',
    ]),
    windDirection:
      pickString(dayNode, ['wind_dir', 'windDirection', 'wind_direction', 'windDir']) ??
      pickString(dayNode, ['wd', 'wind_text']) ??
      null,
    windSpeed: pickNumber(dayNode, [
      'windSpeed',
      'wind_kph',
      'maxwind_kph',
      'wind_speed',
      'windSpeedMax',
      'wind_speed_10m_max',
    ]),
    weather:
      pickString(dayNode, ['weather', 'text', 'condition', 'description']) ??
      pickString((dayNode?.condition ?? null) as Record<string, unknown> | undefined, ['text']) ??
      null,
    humidity: pickNumber(dayNode, ['humidity', 'avghumidity']),
    precipitation: pickNumber(dayNode, [
      'precipitation',
      'precip_mm',
      'totalprecip_mm',
      'rain_sum',
      'precip',
    ]),
  }
}

const defaultFetchHeaders = (): Record<string, string> => ({
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'sec-ch-ua': '"Google Chrome";v="120", "Not.A/Brand";v="8", "Chromium";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
})

export interface GetCmaPageWeatherInit {
  signal?: AbortSignal
}

/**
 * 与 scripts/cma.util.js 的 getWeather 一致：解析 weather.cma.cn 城市页「7 天预报」前三日。
 * `url` 为完整 https 链接；浏览器内请求会改写为同源代理路径。
 */
export async function getWeather(
  url: string,
  init?: GetCmaPageWeatherInit
): Promise<CmaPageWeatherResult> {
  if (!url || typeof url !== 'string') {
    throw new Error('url is required and must be a string')
  }

  let referer = 'https://weather.cma.cn/'
  try {
    const u = new URL(url)
    if (u.hostname === 'weather.cma.cn') {
      referer = `${u.origin}${u.pathname.replace(/[^/]+$/, '')}`
    }
  } catch {
    /* ignore */
  }

  const fetchUrl = rewriteCmaUrlForProxy(url)
  const response = await fetch(fetchUrl, {
    signal: init?.signal,
    headers: {
      ...defaultFetchHeaders(),
      Referer: referer,
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch weather: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('text/html')) {
    const html = await response.text()
    const htmlForecast = parseCmaHtmlForecast(html)
    if (!htmlForecast) {
      throw new Error('Unable to parse 3-day forecast from CMA HTML weather page')
    }
    return {
      source: url,
      forecast: htmlForecast,
    }
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('Weather URL must return JSON or parsable HTML data')
  }

  const dailyArray = detectDailyArray(payload)
  if (!dailyArray || dailyArray.length < 3) {
    throw new Error('Unable to find at least 3 days of forecast data in response')
  }

  const forecast: CmaPageForecastDay[] = DAY_LABELS.map((label, index) => {
    const day = dailyArray[index] ?? {}
    const n = normalizeDay(day, null)
    return {
      label,
      date: n.date,
      minTemp: n.minTemp,
      maxTemp: n.maxTemp,
      windDirection: n.windDirection,
      windSpeed: n.windSpeed,
      weather: n.weather,
      humidity: n.humidity,
      precipitation: n.precipitation,
    }
  })

  return {
    source: url,
    forecast,
  }
}
