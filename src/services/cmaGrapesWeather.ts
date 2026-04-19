/**
 * CMA GFS GRAPES daily max/min via Open-Meteo `/v1/cma` (中国气象局全球模式开放数据).
 * @see https://open-meteo.com/en/docs/cma-api
 */

const DAY_LABELS = ['today', 'tomorrow', 'dayAfterTomorrow'] as const

const DEFAULT_BASE = (
  import.meta.env.VITE_OPEN_METEO_CMA_BASE || 'https://api.open-meteo.com/v1/cma'
).replace(/\/$/, '')

function buildUrl(lat: number, lon: number, timezone: string): string {
  const u = new URL(`${DEFAULT_BASE}`)
  u.searchParams.set('latitude', String(lat))
  u.searchParams.set('longitude', String(lon))
  u.searchParams.set('timezone', timezone)
  u.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min')
  u.searchParams.set('forecast_days', '5')
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

export interface CmaGrapesForecastDay {
  label: string
  date: string | null
  minTemp: number | null
  maxTemp: number | null
}

export async function getCmaGrapesDaily(
  lat: number,
  lon: number,
  timezone: string,
  init?: RequestInit
): Promise<{ source: string; forecast: CmaGrapesForecastDay[] }> {
  const source = buildUrl(lat, lon, timezone)
  const res = await fetch(source, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Open-Meteo CMA failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`)
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
    throw new Error(`Open-Meteo CMA: ${reason}`)
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
    throw new Error('CMA response missing daily arrays or fewer than 3 days')
  }

  const forecast: CmaGrapesForecastDay[] = DAY_LABELS.map((label, i) => {
    const dateStr = typeof times[i] === 'string' ? (times[i] as string) : null
    return {
      label,
      date: dateStr,
      minTemp: toNumber(minArr[i]),
      maxTemp: toNumber(maxArr[i]),
    }
  })

  return { source, forecast }
}
