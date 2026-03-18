import { useState, useEffect, useCallback } from 'react'

const REFETCH_EVENT = 'refetch-points'

export function usePoints(address: string | undefined) {
  const [points, setPoints] = useState<number | null>(null)

  const refetch = useCallback(async () => {
    if (!address) return
    try {
      const res = await fetch(`/api/points?address=${encodeURIComponent(address)}`)
      const data = await res.json()
      if (res.ok) setPoints(data.points ?? 0)
    } catch {
      setPoints(null)
    }
  }, [address])

  useEffect(() => {
    if (!address) {
      setPoints(null)
      return
    }
    refetch()
  }, [address, refetch])

  useEffect(() => {
    const handler = () => refetch()
    window.addEventListener(REFETCH_EVENT, handler)
    return () => window.removeEventListener(REFETCH_EVENT, handler)
  }, [refetch])

  return { points, refetch }
}

export function dispatchRefetchPoints() {
  window.dispatchEvent(new CustomEvent(REFETCH_EVENT))
}
