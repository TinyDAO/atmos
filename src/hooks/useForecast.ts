import { useState, useEffect } from 'react'
import { fetchForecast, type OpenMeteoForecast } from '../services/openMeteo'

export function useForecast(lat: number | null, lon: number | null) {
  const [data, setData] = useState<OpenMeteoForecast | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (lat == null || lon == null) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    fetchForecast(lat, lon)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to fetch'))
      .finally(() => setLoading(false))
  }, [lat, lon])

  return { data, loading, error }
}
