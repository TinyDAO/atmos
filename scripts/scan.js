#!/usr/bin/env node
/**
 * Scan moji-backed cities: compare 3-day high temps vs Polymarket highest-temperature bins (YES odds).
 * Run: node --experimental-strip-types scripts/scan.js
 *   or: pnpm run scan
 */
import { getWeather } from './moji.util.js'
import { CITIES } from '../src/config/cities.ts'

const GAMMA_BASE = (process.env.POLYMARKET_GAMMA_BASE || 'https://gamma-api.polymarket.com').replace(
  /\/$/,
  ''
)
/** 网页端事件页（与 slug 拼接） */
const POLYMARKET_WEB_EVENT_BASE = 'https://polymarket.com/event'
const FETCH_TIMEOUT_MS = 45_000
/** 不列出 YES 低于该值的档位（0.02 = 隐藏 &lt;2%） */
const YES_MIN_DISPLAY = 0.02

async function fetchWithTimeout(url, init = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'weather-scan-cli/1.0',
        ...init.headers,
      },
    })
  } finally {
    clearTimeout(t)
  }
}

const DAY_LABELS = [
  { index: 0, key: 'today', label: '今天' },
  { index: 1, key: 'tomorrow', label: '明天' },
  { index: 2, key: 'dayAfterTomorrow', label: '后天' },
]

/** @type {{ noColor: boolean, cityFilter: Set<string> | null }} */
let cli = { noColor: false, cityFilter: null }

