/**
 * Korea Meteorological Administration (KMA) digital forecast page
 * (`digital-forecast.do`, e.g. Chinese UI wnuri-chn) — HTML scrape of daily slider.
 * Output shape matches {@link ./usaweather.util.js getUsaWeather} (moji-style rows; temps are °C).
 */

/** Same horizon as US scan (today … inThreeDays) */
const DAY_LABELS = ['today', 'tomorrow', 'dayAfterTomorrow', 'inThreeDays']

const DEFAULT_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (compatible; weather-app/1.0; +https://github.com/) AppleWebKit/537.36 (KHTML, like Gecko)',
}

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const toNumber = (value) => {
  if (isNumber(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * @param {string} block inner HTML of one weather cell (am/pm/allday subtree)
 * @returns {string | null}
 */
const weatherTextFromBlock = (block) => {
  if (!block) return null
  if (/<div>\s*-\s*<\/div>/.test(block)) return '-'
  const titleM = block.match(/title="[^"]*天气:\s*([^"]+)"/)
  if (titleM) return titleM[1].trim()
  const spanM = block.match(/<span[^>]*>([^<]+)<\/span>/)
  if (spanM) return spanM[1].trim()
  return null
}

/**
 * @param {string} slideHtml fragment starting after `<div class="dfs-daily-slide"`
 * @returns {{ date: string, minTemp: number | null, maxTemp: number | null, weather: string | null }}
 */
const parseDailySlide = (slideHtml) => {
  const dateM = slideHtml.match(/data-date="(\d{4}-\d{2}-\d{2})"/)
  const date = dateM ? dateM[1] : null
  if (!date) return { date: null, minTemp: null, maxTemp: null, weather: null }

  const minM = slideHtml.match(/Min\.\s*Temperature:\s*<\/strong>\s*<span>(-?\d+(?:\.\d+)?)℃<\/span>/i)
  const maxM = slideHtml.match(/Max\.\s*Temperature:\s*<\/strong>\s*<span>(-?\d+(?:\.\d+)?)℃<\/span>/i)
  const minTemp = minM ? toNumber(minM[1]) : null
  const maxTemp = maxM ? toNumber(maxM[1]) : null

  let weather = null
  if (slideHtml.includes('daily-weather-allday')) {
    const alldayM = slideHtml.match(/<div class="daily-weather-allday">([\s\S]*?)<div class="daily-minmax"/)
    weather = alldayM ? weatherTextFromBlock(alldayM[1]) : null
  } else {
    const amM = slideHtml.match(/<div class="daily-weather-am">([\s\S]*?)<div class="daily-weather-pm">/)
    const pmM = slideHtml.match(/<div class="daily-weather-pm">([\s\S]*?)<div class="daily-minmax"/)
    const am = amM ? weatherTextFromBlock(amM[1]) : null
    const pm = pmM ? weatherTextFromBlock(pmM[1]) : null
    if (am != null || pm != null) {
      if (am === pm) weather = am
      else weather = [am ?? '-', pm ?? '-'].join(' / ')
    }
  }

  return { date, minTemp, maxTemp, weather }
}

/**
 * @param {string} html
 * @returns {ReturnType<typeof parseDailySlide>[]}
 */
const parseAllDailySlides = (html) => {
  const chunks = html.split('<div class="dfs-daily-slide"')
  const out = []
  for (let i = 1; i < chunks.length; i += 1) {
    const parsed = parseDailySlide(chunks[i])
    if (parsed.date) out.push(parsed)
  }
  return out
}

const toMojiForecastRow = (label, day) => ({
  label,
  date: day?.date ?? null,
  minTemp: day?.minTemp ?? null,
  maxTemp: day?.maxTemp ?? null,
  windDirection: null,
  windSpeed: null,
  weather: day?.weather ?? null,
  humidity: null,
  precipitation: null,
})

/**
 * @param {string | URL} source KMA `digital-forecast.do` URL (any query params the site accepts).
 * @param {RequestInit & { signal?: AbortSignal }} [init]
 * @returns {Promise<{ source: string, forecast: ReturnType<typeof toMojiForecastRow>[] }>}
 */
export async function getKmaWeather(source, init = {}) {
  const sourceStr = typeof source === 'string' ? source : source.toString()
  const res = await fetch(sourceStr, {
    ...init,
    headers: { ...DEFAULT_HEADERS, ...init.headers },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`KMA digital forecast failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`)
  }

  const html = await res.text()
  const daily = parseAllDailySlides(html).slice(0, 4)

  if (daily.length < 4) {
    throw new Error(
      `Unable to find 4 days of forecast data in KMA HTML (got ${daily.length}). Page structure may have changed.`
    )
  }

  const forecast = DAY_LABELS.map((label, index) => toMojiForecastRow(label, daily[index]))

  return { source: sourceStr, forecast }
}
