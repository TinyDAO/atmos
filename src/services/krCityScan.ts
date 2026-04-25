import type { City } from '../config/cities'
import {
  formatDateMMDD,
  POLYMARKET_WEB_EVENT_BASE,
  YES_MIN_DISPLAY,
} from './chinaMojiScan'
import { fetchEventBySlug, type PolymarketMarket } from './polymarket'
import { getKmaDaily } from './kmaForecast'
import { getPolymarketSlug } from '../utils/polymarketSlug'
import {
  getYesPrice,
  indexOfClosestBin,
  marketBin,
  formatBinLabelWithCelsius,
} from '../utils/polymarketTempBin'

export { YES_MIN_DISPLAY, POLYMARKET_WEB_EVENT_BASE }

export const KR_DAY_LABELS = [
  { index: 0, key: 'today', label: '今天' },
  { index: 1, key: 'tomorrow', label: '明天' },
  { index: 2, key: 'dayAfterTomorrow', label: '后天' },
  { index: 3, key: 'inThreeDays', label: '大后天' },
] as const

export function isKoreaScanCity(c: City): boolean {
  return c.country === 'South Korea' && typeof c.kma === 'string' && c.kma.length > 0
}

export interface KrMarketRow {
  displayLabel: string
  centerC: number
  yes: number
  vol: number
  deltaC: number | null
}

export type KrDayScanStatus =
  | 'ok'
  | 'gamma_error'
  | 'no_event'
  | 'no_bins'
  | 'filtered_empty'

export interface KrDayScanResult {
  dayIndex: number
  dayKey: string
  dayLabel: string
  mmdd: string
  slug: string
  polEventUrl: string
  /** 气象厅数字预报页解析的日最高（°C） */
  kmaMaxC: number | null
  kmaMinC: number | null
  kmaWeather: string | null
  status: KrDayScanStatus
  errorMessage?: string
  rows: KrMarketRow[]
  closestIdx: number
  hiddenCount: number
  eventTitle?: string
}

export interface KrCityScanResult {
  city: City
  weatherError: string | null
  /** cities 中的 KMA 预报页 URL */
  kmaPageUrl: string | null
  days: KrDayScanResult[]
}

function buildRowsFromMarkets(
  pool: PolymarketMarket[],
  refMaxC: number | null
): { allRows: KrMarketRow[]; visible: KrMarketRow[]; hiddenCount: number } {
  const allRows: KrMarketRow[] = []
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
  kmaDay: { maxTemp: number | null; minTemp: number | null; weather: string | null } | undefined
): Promise<KrDayScanResult> {
  const slug = getPolymarketSlug(city.id, dayIndex, city.timezone)
  const polEventUrl = `${POLYMARKET_WEB_EVENT_BASE}/${slug}`
  const mmdd = formatDateMMDD(city.timezone, dayIndex)
  const maxC =
    kmaDay?.maxTemp != null && Number.isFinite(kmaDay.maxTemp) ? kmaDay.maxTemp : null
  const minC =
    kmaDay?.minTemp != null && Number.isFinite(kmaDay.minTemp) ? kmaDay.minTemp : null
  const kmaWeather = kmaDay?.weather ?? null

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
      kmaMaxC: maxC,
      kmaMinC: minC,
      kmaWeather,
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
      kmaMaxC: maxC,
      kmaMinC: minC,
      kmaWeather,
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
      kmaMaxC: maxC,
      kmaMinC: minC,
      kmaWeather,
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
      kmaMaxC: maxC,
      kmaMinC: minC,
      kmaWeather,
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
    kmaMaxC: maxC,
    kmaMinC: minC,
    kmaWeather,
    status: 'ok',
    eventTitle: event.title,
    rows: visible,
    closestIdx,
    hiddenCount,
  }
}

export interface RunKrCityScanOptions {
  signal?: AbortSignal
  onCityComplete?: (result: KrCityScanResult) => void
}

export async function runKrCityScan(
  cities: City[],
  options?: RunKrCityScanOptions
): Promise<KrCityScanResult[]> {
  const krCities = cities.filter(isKoreaScanCity)
  const out: KrCityScanResult[] = []

  for (const city of krCities) {
    if (options?.signal?.aborted) break

    let weatherError: string | null = null
    const kmaPageUrl = city.kma ?? null
    const byIndex: Array<{
      maxTemp: number | null
      minTemp: number | null
      weather: string | null
    }> = []

    try {
      const w = await getKmaDaily(city.kma!, { signal: options?.signal })
      for (const d of w.forecast) {
        byIndex.push({
          maxTemp: d.maxTemp,
          minTemp: d.minTemp,
          weather: d.weather,
        })
      }
    } catch (e) {
      weatherError = e instanceof Error ? e.message : String(e)
      const empty: KrCityScanResult = { city, weatherError, kmaPageUrl, days: [] }
      out.push(empty)
      options?.onCityComplete?.(empty)
      continue
    }

    const days: KrDayScanResult[] = []
    for (const { index, key, label } of KR_DAY_LABELS) {
      if (options?.signal?.aborted) break
      const dayRes = await scanOneDay(city, index, key, label, byIndex[index])
      days.push(dayRes)
    }

    const result: KrCityScanResult = { city, weatherError: null, kmaPageUrl, days }
    out.push(result)
    options?.onCityComplete?.(result)
  }

  return out
}
