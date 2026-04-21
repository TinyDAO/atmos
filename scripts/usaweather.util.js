/**
 * US National Weather Service point forecast via MapClick (FcstType=json).
 */

const MAP_CLICK_BASE = 'https://forecast.weather.gov/MapClick.php'

/** 与美国扫描四天一致（含 inThreeDays / 大后天） */
const DAY_LABELS = ['today', 'tomorrow', 'dayAfterTomorrow', 'inThreeDays']

const DEFAULT_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (compatible; weather-app/1.0; +https://github.com/)',
}

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const toNumber = (value) => {
  if (isNumber(value)) return value
  if (typeof value === 'string' && value.trim() && value.trim().toUpperCase() !== 'NA') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const dateKeyFromStartValidTime = (iso) => {
  if (typeof iso !== 'string' || iso.length < 10) return null
  return iso.slice(0, 10)
}

const buildMapClickUrl = (lat, lon, { fcstType = 'json' } = {}) => {
  const params = new URLSearchParams()
  params.set('lat', String(lat))
  params.set('lon', String(lon))
  if (fcstType) params.set('FcstType', fcstType)
  return `${MAP_CLICK_BASE}?${params.toString()}`
}

/**
 * Collapse alternating periods into local calendar days (NWS temps are °F).
 */
const buildDailyFromJson = (payload, maxDays) => {
  const time = payload?.time
  const data = payload?.data
  if (!time || !data || !Array.isArray(time.startValidTime)) return []

  const names = time.startPeriodName ?? []
  const temps = data.temperature ?? []
  const weather = data.weather ?? []
  const texts = data.text ?? []
  const tempLabels = time.tempLabel ?? []

  const byDay = new Map()

  for (let i = 0; i < time.startValidTime.length; i += 1) {
    const dayKey = dateKeyFromStartValidTime(time.startValidTime[i])
    if (!dayKey) continue

    const t = toNumber(temps[i])
    const entry = {
      periodName: names[i] ?? null,
      tempLabel: tempLabels[i] ?? null,
      tempF: t,
      weather: typeof weather[i] === 'string' ? weather[i] : null,
      text: typeof texts[i] === 'string' ? texts[i].trim() : null,
      startValidTime: time.startValidTime[i],
    }

    if (!byDay.has(dayKey)) byDay.set(dayKey, [])
    byDay.get(dayKey).push(entry)
  }

  const sortedKeys = [...byDay.keys()].sort()
  const keys = sortedKeys.slice(0, maxDays)

  return keys.map((date) => {
    const periods = byDay.get(date) ?? []
    const numericTemps = periods.map((p) => p.tempF).filter((n) => n !== null)

    const highPeriod = periods.find((p) => p.tempLabel === 'High')

    return {
      date,
      minTemp: numericTemps.length ? Math.min(...numericTemps) : null,
      maxTemp: numericTemps.length ? Math.max(...numericTemps) : null,
      weather: highPeriod?.weather ?? periods[0]?.weather ?? null,
    }
  })
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
 * Today plus three more calendar days (4 days), same shape as moji `getWeather` result.
 * Temperatures are °F from NWS.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {RequestInit & { signal?: AbortSignal }} [init]
 * @returns {Promise<{ source: string, forecast: ReturnType<typeof toMojiForecastRow>[] }>}
 */
export async function getUsaWeather(lat, lon, init = {}) {
  const source = buildMapClickUrl(lat, lon, { fcstType: 'json' })
  const res = await fetch(source, {
    ...init,
    headers: { ...DEFAULT_HEADERS, ...init.headers },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`NWS MapClick failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`)
  }

  const raw = await res.json()
  const daily = buildDailyFromJson(raw, 4)

  if (daily.length < 4) {
    throw new Error('Unable to find 4 days of forecast data in NWS response')
  }

  const forecast = DAY_LABELS.map((label, index) => toMojiForecastRow(label, daily[index]))

  return { source, forecast }
}

export { buildMapClickUrl, MAP_CLICK_BASE }
