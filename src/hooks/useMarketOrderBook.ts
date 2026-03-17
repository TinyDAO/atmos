import { useEffect, useState } from 'react'
import { fetchOrderBooks, type OrderBookSummary } from '../services/polymarket'

export function useMarketOrderBook(clobTokenIds: string, enabled: boolean): {
  orderBookYes: OrderBookSummary | null
  orderBookNo: OrderBookSummary | null
  loading: boolean
} {
  const [orderBookYes, setOrderBookYes] = useState<OrderBookSummary | null>(null)
  const [orderBookNo, setOrderBookNo] = useState<OrderBookSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    setOrderBookYes(null)
    setOrderBookNo(null)

    async function run() {
      try {
        const ids = JSON.parse(clobTokenIds || '[]') as string[]
        const yesToken = ids[0]
        const noToken = ids[1]
        if (!yesToken) {
          setLoading(false)
          return
        }
        const tokenIds = noToken ? [yesToken, noToken] : [yesToken]
        const books = await fetchOrderBooks(tokenIds)
        if (cancelled) return
        setOrderBookYes(books.get(yesToken) ?? null)
        setOrderBookNo(noToken ? books.get(noToken) ?? null : null)
      } catch {
        if (!cancelled) {
          setOrderBookYes(null)
          setOrderBookNo(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [clobTokenIds, enabled])

  return { orderBookYes, orderBookNo, loading }
}
