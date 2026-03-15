import { useState } from 'react'
import { motion } from 'framer-motion'
import { decodeMetarToPlain, decodeTafToPlain, filterTafForTomorrow } from '../../utils/aviationDecoder'
import { TempDisplay } from '../TempDisplay'
import { parseTemperatureFromMetar, parseTimestampFromMetar, parseWindFromMetar, parseTafIssuanceTime } from '../../utils/metarParser'
import { analyzeWind } from '../../utils/windAnalysis'
import { useTranslation } from '../../hooks/useTranslation'
import { AiAnalysisPanel } from '../AiAnalysisPanel'

interface AviationWeatherProps {
  metar: string | null
  taf: string | null
  icao: string
  timezone: string
  latitude: number
  dayIndex: number
  forecastMaxTemp: number | null
  metarHistoryMaxTemp: number | null
  loading: boolean
  error: string | null
  onShare?: () => void
}

export function AviationWeather({
  metar,
  taf,
  icao,
  timezone,
  latitude,
  dayIndex,
  forecastMaxTemp,
  metarHistoryMaxTemp,
  loading,
  error,
  onShare,
}: AviationWeatherProps) {
  const { t, lang } = useTranslation()
  const [showPlain, setShowPlain] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const metarPlain = metar ? decodeMetarToPlain(metar, timezone, undefined, lang) : ''
  const tafFiltered = dayIndex === 1 && taf ? filterTafForTomorrow(taf) : taf
  const tafPlain = tafFiltered ? decodeTafToPlain(tafFiltered, timezone, lang) : ''
  const metarTemp = parseTemperatureFromMetar(metar)
  const metarObservedAt = parseTimestampFromMetar(metar)
  const tafIssuedAt = parseTafIssuanceTime(taf)
  const metarWind = metar ? parseWindFromMetar(metar) : null
  const windAnalysis =
    metarWind && (metarWind.speedKt != null || metarWind.variable)
      ? analyzeWind({
          dirDeg: metarWind.dirDeg,
          variable: metarWind.variable,
          speedKt: metarWind.speedKt,
          gustKt: metarWind.gustKt,
          timezone,
          latitude,
          lang,
        })
      : null

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 p-5"
      >
        <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
          <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{t('aviation.loading')}</span>
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 p-5 text-red-400 dark:text-red-400 text-sm"
      >
        {error}
      </motion.div>
    )
  }

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.08em]">
            {t('aviation.title')} ({icao})
          </h3>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
            {t('aviation.metarSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {metar && (
            <button
              type="button"
              onClick={() => setShowAi(!showAi)}
              title={t('aviation.aiAnalysis')}
              className={`p-1.5 rounded-lg transition-all ${
                showAi
                  ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </button>
          )}
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              title={t('aviation.shareTitle')}
              className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPlain(!showPlain)}
            title={showPlain ? t('aviation.showRaw') : t('aviation.showPlain')}
            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            {showPlain ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div className="p-5 space-y-5">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h4 className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">
                METAR {dayIndex === 1 && t('aviation.currentConditions')}
              </h4>
              {metarObservedAt && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {t('aviation.observed')} {new Intl.DateTimeFormat('en-US', {
                    timeZone: timezone,
                    month: 'numeric',
                    day: 'numeric',
                  }).format(metarObservedAt)}, {new Intl.DateTimeFormat('en-US', {
                    timeZone: timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }).format(metarObservedAt)} local · {new Intl.DateTimeFormat('en-US', {
                    timeZone: 'UTC',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }).format(metarObservedAt)}Z
                </p>
              )}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {t('aviation.reportFrequency')}
              </p>
            </div>
            {(metarTemp != null || forecastMaxTemp != null || (dayIndex === 0 && metarHistoryMaxTemp != null)) && (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {metarTemp != null && (
                    <TempDisplay value={metarTemp} prefix={t('aviation.currentTemp') + ' '} className="cursor-help" />
                  )}
                  {(metarTemp != null && (forecastMaxTemp != null || (dayIndex === 0 && metarHistoryMaxTemp != null))) && ' · '}
                  {dayIndex === 0 && metarHistoryMaxTemp != null && (
                    <TempDisplay value={metarHistoryMaxTemp} prefix={t('aviation.todayMaxSoFar') + ' '} suffix="" className="cursor-help" />
                  )}
                  {dayIndex === 0 && metarHistoryMaxTemp == null && forecastMaxTemp != null && (
                    <TempDisplay value={forecastMaxTemp} prefix={t('aviation.todayMax') + ' '} suffix="" className="cursor-help" />
                  )}
                  {dayIndex === 1 && forecastMaxTemp != null && (
                    <TempDisplay value={forecastMaxTemp} prefix={t('aviation.tomorrowMax') + ' '} className="cursor-help" />
                  )}
                </span>
                {((dayIndex === 0 && (metarHistoryMaxTemp != null || forecastMaxTemp != null)) || (dayIndex === 1 && forecastMaxTemp != null)) && (
                  <>
                    <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
                      {dayIndex === 0 && metarHistoryMaxTemp != null ? t('aviation.sourceMETAR') : t('aviation.sourceTAF')}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {t('common.dataDisclaimer')}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <pre className={`text-sm rounded-xl p-3.5 overflow-x-auto whitespace-pre-wrap break-words ${
            showPlain
              ? 'text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/40'
              : 'font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/40'
          }`}>
            {showPlain ? (metarPlain || metar || '—') : (metar ?? '—')}
          </pre>
          {windAnalysis && (
            <div className="mt-3 p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 space-y-2 text-xs">
              {windAnalysis.origin && (
                <p className="text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{windAnalysis.labels.origin}:</span> {windAnalysis.origin}
                </p>
              )}
              {windAnalysis.characteristics.length > 0 && (
                <p className="text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{windAnalysis.labels.characteristics}:</span>{' '}
                  {windAnalysis.characteristics.join('; ')}
                </p>
              )}
              {windAnalysis.weatherImpact && (
                <p className="text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{windAnalysis.labels.weatherImpact}:</span>{' '}
                  {windAnalysis.weatherImpact}
                </p>
              )}
              {windAnalysis.turbulenceWarnings.length > 0 && (
                <div>
                  <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">{windAnalysis.labels.vfrTurbulence}:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-zinc-600 dark:text-zinc-400">
                    {windAnalysis.turbulenceWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {dayIndex === 1 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('aviation.metarNoTomorrow')}</p>
          )}
        </div>
        <div>
          <div className="mb-2">
            <h4 className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">
              TAF {dayIndex === 1 && t('aviation.tafTomorrow')}
            </h4>
            {tafIssuedAt && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {t('aviation.issued')} {new Intl.DateTimeFormat('en-US', {
                  timeZone: timezone,
                  month: 'numeric',
                  day: 'numeric',
                }).format(tafIssuedAt)}, {new Intl.DateTimeFormat('en-US', {
                  timeZone: timezone,
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }).format(tafIssuedAt)} local · {new Intl.DateTimeFormat('en-US', {
                  timeZone: 'UTC',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }).format(tafIssuedAt)}Z
              </p>
            )}
          </div>
          <pre className={`text-sm rounded-xl p-3.5 overflow-x-auto whitespace-pre-wrap break-words ${
            showPlain
              ? 'text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/40'
              : 'font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/40'
          }`}>
            {showPlain ? (tafPlain || tafFiltered || '—') : (tafFiltered ?? '—')}
          </pre>
          {dayIndex === 1 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('aviation.filteredTomorrow')}</p>
          )}
        </div>
      </div>
    </motion.div>
    {showAi && metar && (
      <AiAnalysisPanel
        metar={metar}
        taf={taf}
        icao={icao}
        lang={lang}
        onClose={() => setShowAi(false)}
      />
    )}
    </>
  )
}
