import { useRef, useCallback, useState, useEffect } from 'react'
import html2canvas from 'html2canvas-pro'
import { MetarHistoryChart } from '../MetarHistoryChart'
import type { City } from '../../config/cities'
import type { MetarDayData } from '../../utils/metarParser'
import { SITE_NAME, SITE_URL, SITE_LOGO } from '../../config/site'

interface AviationShareModalProps {
  city: City
  metarHistoryByDays: MetarDayData[]
  metarObservedAt: Date | null
  metarTemp: number | null
  metarHistoryMaxTemp: number | null
  onClose: () => void
}

export function AviationShareModal({
  city,
  metarHistoryByDays,
  metarObservedAt,
  metarTemp,
  metarHistoryMaxTemp,
  onClose,
}: AviationShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [copyFeedback, setCopyFeedback] = useState<'copied' | 'downloaded' | null>(null)
  const [loading, setLoading] = useState<'download' | 'copy' | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const formatTime = (d: Date) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: city.timezone,
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return
    setLoading('download')
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: false,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `aviation-weather-${city.id}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('Failed to capture image:', e)
    } finally {
      setLoading(null)
    }
  }, [city.id])

  const handleCopy = useCallback(async () => {
    if (!cardRef.current) return
    setCopyFeedback(null)
    setLoading('copy')
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: false,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png')
      })
      if (!blob) return
      if (navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ])
          setCopyFeedback('copied')
          setTimeout(() => setCopyFeedback(null), 2000)
          return
        } catch {
          /* clipboard may not support images, fallback to download */
        }
      }
      /* Fallback: download when clipboard fails or unsupported */
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `aviation-weather-${city.id}-${Date.now()}.png`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
      setCopyFeedback('downloaded')
      setTimeout(() => setCopyFeedback(null), 2000)
    } catch (e) {
      console.error('Failed to copy image:', e)
    } finally {
      setLoading(null)
    }
  }, [city.id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl shadow-xl w-[min(576px,100%-2rem)] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Share Aviation Weather
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 pt-4 pb-8 space-y-6">
          {/* Share card - rendered with light theme for clean image */}
          <div
            ref={cardRef}
            className="w-full bg-white p-4 text-zinc-800"
          >
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <img src={SITE_LOGO} alt="" className="w-8 h-8 shrink-0" />
                <span className="text-lg font-semibold text-zinc-900">{SITE_NAME}</span>
              </div>
              <span className="text-xs text-zinc-500">{SITE_URL.replace(/^https?:\/\//, '')}</span>
            </div>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-zinc-900">
                {city.name}, {city.country}
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                Aviation Weather · {city.icao}
              </p>
            </div>
            <div className="flex gap-4 mb-3 text-sm">
              {metarTemp != null && (
                <span className="font-medium">
                  Current {metarTemp}°C
                </span>
              )}
              {metarHistoryMaxTemp != null && (
                <span className="text-zinc-600">
                  Today max so far {metarHistoryMaxTemp.toFixed(1)}°C
                </span>
              )}
            </div>
            <div className="overflow-hidden">
              <MetarHistoryChart
                days={metarHistoryByDays}
                icao={city.icao}
                timezone={city.timezone}
                loading={false}
                compact
              />
            </div>
            {metarObservedAt && (
              <p className="text-xs text-zinc-500 mt-3">
                Observed {formatTime(metarObservedAt)} local
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!!loading}
              className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading === 'download' ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  Downloading...
                </>
              ) : (
                'Download image'
              )}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!!loading}
              className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading === 'copy' ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                  Copying...
                </>
              ) : copyFeedback === 'copied' ? (
                'Copied!'
              ) : copyFeedback === 'downloaded' ? (
                'Downloaded'
              ) : (
                'Copy image'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
