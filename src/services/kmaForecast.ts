/**
 * KMA `digital-forecast.do` 日预报 HTML — 浏览器经 `/kma-fetch`（Vite + Vercel）避免 CORS。
 * 解析逻辑与 `scripts/kma.util.js` 一致。
 */

const DAY_LABELS = ['today', 'tomorrow', 'dayAfterTomorrow', 'inThreeDays'] as const

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

function rewriteKmaUrlForProxy(url: string): string {
  if (typeof window === 'undefined') return url
  try {
    const u = new URL(url)
    if (u.hostname === 'www.weather.go.kr' || u.hostname === 'weather.go.kr') {
      return `/kma-fetch${u.pathname}${u.search}`
    }
  } catch {
    /* ignore */
  }
  return url
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const toNumber = (value: unknown): number | null => {
  if (isNumber(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const weatherTextFromBlock = (block: string): string | null => {
  if (!block) return null
  if (/<div>\s*-\s*<\/div>/.test(block)) return '-'
  const titleM = block.match(/title="[^"]*天气:\s*([^"]+)"/)
  if (titleM) return titleM[1].trim()
  const spanM = block.match(/<span[^>]*>([^<]+)<\/span>/)
  if (spanM) return spanM[1].trim()
  return null
}

const parseDailySlide = (
  slideHtml: string
): { date: string | null; minTemp: number | null; maxTemp: number | null; weather: string | null } => {
  const dateM = slideHtml.match(/data-date="(\d{4}-\d{2}-\d{2})"/)
  const date = dateM ? dateM[1] : null
  if (!date) return { date: null, minTemp: null, maxTemp: null, weather: null }

  const minM = slideHtml.match(/Min\.\s*Temperature:\s*<\/strong>\s*<span>(-?\d+(?:\.\d+)?)℃<\/span>/i)
  const maxM = slideHtml.match(/Max\.\s*Temperature:\s*<\/strong>\s*<span>(-?\d+(?:\.\d+)?)℃<\/span>/i)
  const minTemp = minM ? toNumber(minM[1]) : null
  const maxTemp = maxM ? toNumber(maxM[1]) : null

  let weather: string | null = null
  if (slideHtml.includes('daily-weather-allday')) {
    const alldayM = slideHtml.match(/<div class="daily-weather-allday">([\s\S]*?)<div class="daily-minmax"/)
    weather = alldayM ? weatherTextFromBlock(alldayM[1]) : null
  } else {
    const amM = slideHtml.match(/<div class="daily-weather-am">([\s\S]*?)<div class="daily-weather-pm">/)
    const pmM = slideHtml.match(/<div class="daily-weather-pm">([\s\S]*?)<div class="daily-minmax"/)
    const am = amM ? weatherTextFromBlock(amM[1]) : null
    const pm = pmM ? weatherTextFromBlock(pmM[1]) : null
    if (am != null || pm != null) {
      weather = am === pm ? am : [am ?? '-', pm ?? '-'].join(' / ')
    }
  }

  return { date, minTemp, maxTemp, weather }
}

const parseAllDailySlides = (html: string) => {
  const chunks = html.split('<div class="dfs-daily-slide"')
  const out: ReturnType<typeof parseDailySlide>[] = []
  for (let i = 1; i < chunks.length; i += 1) {
    const parsed = parseDailySlide(chunks[i]!)
    if (parsed.date) out.push(parsed)
  }
  return out
}

function assertKmaForecastUrl(url: string): void {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    throw new Error('kma: invalid URL')
  }
  if (u.hostname !== 'www.weather.go.kr' && u.hostname !== 'weather.go.kr') {
    throw new Error('kma: URL must be on weather.go.kr')
  }
}

export interface KmaForecastDay {
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

export interface KmaDailyResult {
  /** 与 cities 配置一致的 canonical URL */
  source: string
  forecast: KmaForecastDay[]
}

export async function getKmaDaily(
  url: string,
  init: RequestInit & { signal?: AbortSignal } = {}
): Promise<KmaDailyResult> {
  assertKmaForecastUrl(url)
  const fetchUrl = rewriteKmaUrlForProxy(url)

  const res = await fetch(fetchUrl, {
    ...init,
    referrerPolicy: 'no-referrer',
    headers: { ...DEFAULT_HEADERS, ...init.headers },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`kma fetch failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`)
  }

  const html = await res.text()
  const daily = parseAllDailySlides(html).slice(0, 4)

  if (daily.length < 4) {
    throw new Error(
      `kma: expected 4 daily slides (dfs-daily-slide); got ${daily.length}. Page layout may have changed.`
    )
  }

  const forecast: KmaForecastDay[] = DAY_LABELS.map((label, index) => {
    const day = daily[index]!
    return {
      label,
      date: day.date,
      minTemp: day.minTemp,
      maxTemp: day.maxTemp,
      windDirection: null,
      windSpeed: null,
      weather: day.weather,
      humidity: null,
      precipitation: null,
    }
  })

  return { source: url, forecast }
}
