/**
 * Hubei airport WeChat page: daily min~max near the end of the HTML
 * (`<div class='temperature'>11℃~17℃</div>`).
 * @see http://wechat.hbt7.com/mhweixin/app/common/airportWeather/searchWeather
 */

const DEFAULT_BASE =
  'http://wechat.hbt7.com/mhweixin/app/common/airportWeather/searchWeather'

const DEFAULT_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (compatible; weather-hbt-util/1.0)',
}

const buildSearchWeatherUrl = (city, base = DEFAULT_BASE) => {
  const u = new URL(base)
  u.searchParams.set('city', city)
  return u.toString()
}

/**
 * Parse today's (page) temperature range from HTML; returns max (and min) in °C.
 * Prefers `<div class="temperature">…</div>`; falls back to the last `n℃~m℃` in the tail.
 */
const parseDailyTempRangeFromHtml = (html) => {
  if (typeof html !== 'string' || !html.trim()) {
    return { minC: null, maxC: null, raw: null }
  }

  const divMatch = html.match(
    /<div[^>]*\bclass\s*=\s*['"]temperature['"][^>]*>\s*([^<]+?)\s*<\/div>/i,
  )
  const raw = divMatch ? divMatch[1].trim() : null

  const parsePair = (text) => {
    const m = text.match(
      /(-?\d+(?:\.\d+)?)\s*℃\s*[~～]\s*(-?\d+(?:\.\d+)?)\s*℃/u,
    )
    if (!m) return { minC: null, maxC: null }
    const a = Number(m[1])
    const b = Number(m[2])
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return { minC: null, maxC: null }
    }
    return { minC: Math.min(a, b), maxC: Math.max(a, b) }
  }

  if (raw) {
    const pair = parsePair(raw)
    if (pair.maxC !== null) return { ...pair, raw }
  }

  const tail = html.slice(Math.max(0, html.length - 8000))
  let last = null
  const re = /(-?\d+(?:\.\d+)?)\s*℃\s*[~～]\s*(-?\d+(?:\.\d+)?)\s*℃/gu
  for (const m of tail.matchAll(re)) last = m[0]
  if (!last) return { minC: null, maxC: null, raw: null }
  const pair = parsePair(last)
  return { ...pair, raw: last }
}

const fetchSearchWeatherHtml = async (cityOrUrl, init = {}) => {
  const url =
    cityOrUrl.startsWith('http://') || cityOrUrl.startsWith('https://')
      ? cityOrUrl
      : buildSearchWeatherUrl(cityOrUrl)
  const res = await fetch(url, {
    ...init,
    headers: { ...DEFAULT_HEADERS, ...init.headers },
  })
  if (!res.ok) {
    throw new Error(`HBT searchWeather HTTP ${res.status}: ${res.statusText}`)
  }
  return res.text()
}

/** Fetches the page and returns the daily high (°C) from the temperature block. */
const fetchDailyHighCelsius = async (cityOrUrl, init) => {
  const html = await fetchSearchWeatherHtml(cityOrUrl, init)
  const { maxC } = parseDailyTempRangeFromHtml(html)
  return maxC
}

export {
  DEFAULT_BASE as HBT_SEARCH_WEATHER_BASE,
  buildSearchWeatherUrl,
  fetchSearchWeatherHtml,
  parseDailyTempRangeFromHtml,
  fetchDailyHighCelsius,
}
