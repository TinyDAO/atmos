import type { City } from '../config/cities'
import { fetchEventBySlug, type PolymarketMarket } from './polymarket'
import { getWeather as getCmaPageWeather } from './cmaWeatherPage'
import { getWeather as getMojiPageWeather } from './mojiWeather'
import { fetchHbtDailyHighCelsius } from './hbtAirportWeather'
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
  /** 墨迹城市页同日最高温（°C），仅作对照；无 moji 或解析失败为 null */
  mojiMaxC: number | null
  /** 与 `mojiMaxC` 最接近的档位下标（visible rows），无墨迹或无档位为 -1 */
  mojiClosestIdx: number
  /**
   * 机场微信页（wechat.hbt7.com）当日区间最高温（°C），仅「今天」且 cities 配了 `hbt`；
   * 辅助参考，不参与 Δ 与 ★。
   */
  hbtMaxC: number | null
  /** 与 `hbtMaxC` 最接近的档位下标（visible rows），无 HBT 或无档位为 -1 */
  hbtClosestIdx: number
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
  byLabel: Map<string, { maxTemp: number | null } | undefined>,
  mojiMaxC: number | null,
  hbtMaxC: number | null
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
      mojiMaxC,
      mojiClosestIdx: -1,
      hbtMaxC,
      hbtClosestIdx: -1,
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
      mojiMaxC,
      mojiClosestIdx: -1,
      hbtMaxC,
      hbtClosestIdx: -1,
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
      mojiMaxC,
      mojiClosestIdx: -1,
      hbtMaxC,
      hbtClosestIdx: -1,
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
      mojiMaxC,
      mojiClosestIdx: -1,
      hbtMaxC,
      hbtClosestIdx: -1,
      status: 'filtered_empty',
      eventTitle: event.title,
      rows: [],
      closestIdx: -1,
      hiddenCount,
    }
  }

  const closestIdx = indexOfClosestBin(visible, cmaMaxC ?? Number.NaN)
  const mojiClosestIdx =
    mojiMaxC != null && Number.isFinite(mojiMaxC)
      ? indexOfClosestBin(visible, mojiMaxC)
      : -1
  const hbtClosestIdx =
    hbtMaxC != null && Number.isFinite(hbtMaxC)
      ? indexOfClosestBin(visible, hbtMaxC)
      : -1

  return {
    dayIndex,
    dayKey,
    dayLabel,
    mmdd,
    slug,
    polEventUrl,
    cmaMaxC,
    mojiMaxC,
    mojiClosestIdx,
    hbtMaxC,
    hbtClosestIdx,
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

    const mojiMaxByDayKey = new Map<string, number | null>()
    if (typeof city.moji === 'string' && city.moji.length > 0) {
      try {
        const moji = await getMojiPageWeather(city.moji, { signal: options?.signal })
        for (const d of moji.forecast) {
          const v = d.maxTemp
          mojiMaxByDayKey.set(
            d.label,
            v != null && Number.isFinite(v) ? v : null
          )
        }
      } catch {
        /* 辅数据失败不影响扫描 */
      }
    }

    /** 机场微信页为「当日」实况预报区间，仅与扫描「今天」卡片对齐 */
    let hbtTodayMaxC: number | null = null
    if (typeof city.hbt === 'string' && city.hbt.length > 0) {
      try {
        hbtTodayMaxC = await fetchHbtDailyHighCelsius(city.hbt, {
          signal: options?.signal,
        })
      } catch {
        /* 辅数据失败不影响扫描 */
      }
    }

    const days: DayScanResult[] = []
    for (const { index, key, label } of DAY_LABELS) {
      if (options?.signal?.aborted) break
      const mojiMaxC = mojiMaxByDayKey.get(key) ?? null
      const hbtMaxC = index === 0 ? hbtTodayMaxC : null
      const dayRes = await scanOneDay(city, index, key, label, byLabel, mojiMaxC, hbtMaxC)
      days.push(dayRes)
    }

    const result: CityScanResult = { city, weatherError: null, cmaSourceUrl, days }
    out.push(result)
    options?.onCityComplete?.(result)
  }

  return out
}
