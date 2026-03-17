/** Polymarket Gamma API event & markets */
export interface PolymarketMarket {
  id: string
  question: string
  groupItemTitle: string
  clobTokenIds: string
  outcomePrices: string
  lastTradePrice?: number
  bestBid?: number
  bestAsk?: number
  volume?: string
  volumeNum?: number
  active: boolean
  closed: boolean
}

export interface PolymarketEvent {
  id: string
  slug: string
  title: string
  markets: PolymarketMarket[]
  active: boolean
  closed: boolean
}

// Use proxy paths to avoid CORS (Vite proxy in dev, Vercel rewrites in prod)
const GAMMA_BASE = '/polymarket-gamma'
const CLOB_BASE = '/polymarket-clob'

/** Fetch event by slug from Gamma API */
export async function fetchEventBySlug(slug: string): Promise<PolymarketEvent | null> {
  const res = await fetch(`${GAMMA_BASE}/events?slug=${encodeURIComponent(slug)}`)
  if (!res.ok) throw new Error('Failed to fetch Polymarket event')
  const arr = await res.json()
  const raw = Array.isArray(arr) ? arr[0] : arr
  if (!raw) return null

  const markets: PolymarketMarket[] = (raw.markets ?? []).map((m: Record<string, unknown>) => ({
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

export interface OrderBookLevel {
  price: string
  size: string
}

export interface OrderBookSummary {
  asset_id: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  last_trade_price: string
}

/** Fetch order books for multiple token IDs (Yes outcome token = first in pair) */
export async function fetchOrderBooks(
  tokenIds: string[]
): Promise<Map<string, OrderBookSummary>> {
  if (tokenIds.length === 0) return new Map()

  const body = tokenIds.map((token_id) => ({ token_id }))
  const res = await fetch(`${CLOB_BASE}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to fetch Polymarket order books')
  const arr = await res.json()
  const map = new Map<string, OrderBookSummary>()
  const resArr = Array.isArray(arr) ? arr : []
  for (let i = 0; i < resArr.length && i < tokenIds.length; i++) {
    const b = resArr[i]
    const tokenId = tokenIds[i]
    if (b && tokenId) {
      const book: OrderBookSummary = {
        asset_id: b.asset_id ?? tokenId,
        bids: Array.isArray(b.bids) ? b.bids : [],
        asks: Array.isArray(b.asks) ? b.asks : [],
        last_trade_price: String(b.last_trade_price ?? '0'),
      }
      map.set(tokenId, book)
      if (b.asset_id && b.asset_id !== tokenId) map.set(b.asset_id, book)
    }
  }
  return map
}
