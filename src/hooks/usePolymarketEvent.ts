import { useEffect, useState } from 'react'
import {
  fetchEventBySlug,
  fetchOrderBooks,
  type PolymarketEvent,
  type PolymarketMarket,
  type OrderBookSummary,
} from '../services/polymarket'
import { getPolymarketSlug } from '../utils/polymarketSlug'

export interface PolymarketMarketWithBook extends PolymarketMarket {
  orderBook: OrderBookSummary | null
}

export interface PolymarketEventWithBooks {
  event: PolymarketEvent | null
  marketsWithBooks: PolymarketMarketWithBook[]
  loading: boolean
  error: string | null
}

export function usePolymarketEvent(
  cityId: string,
  timezone: string,
  dayIndex: number
): PolymarketEventWithBooks {
  const [event, setEvent] = useState<PolymarketEvent | null>(null)
  const [orderBooks, setOrderBooks] = useState<Map<string, OrderBookSummary>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)
      try {
        const slug = getPolymarketSlug(cityId, dayIndex, timezone)
        const ev = await fetchEventBySlug(slug)
        if (cancelled) return
        setEvent(ev ?? null)

        if (!ev?.markets?.length) {
          setLoading(false)
          return
        }

        const yesTokenIds: string[] = []
        const marketToToken: Record<string, string> = {}
        for (const m of ev.markets) {
          try {
            const ids = JSON.parse(m.clobTokenIds || '[]') as string[]
            const yesToken = ids[0]
            if (yesToken) {
              yesTokenIds.push(yesToken)
              marketToToken[m.id] = yesToken
            }
          } catch {
            // ignore
          }
        }

        if (yesTokenIds.length > 0) {
          try {
            const books = await fetchOrderBooks(yesTokenIds)
            if (!cancelled) setOrderBooks(books)
          } catch {
            // Order book fetch failed (e.g. CORS) - continue with Gamma data only
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [cityId, timezone, dayIndex])

  const marketsWithBooks: PolymarketMarketWithBook[] = (event?.markets ?? []).map((m) => {
    let tokenId = ''
    try {
      const ids = JSON.parse(m.clobTokenIds || '[]') as string[]
      tokenId = ids[0] ?? ''
    } catch {
      // ignore
    }
    return {
      ...m,
      orderBook: tokenId ? orderBooks.get(tokenId) ?? null : null,
    }
  })

  return { event, marketsWithBooks, loading, error }
}
