/**
 * ECMWF-based daily forecast via Open-Meteo `/v1/ecmwf` (IFS / open-data ECMWF).
 * @see https://open-meteo.com/en/docs/ecmwf-api
 */

const DAY_LABELS = ['today', 'tomorrow', 'dayAfterTomorrow']

const DEFAULT_BASE = (
  process.env.OPEN_METEO_ECMWF_BASE || 'https://api.open-meteo.com/v1/ecmwf'
).replace(/\/$/, '')

const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'weather-eu-scan-cli/1.0',
}

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const buildUrl = (lat, lon, timezone) => {
  const u = new URL(`${DEFAULT_BASE}`)
  u.searchParams.set('latitude', String(lat))
  u.searchParams.set('longitude', String(lon))
  u.searchParams.set('timezone', timezone)
  u.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min')
  u.searchParams.set('forecast_days', '5')
  u.searchParams.set('temperature_unit', 'celsius')
  return u.toString()
}

const toForecastRow = (label, dateStr, maxC, minC) => ({
  label,
  date: dateStr,
  minTemp: minC,
  maxTemp: maxC,
  windDirection: null,
  windSpeed: null,
  weather: null,
  humidity: null,
  precipitation: null,
})

/**
 * Three calendar days (today + 2) in the given IANA timezone, ECMWF daily max/min at 2 m (°C).
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} timezone e.g. Europe/London
 * @param {RequestInit & { signal?: AbortSignal }} [init]
 * @returns {Promise<{ source: string, forecast: ReturnType<typeof toForecastRow>[] }>}
 */
export async function getEcmwfDaily(lat, lon, timezone, init = {}) {
  const source = buildUrl(lat, lon, timezone)
  const res = await fetch(source, {
    ...init,
    headers: { ...DEFAULT_HEADERS, ...init.headers },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Open-Meteo ECMWF failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`)
  }

  const raw = await res.json()
  if (raw?.error) {
    const reason = typeof raw.reason === 'string' ? raw.reason : JSON.stringify(raw)
    throw new Error(`Open-Meteo ECMWF: ${reason}`)
  }

  const times = raw?.daily?.time
  const maxArr = raw?.daily?.temperature_2m_max
  const minArr = raw?.daily?.temperature_2m_min
  if (
    !Array.isArray(times) ||
    !Array.isArray(maxArr) ||
    !Array.isArray(minArr) ||
    times.length < 3 ||
    maxArr.length < 3 ||
    minArr.length < 3
  ) {
    throw new Error('ECMWF response missing daily arrays or fewer than 3 days')
  }

  const forecast = DAY_LABELS.map((label, i) => {
    const dateStr = typeof times[i] === 'string' ? times[i] : null
    const maxC = toNumber(maxArr[i])
    const minC = toNumber(minArr[i])
    return toForecastRow(label, dateStr, maxC, minC)
  })

  return { source, forecast }
}

export { buildUrl, DEFAULT_BASE as ECMWF_API_BASE }
