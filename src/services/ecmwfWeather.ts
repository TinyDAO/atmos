/**
 * ECMWF daily forecast via Open-Meteo `/v1/ecmwf` (IFS / open-data ECMWF).
 * @see https://open-meteo.com/en/docs/ecmwf-api
 */

const DAY_LABELS = ['today', 'tomorrow', 'dayAfterTomorrow'] as const

const DEFAULT_BASE = (
  import.meta.env.VITE_OPEN_METEO_ECMWF_BASE || 'https://api.open-meteo.com/v1/ecmwf'
).replace(/\/$/, '')

function buildUrl(lat: number, lon: number, timezone: string): string {
  const u = new URL(`${DEFAULT_BASE}`)
  u.searchParams.set('latitude', String(lat))
  u.searchParams.set('longitude', String(lon))
  u.searchParams.set('timezone', timezone)
  u.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min')
  u.searchParams.set('forecast_days', '5')
  u.searchParams.set('temperature_unit', 'celsius')
  return u.toString()
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export interface EcmwfForecastDay {
  label: string
  date: string | null
  minTemp: number | null
  maxTemp: number | null
}

/**
 * Three calendar days (today + 2) in the given IANA timezone — ECMWF 2 m daily max/min (°C).
 */
export async function getEcmwfDaily(
  lat: number,
  lon: number,
  timezone: string,
  init?: RequestInit
): Promise<{ source: string; forecast: EcmwfForecastDay[] }> {
  const source = buildUrl(lat, lon, timezone)
  const res = await fetch(source, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Open-Meteo ECMWF failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`)
  }

  const raw = (await res.json()) as {
    error?: boolean
    reason?: string
    daily?: {
      time?: unknown[]
      temperature_2m_max?: unknown[]
      temperature_2m_min?: unknown[]
    }
  }

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

  const forecast: EcmwfForecastDay[] = DAY_LABELS.map((label, i) => {
    const dateStr = typeof times[i] === 'string' ? (times[i] as string) : null
    const maxC = toNumber(maxArr[i])
    const minC = toNumber(minArr[i])
    return { label, date: dateStr, minTemp: minC, maxTemp: maxC }
  })

  return { source, forecast }
}
