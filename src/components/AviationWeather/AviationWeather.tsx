import { useState } from 'react'
import { motion } from 'framer-motion'
import { decodeMetarToPlain, decodeTafToPlain, filterTafForTomorrow } from '../../utils/aviationDecoder'
import { TempDisplay } from '../TempDisplay'
import { parseTemperatureFromMetar } from '../../utils/metarParser'

interface AviationWeatherProps {
  metar: string | null
  taf: string | null
  icao: string
  timezone: string
  dayIndex: number
  forecastMaxTemp: number | null
  metarHistoryMaxTemp: number | null
  loading: boolean
  error: string | null
}

export function AviationWeather({
  metar,
  taf,
  icao,
  timezone,
  dayIndex,
  forecastMaxTemp,
  metarHistoryMaxTemp,
  loading,
  error,
}: AviationWeatherProps) {
  const [showPlain, setShowPlain] = useState(false)
  const metarPlain = metar ? decodeMetarToPlain(metar, timezone) : ''
  const tafFiltered = dayIndex === 1 && taf ? filterTafForTomorrow(taf) : taf
  const tafPlain = tafFiltered ? decodeTafToPlain(tafFiltered, timezone) : ''
  const metarTemp = parseTemperatureFromMetar(metar)

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-300/50 dark:border-zinc-700/50 p-4"
      >
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading aviation weather...</span>
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl bg-red-900/20 border border-red-800/50 p-4 text-red-300"
      >
        {error}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-300/50 dark:border-zinc-700/50 overflow-hidden"
    >
      <div className="px-4 py-2.5 border-b border-zinc-300/50 dark:border-zinc-700/50 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            Aviation Weather ({icao})
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-500 mt-0.5">
            METAR & TAF from Aviation Weather Center
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPlain(!showPlain)}
          title={showPlain ? 'Show raw' : 'Show plain'}
          className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors"
        >
          {showPlain ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase">
              METAR {dayIndex === 1 && '(当前实况)'}
            </h4>
            {(metarTemp != null || forecastMaxTemp != null || (dayIndex === 0 && metarHistoryMaxTemp != null)) && (
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {metarTemp != null && (
                  <TempDisplay value={metarTemp} prefix="Current " className="cursor-help" />
                )}
                {(metarTemp != null && (forecastMaxTemp != null || (dayIndex === 0 && metarHistoryMaxTemp != null))) && ' · '}
                {dayIndex === 0 && metarHistoryMaxTemp != null && (
                  <TempDisplay value={metarHistoryMaxTemp} prefix="Today max " suffix=" (METAR)" className="cursor-help" />
                )}
                {dayIndex === 0 && metarHistoryMaxTemp == null && forecastMaxTemp != null && (
                  <TempDisplay value={forecastMaxTemp} prefix="Today max " suffix=" (forecast)" className="cursor-help" />
                )}
                {dayIndex === 1 && forecastMaxTemp != null && (
                  <TempDisplay value={forecastMaxTemp} prefix="Tomorrow max " className="cursor-help" />
                )}
              </span>
            )}
          </div>
          <pre className={`text-sm rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words ${
            showPlain
              ? 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900/50'
              : 'font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900/50'
          }`}>
            {showPlain ? (metarPlain || metar || '—') : (metar ?? '—')}
          </pre>
          {dayIndex === 1 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">METAR is real-time; no tomorrow data</p>
          )}
        </div>
        <div>
          <h4 className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase mb-2">
            TAF {dayIndex === 1 && '(tomorrow)'}
          </h4>
          <pre className={`text-sm rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words ${
            showPlain
              ? 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900/50'
              : 'font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900/50'
          }`}>
            {showPlain ? (tafPlain || tafFiltered || '—') : (tafFiltered ?? '—')}
          </pre>
          {dayIndex === 1 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Filtered to tomorrow period</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
