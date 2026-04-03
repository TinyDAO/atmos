import { motion } from 'framer-motion'
import { TempDisplay } from '../TempDisplay'
import { useTranslation } from '../../hooks/useTranslation'

interface SourceForecast {
  source: string
  maxTemp: number | null
  minTemp: number | null
}

export interface HkoForecastExtra {
  temperature: string | null
  reportTimeFormatted: string | null
  loading: boolean
  error: boolean
}

interface WeatherForecastProps {
  maxTemp: number | null
  minTemp: number | null
  dayIndex: number
  onDayChange: (index: number) => void
  sources?: SourceForecast[]
  loading: boolean
  error: string | null
  /** Hong Kong Observatory live reading (Hong Kong city only) */
  hko?: HkoForecastExtra | null
}

const cardBase =
  'rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50'

function HkoForecastSection({ hko }: { hko: HkoForecastExtra }) {
  const { t } = useTranslation()
  return (
    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
      <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.08em] mb-2">
        {t('forecast.hkoTitle')}
      </p>
      {hko.loading ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{t('forecast.hkoLoading')}</p>
      ) : hko.error ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{t('forecast.hkoUnavailable')}</p>
      ) : (
        <div className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="text-zinc-500 dark:text-zinc-500 text-xs">{t('forecast.hkoLiveTemp')}</span>
            <span className="font-display text-2xl font-light tabular-nums">
              {hko.temperature != null ? `${hko.temperature}°` : '—'}
            </span>
          </div>
          {hko.reportTimeFormatted ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              {t('forecast.hkoReportTime')}: {hko.reportTimeFormatted}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function WeatherForecast({
  maxTemp,
  minTemp,
  dayIndex,
  onDayChange,
  sources = [],
  loading,
  error,
  hko = null,
}: WeatherForecastProps) {
  const { t } = useTranslation()
  const dayLabels = [t('common.today'), t('common.tomorrow')]

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`${cardBase} p-5 h-full flex flex-col min-h-[140px]`}
      >
        <div className="flex flex-1 items-center justify-center gap-2 text-zinc-400 dark:text-zinc-500">
          <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-sm">{t('forecast.loading')}</span>
        </div>
        {hko ? <HkoForecastSection hko={hko} /> : null}
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`${cardBase} p-5 flex flex-col gap-0`}
      >
        <p className="text-red-400 dark:text-red-400 text-sm">{error}</p>
        {hko ? <HkoForecastSection hko={hko} /> : null}
      </motion.div>
    )
  }

  if (maxTemp == null) {
    if (!hko) return null
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`${cardBase} p-5 h-full flex flex-col min-h-0`}
      >
        <HkoForecastSection hko={hko} />
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-col gap-0.5">
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-500">
            {t('forecast.primarySource')}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{t('common.dataDisclaimer')}</span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`${cardBase} p-5 h-full flex flex-col min-h-0`}
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.08em]">
          {dayLabels[dayIndex]} {t('forecast.max')}
        </h3>
        <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
          {dayLabels.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => onDayChange(i)}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                dayIndex === i
                  ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900'
                  : 'bg-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center min-h-[100px]">
        <div className="flex items-baseline gap-4">
          <span className="font-display text-6xl md:text-7xl font-light text-zinc-900 dark:text-white tabular-nums tracking-tight">
            <TempDisplay value={maxTemp} className="cursor-help" />
          </span>
          <span className="text-xl text-zinc-400 dark:text-zinc-500">
            <span className="text-zinc-500 dark:text-zinc-500 text-sm mr-1">{t('forecast.low')}</span>
            {minTemp != null ? <TempDisplay value={minTemp} className="cursor-help" /> : '—'}
          </span>
        </div>
      </div>
      {sources.length > 1 && (
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-2 tracking-wide">{t('forecast.multiSource')}</p>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <span
                key={s.source}
                className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
              >
                {s.source}: {s.maxTemp != null ? <TempDisplay value={s.maxTemp} className="cursor-help" /> : '—'}
              </span>
            ))}
          </div>
        </div>
      )}
      {hko ? <HkoForecastSection hko={hko} /> : null}
      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-col gap-0.5">
        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-500">
          {t('forecast.primarySource')}
        </span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {t('common.dataDisclaimer')}
        </span>
      </div>
    </motion.div>
  )
}
