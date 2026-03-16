import { useRef, useCallback, useState, useEffect } from 'react'
import html2canvas from 'html2canvas-pro'
import { MetarHistoryChart } from '../MetarHistoryChart'
import type { City } from '../../config/cities'
import type { MetarDayData } from '../../utils/metarParser'
import type { WindAnalysis } from '../../utils/windAnalysis'
import { SITE_NAME, SITE_URL } from '../../config/site'
import { ShareLogo } from '../ShareLogo'
import { useTranslation } from '../../hooks/useTranslation'

interface AviationShareModalProps {
  city: City
  metar: string | null
  metarHistoryByDays: MetarDayData[]
  metarObservedAt: Date | null
  metarTemp: number | null
  metarHistoryMaxTemp: number | null
  windAnalysis: WindAnalysis | null
  onClose: () => void
}

export function AviationShareModal({
  city,
  metar,
  metarHistoryByDays,
  metarObservedAt,
  metarTemp,
  metarHistoryMaxTemp,
  windAnalysis,
  onClose,
}: AviationShareModalProps) {
  const { t } = useTranslation()
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
            {t('share.title')}
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
            className="w-full bg-white p-3 text-zinc-800"
          >
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-200">
              <div className="flex items-center gap-1.5">
                <ShareLogo className="w-6 h-6 shrink-0" />
                <span className="text-base font-semibold text-zinc-900">{SITE_NAME}</span>
              </div>
              <span className="text-[10px] text-zinc-500">{SITE_URL.replace(/^https?:\/\//, '')}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  {city.name}, {city.country} · {city.icao}
                </h2>
              </div>
              <div className="flex gap-3 text-xs shrink-0">
                {metarTemp != null && <span className="font-medium">{metarTemp}°C</span>}
                {metarHistoryMaxTemp != null && (
                  <span className="text-zinc-600">{t('share.max')} {metarHistoryMaxTemp.toFixed(1)}°C</span>
                )}
              </div>
            </div>
            {metar && (
              <div className="mb-2 py-1.5 px-2 bg-zinc-50 rounded border border-zinc-100">
                <p className="text-[10px] text-zinc-500 mb-0.5 font-medium">METAR</p>
                <p className="text-[11px] font-mono text-zinc-700 leading-tight break-all">{metar}</p>
              </div>
            )}
            {windAnalysis && (
              <div className="mb-2 py-1.5 px-2 bg-zinc-50 rounded border border-zinc-100">
                <p className="text-[10px] text-zinc-500 mb-0.5 font-medium">{t('share.wind')}</p>
                <div className="text-[10px] text-zinc-600 leading-tight space-y-0.5">
                  {windAnalysis.origin && <p>{windAnalysis.origin}</p>}
                  {windAnalysis.characteristics.length > 0 && (
                    <p>{windAnalysis.characteristics.join('; ')}</p>
                  )}
                  {windAnalysis.weatherImpact && <p>{windAnalysis.weatherImpact}</p>}
                  {windAnalysis.turbulenceWarnings.length > 0 && (
                    <p>{windAnalysis.turbulenceWarnings.join(' ')}</p>
                  )}
                </div>
              </div>
            )}
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
              <p className="text-[10px] text-zinc-500 mt-2">
                {t('aviation.observed')} {formatTime(metarObservedAt)} local
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
                  {t('share.downloading')}
                </>
              ) : (
                t('share.downloadImage')
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
                  {t('share.copying')}
                </>
              ) : copyFeedback === 'copied' ? (
                t('share.copied')
              ) : copyFeedback === 'downloaded' ? (
                t('share.downloaded')
              ) : (
                t('share.copyImage')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
