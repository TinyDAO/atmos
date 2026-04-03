import { useEffect, useMemo, useState } from 'react'
import type { Lang } from './useLanguage'

const HKO_JSON_PATH = '/hko-wxinfo/json/one_json.xml'

export interface HkoObservatoryState {
  temperature: string | null
  /** Formatted bulletin time in Hong Kong time */
  reportTimeFormatted: string | null
  loading: boolean
  error: boolean
}

function bulletinRawToFormatted(raw: string | null, lang: Lang): string | null {
  if (!raw) return null
  const d = parseBulletinTimeToDate(raw)
  return d ? formatHkoReportTime(d, lang) : raw
}

function parseBulletinTimeToDate(bulletinTime: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(bulletinTime.trim())
  if (!m) return null
  const [, y, mo, d, h, min] = m
  return new Date(`${y}-${mo}-${d}T${h}:${min}:00+08:00`)
}

export function formatHkoReportTime(date: Date, lang: Lang): string {
  const locale = lang === 'zh' ? 'zh-HK' : 'en-HK'
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Hong_Kong',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function useHongKongObservatory(enabled: boolean, lang: Lang): HkoObservatoryState {
  const [temperature, setTemperature] = useState<string | null>(null)
  const [bulletinTimeRaw, setBulletinTimeRaw] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const reportTimeFormatted = useMemo(
    () => bulletinRawToFormatted(bulletinTimeRaw, lang),
    [bulletinTimeRaw, lang],
  )

  useEffect(() => {
    if (!enabled) {
      setTemperature(null)
      setBulletinTimeRaw(null)
      setLoading(false)
      setError(false)
      return
    }

    let cancelled = false
    setTemperature(null)
    setBulletinTimeRaw(null)
    setLoading(true)
    setError(false)

    ;(async () => {
      try {
        const res = await fetch(HKO_JSON_PATH)
        if (!res.ok || cancelled) {
          if (!cancelled) setError(true)
          return
        }
        const data = (await res.json()) as { hko?: { Temperature?: string; BulletinTime?: string } }
        const hko = data?.hko
        if (cancelled) return
        const temp = hko?.Temperature != null ? String(hko.Temperature) : null
        setTemperature(temp)
        setBulletinTimeRaw(hko?.BulletinTime != null ? String(hko.BulletinTime) : null)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { temperature, reportTimeFormatted, loading, error }
}
