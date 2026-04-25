import type { City } from '../config/cities'
import {
  formatDateMMDD,
  POLYMARKET_WEB_EVENT_BASE,
  YES_MIN_DISPLAY,
} from './chinaMojiScan'
import { fetchEventBySlug, type PolymarketMarket } from './polymarket'
import { getTenkiDaily } from './tenkiForecast'
import { getPolymarketSlug } from '../utils/polymarketSlug'
import {
  getYesPrice,
  indexOfClosestBin,
  marketBin,
  formatBinLabelWithCelsius,
} from '../utils/polymarketTempBin'

export { YES_MIN_DISPLAY, POLYMARKET_WEB_EVENT_BASE }

/** 与 tenki 先頭 4 日・美国扫描日历日一致 */
export const JP_DAY_LABELS = [
  { index: 0, key: 'today', label: '今天' },
  { index: 1, key: 'tomorrow', label: '明天' },
  { index: 2, key: 'dayAfterTomorrow', label: '后天' },
  { index: 3, key: 'inThreeDays', label: '大后天' },
] as const

export function isJapanScanCity(c: City): boolean {
  return c.country === 'Japan' && typeof c.tenki === 'string' && c.tenki.length > 0
}

export interface JpMarketRow {
  displayLabel: string
  centerC: number
  yes: number
  vol: number
  deltaC: number | null
}

export type JpDayScanStatus =
  | 'ok'
  | 'gamma_error'
  | 'no_event'
  | 'no_bins'
  | 'filtered_empty'

export interface JpDayScanResult {
  dayIndex: number
  dayKey: string
  dayLabel: string
  mmdd: string
  slug: string
  polEventUrl: string
  /** tenki.jp 予報の最高気温（°C） */
  tenkiMaxC: number | null
  tenkiMinC: number | null
  tenkiPrecipMm: number | null
  tenkiWeather: string | null
  status: JpDayScanStatus
  errorMessage?: string
  rows: JpMarketRow[]
  closestIdx: number
  hiddenCount: number
  eventTitle?: string
}

export interface JpCityScanResult {
  city: City
  weatherError: string | null
  /** 本次拉取使用的 URL（代理路径或绝对 URL） */
  tenkiSourceUrl: string | null
  days: JpDayScanResult[]
}

function buildRowsFromMarkets(
  pool: PolymarketMarket[],
  refMaxC: number | null
): { allRows: JpMarketRow[]; visible: JpMarketRow[]; hiddenCount: number } {
  const allRows: JpMarketRow[] = []
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
  tenkiDay: { maxTemp: number | null; minTemp: number | null; precipitation: number | null; weather: string | null } | undefined
): Promise<JpDayScanResult> {
  const slug = getPolymarketSlug(city.id, dayIndex, city.timezone)
  const polEventUrl = `${POLYMARKET_WEB_EVENT_BASE}/${slug}`
  const mmdd = formatDateMMDD(city.timezone, dayIndex)
  const maxC =
    tenkiDay?.maxTemp != null && Number.isFinite(tenkiDay.maxTemp) ? tenkiDay.maxTemp : null
  const tenkiMinC =
    tenkiDay?.minTemp != null && Number.isFinite(tenkiDay.minTemp) ? tenkiDay.minTemp : null
  const tenkiPrecipMm =
    tenkiDay?.precipitation != null && Number.isFinite(tenkiDay.precipitation)
      ? tenkiDay.precipitation
      : null
  const tenkiWeather = tenkiDay?.weather ?? null

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
      tenkiMaxC: maxC,
      tenkiMinC,
      tenkiPrecipMm,
      tenkiWeather,
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
      tenkiMaxC: maxC,
      tenkiMinC,
      tenkiPrecipMm,
      tenkiWeather,
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
      tenkiMaxC: maxC,
      tenkiMinC,
      tenkiPrecipMm,
      tenkiWeather,
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
      tenkiMaxC: maxC,
      tenkiMinC,
      tenkiPrecipMm,
      tenkiWeather,
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
    tenkiMaxC: maxC,
    tenkiMinC,
    tenkiPrecipMm,
    tenkiWeather,
    status: 'ok',
    eventTitle: event.title,
    rows: visible,
    closestIdx,
    hiddenCount,
  }
}

export interface RunJpCityScanOptions {
  signal?: AbortSignal
  onCityComplete?: (result: JpCityScanResult) => void
}

export async function runJpCityScan(
  cities: City[],
  options?: RunJpCityScanOptions
): Promise<JpCityScanResult[]> {
  const jpCities = cities.filter(isJapanScanCity)
  const out: JpCityScanResult[] = []

  for (const city of jpCities) {
    if (options?.signal?.aborted) break

    let weatherError: string | null = null
    let tenkiSourceUrl: string | null = null
    const byIndex: Array<{
      maxTemp: number | null
      minTemp: number | null
      precipitation: number | null
      weather: string | null
    }> = []

    try {
      const w = await getTenkiDaily(city.tenki!, { signal: options?.signal })
      tenkiSourceUrl = w.source
      for (const d of w.forecast) {
        byIndex.push({
          maxTemp: d.maxTemp,
          minTemp: d.minTemp,
          precipitation: d.precipitation,
          weather: d.weather,
        })
      }
    } catch (e) {
      weatherError = e instanceof Error ? e.message : String(e)
      const empty: JpCityScanResult = { city, weatherError, tenkiSourceUrl: null, days: [] }
      out.push(empty)
      options?.onCityComplete?.(empty)
      continue
    }

    const days: JpDayScanResult[] = []
    for (const { index, key, label } of JP_DAY_LABELS) {
      if (options?.signal?.aborted) break
      const dayRes = await scanOneDay(city, index, key, label, byIndex[index])
      days.push(dayRes)
    }

    const result: JpCityScanResult = { city, weatherError: null, tenkiSourceUrl, days }
    out.push(result)
    options?.onCityComplete?.(result)
  }

  return out
}
