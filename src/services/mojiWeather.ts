/** Browser-side copy of scripts/moji.util.js — 墨迹页面 HTML / JSON 解析 */

/** 浏览器同源走 Vite / Vercel 代理，避免墨迹站 CORS 阻断 */
function rewriteMojiUrlForProxy(url: string): string {
  if (typeof window === 'undefined') return url
  try {
    const u = new URL(url)
    if (u.hostname === 'tianqi.moji.com' || u.hostname.endsWith('.moji.com')) {
      return `/moji-fetch${u.pathname}${u.search}`
    }
  } catch {
    /* ignore */
  }
  return url
}

const DAY_LABELS = ['today', 'tomorrow', 'dayAfterTomorrow'] as const

export interface MojiForecastDay {
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

export interface MojiWeatherResult {
  source: string
  forecast: MojiForecastDay[]
  /** 墨迹 HTML 页顶「今天22:54更新」一类文案；JSON 源尽力解析，可能为 null */
  pageUptimeText: string | null
}

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

/** 墨迹城市页 `<strong class="info_uptime">今天22:54更新</strong>` */
export function parseMojiPageUptimeFromHtml(html: string): string | null {
  const m = html.match(/<strong[^>]*\bclass="[^"]*\binfo_uptime\b[^"]*"[^>]*>\s*([^<]+?)\s*<\/strong>/i)
  if (m?.[1]) return m[1].replace(/\s+/g, ' ').trim()
  const m2 = html.match(/<strong\s+class="info_uptime"[^>]*>\s*([^<]+?)\s*<\/strong>/i)
  return m2?.[1] ? m2[1].replace(/\s+/g, ' ').trim() : null
}

const parseMojiHtmlForecast = (html: string): MojiForecastDay[] | null => {
  if (!html.includes('tianqi.moji.com')) return null

  const dayKeyToLabel: Record<string, string> = {
    today: 'today',
    tommorrow: 'tomorrow',
    tdat: 'dayAfterTomorrow',
  }

  const blockRegExp =
    /<a[^>]+href="https?:\/\/tianqi\.moji\.com\/(today|tommorrow|tdat)\/[^"]*"[^>]*>[\s\S]*?<\/a>[\s\S]*?<li>[\s\S]*?<\/span>\s*([^<]+?)\s*<\/li>[\s\S]*?<li>\s*(-?\d+)\s*°\s*\/\s*(-?\d+)\s*°\s*<\/li>[\s\S]*?<li>[\s\S]*?<em>\s*([^<]+?)\s*<\/em>[\s\S]*?<b>\s*([^<]+?)\s*<\/b>/g

  const resultMap = new Map<string, MojiForecastDay>()
  let match = blockRegExp.exec(html)

  while (match) {
    const [, dayKey, weather, minTempRaw, maxTempRaw, windDirection, windLevel] = match
    const label = dayKeyToLabel[dayKey ?? '']

    if (label && !resultMap.has(label)) {
      const windSpeed = toNumber(String(windLevel).replace(/[^\d.-]/g, ''))
      resultMap.set(label, {
        label,
        date: null,
        minTemp: toNumber(minTempRaw),
        maxTemp: toNumber(maxTempRaw),
        windDirection: windDirection?.trim() ?? null,
        windSpeed,
        weather: weather?.trim() ?? null,
        humidity: null,
        precipitation: null,
      })
    }

    match = blockRegExp.exec(html)
  }

  const forecast = DAY_LABELS.map((label) => resultMap.get(label)).filter(Boolean) as MojiForecastDay[]
  return forecast.length === 3 ? forecast : null
}

const normalizeDay = (day: unknown, fallbackDate: string | null) => {
  const d = day as Record<string, unknown>
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
      (dayNode.condition && typeof dayNode.condition === 'object'
        ? pickString(dayNode.condition as Record<string, unknown>, ['text'])
        : null) ??
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

export interface GetMojiWeatherInit {
  signal?: AbortSignal
}

export async function getWeather(url: string, init?: GetMojiWeatherInit): Promise<MojiWeatherResult> {
  if (!url || typeof url !== 'string') {
    throw new Error('url is required and must be a string')
  }

  const fetchUrl = rewriteMojiUrlForProxy(url)
  const response = await fetch(fetchUrl, { signal: init?.signal })
  if (!response.ok) {
    throw new Error(`Failed to fetch weather: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('text/html')) {
    const html = await response.text()
    const htmlForecast = parseMojiHtmlForecast(html)
    if (!htmlForecast) {
      throw new Error('Unable to parse 3-day forecast from HTML weather page')
    }
    return {
      source: url,
      forecast: htmlForecast,
      pageUptimeText: parseMojiPageUptimeFromHtml(html),
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

  const forecast: MojiForecastDay[] = DAY_LABELS.map((label, index) => {
    const day = dailyArray[index] ?? {}
    const n = normalizeDay(day, null)
    return {
      label,
      ...n,
    }
  })

  const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
  const pageUptimeText =
    pickString(root, [
      'update_time',
      'updateTime',
      'uptime',
      'publish_time',
      'publishTime',
      'report_time',
    ]) ??
    pickString(root?.data as Record<string, unknown> | undefined, ['update_time', 'updateTime']) ??
    null

  return {
    source: url,
    forecast,
    pageUptimeText,
  }
}
