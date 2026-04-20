import type { City } from '../config/cities'
import { fetchEventBySlug, type PolymarketMarket } from './polymarket'
import { getWeather as getCmaPageWeather } from './cmaWeatherPage'
import { getPolymarketSlug } from '../utils/polymarketSlug'
import { getYesPrice, indexOfClosestBin, marketBin } from '../utils/polymarketTempBin'

export const YES_MIN_DISPLAY = 0.02
export const POLYMARKET_WEB_EVENT_BASE = 'https://polymarket.com/event'

export const DAY_LABELS = [
  { index: 0, key: 'today' as const, label: '今天' },
  { index: 1, key: 'tomorrow' as const, label: '明天' },
  { index: 2, key: 'dayAfterTomorrow' as const, label: '后天' },
]

export interface MarketRow {
  displayLabel: string
  centerC: number
  yes: number
  vol: number
  deltaC: number | null
}

export type DayScanStatus =
  | 'ok'
  | 'gamma_error'
  | 'no_event'
  | 'no_bins'
  | 'filtered_empty'

export interface DayScanResult {
  dayIndex: number
  dayKey: string
  dayLabel: string
  mmdd: string
  slug: string
  polEventUrl: string
  /** 中央气象台城市页（weather.cma.cn）七日预报解析得到的白天最高温，°C */
  cmaMaxC: number | null
  status: DayScanStatus
  errorMessage?: string
  rows: MarketRow[]
  closestIdx: number
  hiddenCount: number
  eventTitle?: string
}

export interface CityScanResult {
  city: City
  weatherError: string | null
  /** 本次使用的中央气象台城市页 URL（与 scripts/scan.js 一致） */
  cmaSourceUrl: string | null
  days: DayScanResult[]
}

export function formatDateMMDD(timezone: string, dayIndex: number): string {
  const d = new Date()
  d.setTime(d.getTime() + dayIndex * 24 * 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const month = parts.find((p) => p.type === 'month')?.value ?? ''
  const day = parts.find((p) => p.type === 'day')?.value ?? ''
  return `${month} ${day}`
}

function buildRowsFromMarkets(
  pool: PolymarketMarket[],
  refHighC: number | null
): { allRows: MarketRow[]; visible: MarketRow[]; hiddenCount: number } {
  const allRows: MarketRow[] = []
  for (const m of pool) {
    const bin = marketBin(m)
    if (!bin) continue
    const yes = getYesPrice(m)
    const volRaw = m.volumeNum ?? (m.volume ? parseFloat(m.volume) : NaN)
    const vol = Number.isFinite(volRaw) ? volRaw : NaN
    allRows.push({
      displayLabel: bin.displayLabel,
      centerC: bin.centerC,
      yes,
      vol,
      deltaC:
        refHighC != null && Number.isFinite(refHighC) ? bin.centerC - refHighC : null,
    })
  }
  allRows.sort((a, b) => a.centerC - b.centerC)
  const visible = allRows.filter((r) => r.yes >= YES_MIN_DISPLAY)
  const hiddenCount = allRows.length - visible.length
  return { allRows, visible, hiddenCount }
}

async function scanOneDay(
  city: City,
  dayIndex: number,
  dayKey: string,
  dayLabel: string,
  byLabel: Map<string, { maxTemp: number | null } | undefined>
): Promise<DayScanResult> {
  const slug = getPolymarketSlug(city.id, dayIndex, city.timezone)
  const polEventUrl = `${POLYMARKET_WEB_EVENT_BASE}/${slug}`
  const mmdd = formatDateMMDD(city.timezone, dayIndex)
  const dayForecast = byLabel.get(dayKey)
  const cmaMaxC =
    dayForecast?.maxTemp != null && Number.isFinite(dayForecast.maxTemp) ? dayForecast.maxTemp : null

  let event
  try {
    event = await fetchEventBySlug(slug)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      dayIndex,
      dayKey,
      dayLabel,
      mmdd,
      slug,
      polEventUrl,
      cmaMaxC,
      status: 'gamma_error',
      errorMessage: msg,
      rows: [],
      closestIdx: -1,
      hiddenCount: 0,
    }
  }

  if (!event) {
    return {
      dayIndex,
      dayKey,
      dayLabel,
      mmdd,
      slug,
      polEventUrl,
      cmaMaxC,
      status: 'no_event',
      rows: [],
      closestIdx: -1,
      hiddenCount: 0,
    }
  }

  let pool = event.markets.filter((m) => m.active || !m.closed)
  if (pool.length === 0) pool = event.markets

  const { allRows, visible, hiddenCount } = buildRowsFromMarkets(pool, cmaMaxC)

  if (allRows.length === 0) {
    return {
      dayIndex,
      dayKey,
      dayLabel,
      mmdd,
      slug,
      polEventUrl,
      cmaMaxC,
      status: 'no_bins',
      eventTitle: event.title,
      rows: [],
      closestIdx: -1,
      hiddenCount: 0,
    }
  }

  if (visible.length === 0) {
    return {
      dayIndex,
      dayKey,
      dayLabel,
      mmdd,
      slug,
      polEventUrl,
      cmaMaxC,
      status: 'filtered_empty',
      eventTitle: event.title,
      rows: [],
      closestIdx: -1,
      hiddenCount,
    }
  }

  const closestIdx = indexOfClosestBin(visible, cmaMaxC ?? Number.NaN)

  return {
    dayIndex,
    dayKey,
    dayLabel,
    mmdd,
    slug,
    polEventUrl,
    cmaMaxC,
    status: 'ok',
    eventTitle: event.title,
    rows: visible,
    closestIdx,
    hiddenCount,
  }
}

export interface RunChinaMojiScanOptions {
  signal?: AbortSignal
  onCityComplete?: (result: CityScanResult) => void
}

export async function runChinaMojiScan(
  cities: City[],
  options?: RunChinaMojiScanOptions
): Promise<CityScanResult[]> {
  const china = cities.filter(
    (c) =>
      c.country === 'China' &&
      typeof c.cma === 'string' &&
      c.cma.length > 0
  )
  const out: CityScanResult[] = []

  for (const city of china) {
    if (options?.signal?.aborted) break

    let weatherError: string | null = null
    const cmaSourceUrl: string | null = city.cma ?? null
    const byLabel = new Map<string, { maxTemp: number | null }>()

    try {
      const w = await getCmaPageWeather(city.cma!, {
        signal: options?.signal,
      })
      for (const d of w.forecast) {
        byLabel.set(d.label, { maxTemp: d.maxTemp })
      }
    } catch (e) {
      weatherError = e instanceof Error ? e.message : String(e)
      const empty: CityScanResult = {
        city,
        weatherError,
        cmaSourceUrl: city.cma ?? null,
        days: [],
      }
      out.push(empty)
      options?.onCityComplete?.(empty)
      continue
    }

    const days: DayScanResult[] = []
    for (const { index, key, label } of DAY_LABELS) {
      if (options?.signal?.aborted) break
      const dayRes = await scanOneDay(city, index, key, label, byLabel)
      days.push(dayRes)
    }

    const result: CityScanResult = { city, weatherError: null, cmaSourceUrl, days }
    out.push(result)
    options?.onCityComplete?.(result)
  }

  return out
}
