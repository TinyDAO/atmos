/**
 * NOAA NWS MapClick JSON — browser uses `/nws-mapclick` proxy (Vite + Vercel) to avoid CORS.
 */

const DAY_LABELS = ['today', 'tomorrow', 'dayAfterTomorrow'] as const

function mapClickUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    FcstType: 'json',
  })
  const path = `/MapClick.php?${params.toString()}`
  if (typeof window !== 'undefined') {
    return `/nws-mapclick${path}`
  }
  return `https://forecast.weather.gov${path}`
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const toNumber = (value: unknown): number | null => {
  if (isNumber(value)) return value
  if (typeof value === 'string' && value.trim() && value.trim().toUpperCase() !== 'NA') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const dateKeyFromStartValidTime = (iso: string): string | null =>
  iso.length >= 10 ? iso.slice(0, 10) : null

export interface UsaForecastDay {
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

export interface UsaWeatherResult {
  source: string
  forecast: UsaForecastDay[]
}

export async function getUsaWeather(
  lat: number,
  lon: number,
  init?: RequestInit
): Promise<UsaWeatherResult> {
  const source = mapClickUrl(lat, lon)
  const res = await fetch(source, {
    ...init,
    headers: {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'weather-app/1.0',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`NWS MapClick failed: ${res.status} ${text.slice(0, 200)}`)
  }
  const raw = (await res.json()) as {
    time?: { startValidTime?: string[]; startPeriodName?: string[]; tempLabel?: string[] }
    data?: {
      temperature?: (string | null)[]
      weather?: (string | null)[]
      text?: (string | null)[]
    }
  }

  const time = raw.time
  const data = raw.data
  if (!time || !data || !Array.isArray(time.startValidTime)) {
    throw new Error('Invalid NWS JSON')
  }

  const temps = data.temperature ?? []
  const weather = data.weather ?? []
  const tempLabels = time.tempLabel ?? []

  const byDay = new Map<string, Array<{ tempF: number | null; tempLabel: string | null; weather: string | null }>>()

  for (let i = 0; i < time.startValidTime.length; i++) {
    const dayKey = dateKeyFromStartValidTime(time.startValidTime[i]!)
    if (!dayKey) continue
    const t = toNumber(temps[i])
    const entry = {
      tempF: t,
      tempLabel: tempLabels[i] ?? null,
      weather: typeof weather[i] === 'string' ? weather[i] : null,
    }
    if (!byDay.has(dayKey)) byDay.set(dayKey, [])
    byDay.get(dayKey)!.push(entry)
  }

  const sortedKeys = [...byDay.keys()].sort()
  const keys = sortedKeys.slice(0, 3)

  const daily = keys.map((date) => {
    const periods = byDay.get(date) ?? []
    const numericTemps = periods.map((p) => p.tempF).filter((n): n is number => n !== null)
    const highPeriod = periods.find((p) => p.tempLabel === 'High')
    return {
      date,
      minTemp: numericTemps.length ? Math.min(...numericTemps) : null,
      maxTemp: numericTemps.length ? Math.max(...numericTemps) : null,
      weather: highPeriod?.weather ?? periods[0]?.weather ?? null,
    }
  })

  if (daily.length < 3) {
    throw new Error('Unable to find 3 days of forecast data in NWS response')
  }

  const forecast: UsaForecastDay[] = DAY_LABELS.map((label, index) => {
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

  return { source, forecast }
}
