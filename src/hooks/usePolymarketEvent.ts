import { useEffect, useState } from 'react'
import { fetchEventBySlug, type PolymarketEvent, type PolymarketMarket } from '../services/polymarket'
import { getPolymarketSlug } from '../utils/polymarketSlug'

export type PolymarketMarketWithBook = PolymarketMarket

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

  return {
    event,
    marketsWithBooks: event?.markets ?? [],
    loading,
    error,
  }
}