function parseArgs() {
  const args = process.argv.slice(2)
  let cityFilter = null
  for (const a of args) {
    if (a === '--help' || a === '-h') {
      printHelp()
      process.exit(0)
    }
    if (a === '--no-color') cli.noColor = true
    else if (a.startsWith('--city=')) {
      const ids = a
        .slice('--city='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      cityFilter = new Set(ids)
    }
  }
  cli.cityFilter = cityFilter
}

function printHelp() {
  console.log(`
用法: node --experimental-strip-types scripts/scan.js [选项]

选项:
  --city=id1,id2   只扫描指定城市 id（如 beijing,hong-kong）
  --no-color       禁用 ANSI 颜色
  --help, -h       显示帮助

环境:
  POLYMARKET_GAMMA_BASE   Gamma API 根地址（默认 https://gamma-api.polymarket.com）

示例:
  pnpm run scan
  pnpm run scan -- --city=beijing
`)
}

function color(s, code) {
  if (cli.noColor) return s
  return `\u001b[${code}m${s}\u001b[0m`
}

const bold = (s) => color(s, '1')
const dim = (s) => color(s, '2')
const magenta = (s) => color(s, '35')
const cyan = (s) => color(s, '36')
const yellow = (s) => color(s, '33')

/**
 * Same as src/utils/polymarketSlug.ts
 * @param {string} cityId
 * @param {number} dayIndex
 * @param {string} timezone
 */
function getPolymarketSlug(cityId, dayIndex, timezone) {
  const d = new Date()
  d.setTime(d.getTime() + dayIndex * 24 * 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).formatToParts(d)
  const month = parts.find((p) => p.type === 'month')?.value?.toLowerCase() ?? ''
  const day = parts.find((p) => p.type === 'day')?.value ?? ''
  const year = parts.find((p) => p.type === 'year')?.value ?? ''
  return `highest-temperature-in-${cityId}-on-${month}-${day}-${year}`
}

/**
 * Local calendar date as "MM DD" (city timezone).
 * @param {string} timezone
 * @param {number} dayIndex
 */
function formatDateMMDD(timezone, dayIndex) {
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

/**
 * @param {object} p
 * @param {Array<{ displayLabel: string, yes: number, deltaC: number | null, vol: number }>} p.rows
 * @param {number} p.closestIdx
 * @param {number | null} p.mojiMax
 */
function printMarketTable({ rows, closestIdx, mojiMax }) {
  const W = { bin: 24, yes: 8, delta: 16, vol: 8 }
  const seg = (w) => '─'.repeat(w + 2)
  const top = `┌${seg(W.bin)}┬${seg(W.yes)}┬${seg(W.delta)}┬${seg(W.vol)}┐`
  const mid = `├${seg(W.bin)}┼${seg(W.yes)}┼${seg(W.delta)}┼${seg(W.vol)}┤`
  const bot = `└${seg(W.bin)}┴${seg(W.yes)}┴${seg(W.delta)}┴${seg(W.vol)}┘`
  const cell = (bin, yes, dlt, vol) =>
    `│ ${bin.padEnd(W.bin)} │ ${yes.padStart(W.yes)} │ ${dlt.padStart(W.delta)} │ ${vol.padStart(W.vol)} │`

  console.log(`    ${dim(top)}`)
  console.log(
    `    ${dim(cell('档位', 'YES', 'Δ(档−墨迹°C)', '成交量'))}`
  )
  console.log(`    ${dim(mid)}`)

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const isMoji = i === closestIdx && mojiMax != null && Number.isFinite(mojiMax)
    const binCell = `${isMoji ? '★ ' : '  '}${r.displayLabel}`
    const yesStr = formatPct(r.yes)
    const dStr =
      r.deltaC != null && Number.isFinite(r.deltaC)
        ? `${r.deltaC >= 0 ? '+' : ''}${r.deltaC.toFixed(1)}`
        : '—'
    const vStr = Number.isFinite(r.vol)
      ? r.vol >= 1000
        ? `${(r.vol / 1000).toFixed(1)}k`
        : String(Math.round(r.vol))
      : '—'
    const line = `    ${cell(binCell, yesStr, dStr, vStr)}`
    if (isMoji) console.log(magenta(line))
    else console.log(line)
  }
  console.log(`    ${dim(bot)}`)
}

/**
 * @param {string} slug
 */
async function fetchEventBySlug(slug) {
  const res = await fetchWithTimeout(`${GAMMA_BASE}/events?slug=${encodeURIComponent(slug)}`)
  if (!res.ok) throw new Error(`Gamma ${res.status} ${res.statusText}`)
  const arr = await res.json()
  const raw = Array.isArray(arr) ? arr[0] : arr
  if (!raw) return null

  const markets = (raw.markets ?? []).map((m) => ({
    id: String(m.id ?? ''),
    question: String(m.question ?? ''),
    groupItemTitle: String(m.groupItemTitle ?? ''),
    clobTokenIds: String(m.clobTokenIds ?? '[]'),
    outcomePrices: String(m.outcomePrices ?? '[]'),
    lastTradePrice: typeof m.lastTradePrice === 'number' ? m.lastTradePrice : undefined,
    bestBid: typeof m.bestBid === 'number' ? m.bestBid : undefined,
    bestAsk: typeof m.bestAsk === 'number' ? m.bestAsk : undefined,
    volume: typeof m.volume === 'string' ? m.volume : undefined,
    volumeNum: typeof m.volumeNum === 'number' ? m.volumeNum : undefined,
    active: Boolean(m.active),
    closed: Boolean(m.closed),
  }))

  return {
    id: String(raw.id ?? ''),
    slug: String(raw.slug ?? ''),
    title: String(raw.title ?? ''),
    markets,
    active: Boolean(raw.active),
    closed: Boolean(raw.closed),
  }
}

/**
 * @param {{ lastTradePrice?: number, outcomePrices: string }} market
 */
function getYesPrice(market) {
  if (typeof market.lastTradePrice === 'number' && Number.isFinite(market.lastTradePrice)) {
    return market.lastTradePrice
  }
  try {
    const arr = JSON.parse(market.outcomePrices || '[]')
    const n = parseFloat(arr[0] ?? '0')
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

/**
 * Parse temperature bin from Polymarket market text (°F or °C).
 * Supports: "69-70°F", "18-19°C", exact "22°C", "17°C or below", "27°C or higher", ">=75°F".
 * @param {string} title
 * @returns {{ centerC: number, displayLabel: string, unit: 'C' | 'F' } | null}
 */
function parseTemperatureBin(title) {
  if (!title || typeof title !== 'string') return null
  const s = title.replace(/\u2212/g, '-').trim()

  const toCenterC = (value, unit) => (unit === 'F' ? ((value - 32) * 5) / 9 : value)

  const range = s.match(
    /(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*°?\s*([FC])\b/i
  )
  if (range) {
    const low = parseFloat(range[1])
    const high = parseFloat(range[2])
    const unit = range[3].toUpperCase() === 'F' ? 'F' : 'C'
    const mid = (low + high) / 2
    const centerC = toCenterC(mid, unit)
    return {
      centerC,
      displayLabel: `${low}–${high}°${unit}`,
      unit,
    }
  }

  // "17°C or below" / "65°F or below"
  const orBelow = s.match(
    /^(\d+(?:\.\d+)?)\s*°\s*([FC])\s+or\s+below$/i
  )
  if (orBelow) {
    const v = parseFloat(orBelow[1])
    const unit = orBelow[2].toUpperCase() === 'F' ? 'F' : 'C'
    const center = v - 0.5
    return {
      centerC: toCenterC(center, unit),
      displayLabel: `${v}°${unit} or below`,
      unit,
    }
  }

  // "27°C or higher" / "80°F or higher"
  const orHigher = s.match(
    /^(\d+(?:\.\d+)?)\s*°\s*([FC])\s+or\s+higher$/i
  )
  if (orHigher) {
    const v = parseFloat(orHigher[1])
    const unit = orHigher[2].toUpperCase() === 'F' ? 'F' : 'C'
    const center = v + 0.5
    return {
      centerC: toCenterC(center, unit),
      displayLabel: `${v}°${unit} or higher`,
      unit,
    }
  }

  // Exact "18°C" / "65°F" (Gamma often uses discrete bins, no range)
  const exact = s.match(/^(\d+(?:\.\d+)?)\s*°\s*([FC])$/i)
  if (exact) {
    const v = parseFloat(exact[1])
    const unit = exact[2].toUpperCase() === 'F' ? 'F' : 'C'
    return {
      centerC: toCenterC(v, unit),
      displayLabel: `${v}°${unit}`,
      unit,
    }
  }

  const gte = s.match(/(?:≥|>=)\s*(\d+(?:\.\d+)?)\s*°?\s*([FC])\b/i)
  if (gte) {
    const v = parseFloat(gte[1])
    const unit = gte[2].toUpperCase() === 'F' ? 'F' : 'C'
    const centerC = unit === 'F' ? ((v - 32) * 5) / 9 : v
    return { centerC, displayLabel: `≥${v}°${unit}`, unit }
  }

  const lte = s.match(/(?:≤|<=)\s*(\d+(?:\.\d+)?)\s*°?\s*([FC])\b/i)
  if (lte) {
    const v = parseFloat(lte[1])
    const unit = lte[2].toUpperCase() === 'F' ? 'F' : 'C'
    const centerC = unit === 'F' ? ((v - 32) * 5) / 9 : v
    return { centerC, displayLabel: `≤${v}°${unit}`, unit }
  }

  return null
}

/** @param {Record<string, unknown>} market */
function marketBin(market) {
  const title = market.groupItemTitle?.trim() || market.question?.trim() || ''
  return parseTemperatureBin(title)
}

/**
 * @param {Array<{ centerC: number }>} bins
 * @param {number} mojiMaxC
 */
function indexOfClosestBin(bins, mojiMaxC) {
  if (bins.length === 0 || mojiMaxC == null || !Number.isFinite(mojiMaxC)) return -1
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < bins.length; i++) {
    const d = Math.abs(bins[i].centerC - mojiMaxC)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

function formatPct(p) {
  if (!Number.isFinite(p)) return '—'
  return `${(p * 100).toFixed(1)}%`
}

async function main() {
  parseArgs()

  const stats = {
    citiesTotal: 0,
    cityRuns: 0,
    dayRuns: 0,
    gammaErrors: 0,
    noEvent: 0,
    noBinsParsed: 0,
    weatherErrors: 0,
  }

  let cities = CITIES.filter((c) => typeof c.moji === 'string' && c.moji.length > 0)
  if (cli.cityFilter) {
    cities = cities.filter((c) => cli.cityFilter.has(c.id))
    const missing = [...cli.cityFilter].filter((id) => !cities.some((c) => c.id === id))
    if (missing.length) {
      console.warn(yellow(`警告: 以下 id 无 moji 或未找到: ${missing.join(', ')}`))
    }
  }

  stats.citiesTotal = cities.length
  console.log(
    dim(`Polymarket Gamma: ${GAMMA_BASE} · 城市数: ${cities.length} · 三天 · MM DD 为各城市本地日期`)
  )
  console.log()

  let isFirstCity = true
  for (const city of cities) {
    stats.cityRuns++
    if (!isFirstCity) console.log('')
    isFirstCity = false
    console.log('')
    console.log(cyan('═'.repeat(76)))
    console.log(`  ${bold(city.name)}  ${dim(`(${city.id})`)}`)
    console.log(dim(`  ${city.timezone}`))
    console.log(dim(`  moji: ${city.moji}`))

    let weather
    try {
      weather = await getWeather(city.moji)
    } catch (e) {
      stats.weatherErrors++
      console.log(`  ${yellow('天气')} ${yellow('失败')}: ${e instanceof Error ? e.message : e}`)
      console.log()
      continue
    }

    const byLabel = new Map(weather.forecast.map((d) => [d.label, d]))

    for (const { index: dayIndex, key, label: dayZh } of DAY_LABELS) {
      stats.dayRuns++
      if (dayIndex > 0) console.log('')
      const mmdd = formatDateMMDD(city.timezone, dayIndex)
      const dayForecast = byLabel.get(key)
      const mojiMax = dayForecast?.maxTemp
      const slug = getPolymarketSlug(city.id, dayIndex, city.timezone)
      const polEventUrl = `${POLYMARKET_WEB_EVENT_BASE}/${slug}`

      console.log(`  ${bold(cyan(`${mmdd}  ·  ${dayZh}`))}  ${dim(polEventUrl)}`)

      if (mojiMax == null || !Number.isFinite(mojiMax)) {
        console.log(`    ${yellow('墨迹最高温')} —`)
      } else {
        console.log(
          `    ${magenta('★ 墨迹预测最高温')}: ${bold(String(mojiMax))}°C`
        )
      }

      let event
      try {
        event = await fetchEventBySlug(slug)
      } catch (e) {
        stats.gammaErrors++
        const msg = e instanceof Error ? e.message : String(e)
        const cause =
          e instanceof Error && e.cause != null
            ? ` | cause: ${e.cause instanceof Error ? e.cause.message : String(e.cause)}`
            : ''
        console.log(`    ${yellow('Polymarket')}: ${msg}${cause}`)
        continue
      }

      if (!event) {
        stats.noEvent++
        console.log(`    ${yellow('无此事件或空返回')}`)
        continue
      }

      let pool = event.markets.filter((m) => m.active || !m.closed)
      if (pool.length === 0) pool = event.markets
      const rows = []
      for (const m of pool) {
        const bin = marketBin(m)
        if (!bin) continue
        const yes = getYesPrice(m)
        const vol =
          m.volumeNum ?? (m.volume ? parseFloat(m.volume) : NaN)
        rows.push({
          market: m,
          ...bin,
          yes,
          vol,
          deltaC:
            mojiMax != null && Number.isFinite(mojiMax)
              ? bin.centerC - mojiMax
              : null,
        })
      }

      if (rows.length === 0) {
        stats.noBinsParsed++
        console.log(
          `    ${yellow('无可用温度档位')}(可能市场关闭或标题无法解析)`
        )
        continue
      }

      rows.sort((a, b) => a.centerC - b.centerC)
      const visible = rows.filter((r) => r.yes >= YES_MIN_DISPLAY)
      if (visible.length === 0) {
        console.log(
          `    ${yellow('过滤后无档位')}(全部档位 YES<${(YES_MIN_DISPLAY * 100).toFixed(0)}%，已隐藏)`
        )
        continue
      }
      if (visible.length < rows.length) {
        console.log(
          dim(
            `    已隐藏 ${rows.length - visible.length} 个 YES<${(YES_MIN_DISPLAY * 100).toFixed(0)}% 的档位（余 ${visible.length} 档）`
          )
        )
      }

      const closestIdx = indexOfClosestBin(visible, mojiMax ?? NaN)
      printMarketTable({ rows: visible, closestIdx, mojiMax })
      if (closestIdx >= 0 && mojiMax != null && Number.isFinite(mojiMax)) {
        console.log(
          dim(`    ★ = 与墨迹最高温 (${mojiMax}°C) 最接近的档位`)
        )
      }
    }

    console.log()
  }

  console.log(bold('— 汇总 —'))
  console.log(
    `  城市: ${stats.cityRuns}/${stats.citiesTotal} · 天次: ${stats.dayRuns} · 天气失败: ${stats.weatherErrors} · Gamma 请求失败: ${stats.gammaErrors} · 无事件: ${stats.noEvent} · 无档位: ${stats.noBinsParsed}`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
