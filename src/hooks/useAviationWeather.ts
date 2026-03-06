import { useState, useEffect } from 'react'
import { fetchMetar, fetchTaf, fetchMetarHistory } from '../services/aviationWeather'
import { parseMaxTempFromMetarHistoryLocalToday, parseMaxTempFromMetarRemarks, parseMetarHistoryByDays } from '../utils/metarParser'

export function useAviationWeather(icao: string | null, timezone: string) {
  const [metar, setMetar] = useState<string | null>(null)
  const [taf, setTaf] = useState<string | null>(null)
  const [metarHistoryMaxTemp, setMetarHistoryMaxTemp] = useState<number | null>(null)
  const [metarHistoryByDays, setMetarHistoryByDays] = useState<ReturnType<typeof parseMetarHistoryByDays>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!icao) {
      setMetar(null)
      setTaf(null)
      setMetarHistoryMaxTemp(null)
      setMetarHistoryByDays([])
      return
    }
    setLoading(true)
    setError(null)
    Promise.all([fetchMetar(icao), fetchTaf(icao), fetchMetarHistory(icao, 360)])
      .then(([m, t, history]) => {
        setMetar(m)
        setTaf(t)
        const txFromRemarks = parseMaxTempFromMetarRemarks(m)
        const maxFromHistory = parseMaxTempFromMetarHistoryLocalToday(history, timezone)
        setMetarHistoryMaxTemp(txFromRemarks ?? maxFromHistory)
        setMetarHistoryByDays(parseMetarHistoryByDays(history, timezone))
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to fetch')
        setMetarHistoryMaxTemp(null)
        setMetarHistoryByDays([])
      })
      .finally(() => setLoading(false))
  }, [icao, timezone])

  return { metar, taf, metarHistoryMaxTemp, metarHistoryByDays, loading, error }
}
