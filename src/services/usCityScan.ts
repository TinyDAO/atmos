import type { City } from '../config/cities'
import {
  formatDateMMDD,
  POLYMARKET_WEB_EVENT_BASE,
  YES_MIN_DISPLAY,
} from './chinaMojiScan'
import { fetchEventBySlug, type PolymarketMarket } from './polymarket'
import { getUsaWeather } from './usaWeather'
import { getPolymarketSlug } from '../utils/polymarketSlug'
import {
  getYesPrice,
  indexOfClosestBin,
  marketBin,
  formatBinLabelWithCelsius,
} from '../utils/polymarketTempBin'

/** 美国城市扫描：NWS 与 Polymarket 对比四个日历日（今天起算） */
export const US_DAY_LABELS = [
  { index: 0, key: 'today', label: '今天' },
  { index: 1, key: 'tomorrow', label: '明天' },
  { index: 2, key: 'dayAfterTomorrow', label: '后天' },
  { index: 3, key: 'inThreeDays', label: '大后天' },
] as const

export { YES_MIN_DISPLAY, POLYMARKET_WEB_EVENT_BASE }

export interface UsMarketRow {
  /** Polymarket 档位文案；华氏档位后附 `（…°C）` */
  displayLabel: string
  centerC: number
  yes: number
  vol: number
  deltaC: number | null
}

export type UsDayScanStatus =
  | 'ok'
  | 'gamma_error'
  | 'no_event'
  | 'no_bins'
  | 'filtered_empty'

export interface UsDayScanResult {
  dayIndex: number
  dayKey: string
  dayLabel: string
  mmdd: string
  slug: string
  polEventUrl: string
  /** NWS 日最高温（°F） */
  nwsMaxF: number | null
  /** 换算为 °C，用于与 Polymarket 档位 centerC 对齐 */
  nwsMaxC: number | null
  status: UsDayScanStatus
  errorMessage?: string
  rows: UsMarketRow[]
  closestIdx: number
  hiddenCount: number
  eventTitle?: string
}

export interface UsCityScanResult {
  city: City
  weatherError: string | null
  days: UsDayScanResult[]
}

function fahrenheitToCelsius(f: number | null | undefined): number | null {
  if (f == null || !Number.isFinite(f)) return null
  return ((f - 32) * 5) / 9
}

function buildRowsFromMarkets(
  pool: PolymarketMarket[],
  nwsMaxC: number | null
): { allRows: UsMarketRow[]; visible: UsMarketRow[]; hiddenCount: number } {
  const allRows: UsMarketRow[] = []
  for (const m of pool) {
    const bin = marketBin(m)
    if (!bin) continue
    const yes = getYesPrice(m)
    const volRaw = m.volumeNum ?? (m.volume ? parseFloat(m.volume) : NaN)
    const vol = Number.isFinite(volRaw) ? volRaw : NaN
    allRows.push({
      displayLabel: formatBinLabelWithCelsius(bin),
      centerC: bin.centerC,
      yes,
      vol,
      deltaC:
        nwsMaxC != null && Number.isFinite(nwsMaxC) ? bin.centerC - nwsMaxC : null,
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
): Promise<UsDayScanResult> {
  const slug = getPolymarketSlug(city.id, dayIndex, city.timezone)
  const polEventUrl = `${POLYMARKET_WEB_EVENT_BASE}/${slug}`
  const mmdd = formatDateMMDD(city.timezone, dayIndex)
  const dayForecast = byLabel.get(dayKey)
  const maxF =
    dayForecast?.maxTemp != null && Number.isFinite(dayForecast.maxTemp) ? dayForecast.maxTemp : null
  const nwsMaxC = fahrenheitToCelsius(maxF)

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
      nwsMaxF: maxF,
      nwsMaxC,
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
      nwsMaxF: maxF,
      nwsMaxC,
      status: 'no_event',
      rows: [],
      closestIdx: -1,
      hiddenCount: 0,
    }
  }

  let pool = event.markets.filter((m) => m.active || !m.closed)
  if (pool.length === 0) pool = event.markets

  const { allRows, visible, hiddenCount } = buildRowsFromMarkets(pool, nwsMaxC)

  if (allRows.length === 0) {
    return {
      dayIndex,
      dayKey,
      dayLabel,
      mmdd,
      slug,
      polEventUrl,
      nwsMaxF: maxF,
      nwsMaxC,
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
      nwsMaxF: maxF,
      nwsMaxC,
      status: 'filtered_empty',
      eventTitle: event.title,
      rows: [],
      closestIdx: -1,
      hiddenCount,
    }
  }

  const closestIdx = indexOfClosestBin(visible, nwsMaxC ?? Number.NaN)

  return {
    dayIndex,
    dayKey,
    dayLabel,
    mmdd,
    slug,
    polEventUrl,
    nwsMaxF: maxF,
    nwsMaxC,
    status: 'ok',
    eventTitle: event.title,
    rows: visible,
    closestIdx,
    hiddenCount,
  }
}

export interface RunUsCityScanOptions {
  signal?: AbortSignal
  onCityComplete?: (result: UsCityScanResult) => void
}

export async function runUsCityScan(
  cities: City[],
  options?: RunUsCityScanOptions
): Promise<UsCityScanResult[]> {
  const usCities = cities.filter((c) => c.country === 'USA')
  const out: UsCityScanResult[] = []

  for (const city of usCities) {
    if (options?.signal?.aborted) break

    let weatherError: string | null = null
    const byLabel = new Map<string, { maxTemp: number | null }>()

    try {
      const w = await getUsaWeather(city.latitude, city.longitude, { signal: options?.signal })
      for (const d of w.forecast) {
        byLabel.set(d.label, { maxTemp: d.maxTemp })
      }
    } catch (e) {
      weatherError = e instanceof Error ? e.message : String(e)
      const empty: UsCityScanResult = { city, weatherError, days: [] }
      out.push(empty)
      options?.onCityComplete?.(empty)
      continue
    }

    const days: UsDayScanResult[] = []
    for (const { index, key, label } of US_DAY_LABELS) {
      if (options?.signal?.aborted) break
      const dayRes = await scanOneDay(city, index, key, label, byLabel)
      days.push(dayRes)
    }

    const result: UsCityScanResult = { city, weatherError: null, days }
    out.push(result)
    options?.onCityComplete?.(result)
  }

  return out
}
