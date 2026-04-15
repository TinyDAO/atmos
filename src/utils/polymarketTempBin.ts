import type { PolymarketMarket } from '../services/polymarket'

const fToC = (f: number) => ((f - 32) * 5) / 9
const fmtC = (c: number) => c.toFixed(1)

export interface ParsedTempBin {
  centerC: number
  displayLabel: string
  unit: 'C' | 'F'
  /**
   * When `unit` is `F`, a °C line for dual display, e.g. `26.7–27.2°C` or `25.0°C or below`.
   * Omitted for Celsius bins.
   */
  celsiusHint?: string
}

export function getYesPrice(market: PolymarketMarket): number {
  if (typeof market.lastTradePrice === 'number' && Number.isFinite(market.lastTradePrice)) {
    return market.lastTradePrice
  }
  try {
    const arr = JSON.parse(market.outcomePrices || '[]') as string[]
    const n = parseFloat(arr[0] ?? '0')
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

/**
 * Parse temperature bin from Polymarket market text (same rules as scripts/scan.js).
 */
export function parseTemperatureBin(title: string): ParsedTempBin | null {
  if (!title || typeof title !== 'string') return null
  const s = title.replace(/\u2212/g, '-').trim()

  const toCenterC = (value: number, unit: 'C' | 'F') =>
    unit === 'F' ? ((value - 32) * 5) / 9 : value

  const range = s.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*°?\s*([FC])\b/i)
  if (range) {
    const low = parseFloat(range[1]!)
    const high = parseFloat(range[2]!)
    const unit = range[3]!.toUpperCase() === 'F' ? 'F' : 'C'
    const mid = (low + high) / 2
    const centerC = toCenterC(mid, unit)
    return {
      centerC,
      displayLabel: `${low}–${high}°${unit}`,
      unit,
      celsiusHint:
        unit === 'F' ? `${fmtC(fToC(low))}–${fmtC(fToC(high))}°C` : undefined,
    }
  }

  const orBelow = s.match(/^(\d+(?:\.\d+)?)\s*°\s*([FC])\s+or\s+below$/i)
  if (orBelow) {
    const v = parseFloat(orBelow[1]!)
    const unit = orBelow[2]!.toUpperCase() === 'F' ? 'F' : 'C'
    const center = v - 0.5
    return {
      centerC: toCenterC(center, unit),
      displayLabel: `${v}°${unit} or below`,
      unit,
      celsiusHint: unit === 'F' ? `${fmtC(fToC(v))}°C or below` : undefined,
    }
  }

  const orHigher = s.match(/^(\d+(?:\.\d+)?)\s*°\s*([FC])\s+or\s+higher$/i)
  if (orHigher) {
    const v = parseFloat(orHigher[1]!)
    const unit = orHigher[2]!.toUpperCase() === 'F' ? 'F' : 'C'
    const center = v + 0.5
    return {
      centerC: toCenterC(center, unit),
      displayLabel: `${v}°${unit} or higher`,
      unit,
      celsiusHint: unit === 'F' ? `${fmtC(fToC(v))}°C or higher` : undefined,
    }
  }

  const exact = s.match(/^(\d+(?:\.\d+)?)\s*°\s*([FC])$/i)
  if (exact) {
    const v = parseFloat(exact[1]!)
    const unit = exact[2]!.toUpperCase() === 'F' ? 'F' : 'C'
    return {
      centerC: toCenterC(v, unit),
      displayLabel: `${v}°${unit}`,
      unit,
      celsiusHint: unit === 'F' ? `${fmtC(fToC(v))}°C` : undefined,
    }
  }

  const gte = s.match(/(?:≥|>=)\s*(\d+(?:\.\d+)?)\s*°?\s*([FC])\b/i)
  if (gte) {
    const v = parseFloat(gte[1]!)
    const unit = gte[2]!.toUpperCase() === 'F' ? 'F' : 'C'
    const centerC = unit === 'F' ? ((v - 32) * 5) / 9 : v
    return {
      centerC,
      displayLabel: `≥${v}°${unit}`,
      unit,
      celsiusHint: unit === 'F' ? `≥${fmtC(fToC(v))}°C` : undefined,
    }
  }

  const lte = s.match(/(?:≤|<=)\s*(\d+(?:\.\d+)?)\s*°?\s*([FC])\b/i)
  if (lte) {
    const v = parseFloat(lte[1]!)
    const unit = lte[2]!.toUpperCase() === 'F' ? 'F' : 'C'
    const centerC = unit === 'F' ? ((v - 32) * 5) / 9 : v
    return {
      centerC,
      displayLabel: `≤${v}°${unit}`,
      unit,
      celsiusHint: unit === 'F' ? `≤${fmtC(fToC(v))}°C` : undefined,
    }
  }

  return null
}

export function marketBin(market: PolymarketMarket): ParsedTempBin | null {
  const title = market.groupItemTitle?.trim() || market.question?.trim() || ''
  return parseTemperatureBin(title)
}

/** Polymarket label plus Chinese-style parentheses with °C for °F bins — e.g. `80–81°F（26.7–27.2°C）`. */
export function formatBinLabelWithCelsius(bin: ParsedTempBin): string {
  if (bin.unit === 'F' && bin.celsiusHint) {
    return `${bin.displayLabel}（${bin.celsiusHint}）`
  }
  return bin.displayLabel
}

export function indexOfClosestBin<T extends { centerC: number }>(bins: T[], mojiMaxC: number): number {
  if (bins.length === 0 || !Number.isFinite(mojiMaxC)) return -1
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < bins.length; i++) {
    const d = Math.abs(bins[i]!.centerC - mojiMaxC)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}
