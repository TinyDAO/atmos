import type { City } from '../config/cities'
import {
  DAY_LABELS,
  formatDateMMDD,
  POLYMARKET_WEB_EVENT_BASE,
  YES_MIN_DISPLAY,
} from './chinaMojiScan'
import { fetchEventBySlug, type PolymarketMarket } from './polymarket'
import { getEcmwfDaily } from './ecmwfWeather'
import { getPolymarketSlug } from '../utils/polymarketSlug'
import {
  getYesPrice,
  indexOfClosestBin,
  marketBin,
  formatBinLabelWithCelsius,
} from '../utils/polymarketTempBin'

export { YES_MIN_DISPLAY, POLYMARKET_WEB_EVENT_BASE }

export function isEuropeCity(c: City): boolean {
  return typeof c.timezone === 'string' && c.timezone.startsWith('Europe/')
}

export interface EuMarketRow {
  displayLabel: string
  centerC: number
  yes: number
  vol: number
  deltaC: number | null
}

export type EuDayScanStatus =
  | 'ok'
  | 'gamma_error'
  | 'no_event'
  | 'no_bins'
  | 'filtered_empty'

export interface EuDayScanResult {
  dayIndex: number
  dayKey: string
  dayLabel: string
  mmdd: string
  slug: string
  polEventUrl: string
  /** ECMWF / Open-Meteo 日最高 2 m（°C） */
  ecmwfMaxC: number | null
  status: EuDayScanStatus
  errorMessage?: string
  rows: EuMarketRow[]
  closestIdx: number
  hiddenCount: number
  eventTitle?: string
}

export interface EuCityScanResult {
  city: City
  weatherError: string | null
  /** 最近一次成功拉取的 ECMWF 请求 URL（便于核对参数） */
  ecmwfSourceUrl: string | null
  days: EuDayScanResult[]
}

function buildRowsFromMarkets(
  pool: PolymarketMarket[],
  refMaxC: number | null
): { allRows: EuMarketRow[]; visible: EuMarketRow[]; hiddenCount: number } {
  const allRows: EuMarketRow[] = []
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
        refMaxC != null && Number.isFinite(refMaxC) ? bin.centerC - refMaxC : null,
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
): Promise<EuDayScanResult> {
  const slug = getPolymarketSlug(city.id, dayIndex, city.timezone)
  const polEventUrl = `${POLYMARKET_WEB_EVENT_BASE}/${slug}`
  const mmdd = formatDateMMDD(city.timezone, dayIndex)
  const dayForecast = byLabel.get(dayKey)
  const maxC =
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
      ecmwfMaxC: maxC,
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
      ecmwfMaxC: maxC,
      status: 'no_event',
      rows: [],
      closestIdx: -1,
      hiddenCount: 0,
    }
  }

  let pool = event.markets.filter((m) => m.active || !m.closed)
  if (pool.length === 0) pool = event.markets

  const { allRows, visible, hiddenCount } = buildRowsFromMarkets(pool, maxC)

  if (allRows.length === 0) {
    return {
      dayIndex,
      dayKey,
      dayLabel,
      mmdd,
      slug,
      polEventUrl,
      ecmwfMaxC: maxC,
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
      ecmwfMaxC: maxC,
      status: 'filtered_empty',
      eventTitle: event.title,
      rows: [],
      closestIdx: -1,
      hiddenCount,
    }
  }

  const closestIdx = indexOfClosestBin(visible, maxC ?? Number.NaN)

  return {
    dayIndex,
    dayKey,
    dayLabel,
    mmdd,
    slug,
    polEventUrl,
    ecmwfMaxC: maxC,
    status: 'ok',
    eventTitle: event.title,
    rows: visible,
    closestIdx,
    hiddenCount,
  }
}

export interface RunEuCityScanOptions {
  signal?: AbortSignal
  onCityComplete?: (result: EuCityScanResult) => void
}

export async function runEuCityScan(
  cities: City[],
  options?: RunEuCityScanOptions
): Promise<EuCityScanResult[]> {
  const euCities = cities.filter(isEuropeCity)
  const out: EuCityScanResult[] = []

  for (const city of euCities) {
    if (options?.signal?.aborted) break

    let weatherError: string | null = null
    let ecmwfSourceUrl: string | null = null
    const byLabel = new Map<string, { maxTemp: number | null }>()

    try {
      const w = await getEcmwfDaily(city.latitude, city.longitude, city.timezone, {
        signal: options?.signal,
      })
      ecmwfSourceUrl = w.source
      for (const d of w.forecast) {
        byLabel.set(d.label, { maxTemp: d.maxTemp })
      }
    } catch (e) {
      weatherError = e instanceof Error ? e.message : String(e)
      const empty: EuCityScanResult = { city, weatherError, ecmwfSourceUrl: null, days: [] }
      out.push(empty)
      options?.onCityComplete?.(empty)
      continue
    }

    const days: EuDayScanResult[] = []
    for (const { index, key, label } of DAY_LABELS) {
      if (options?.signal?.aborted) break
      const dayRes = await scanOneDay(city, index, key, label, byLabel)
      days.push(dayRes)
    }

    const result: EuCityScanResult = { city, weatherError: null, ecmwfSourceUrl, days }
    out.push(result)
    options?.onCityComplete?.(result)
  }

  return out
}
