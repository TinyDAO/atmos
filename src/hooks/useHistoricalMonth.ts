import { useState, useEffect } from 'react'
import { fetchHistoricalMonth, aggregateSameMonthAverages } from '../services/historicalWeather'

export type HistoricalMonthPoint = { day: number; avgMax: number; years: number }

export function useHistoricalMonth(
  lat: number | null,
  lon: number | null,
  timezone: string,
  yearsBack = 5
) {
  const [data, setData] = useState<HistoricalMonthPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (lat == null || lon == null) {
      setData([])
      return
    }
    setLoading(true)
    setError(null)
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const promises: Promise<{ time: string[]; temperature_2m_max: number[] }>[] = []
    for (let y = 0; y < yearsBack; y++) {
      const year = currentYear - 1 - y
      if (year >= 1940) {
        promises.push(fetchHistoricalMonth(lat, lon, year, currentMonth, timezone))
      }
    }

    Promise.all(promises)
      .then((results) => {
        setData(aggregateSameMonthAverages(results))
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to fetch')
        setData([])
      })
      .finally(() => setLoading(false))
  }, [lat, lon, timezone, yearsBack])

  return { data, loading, error }
}
