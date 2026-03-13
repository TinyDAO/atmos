import { motion } from 'framer-motion'
import { TempDisplay } from '../TempDisplay'

interface SourceForecast {
  source: string
  maxTemp: number | null
  minTemp: number | null
}

interface WeatherForecastProps {
  maxTemp: number | null
  minTemp: number | null
  dayIndex: number
  onDayChange: (index: number) => void
  sources?: SourceForecast[]
  loading: boolean
  error: string | null
}

const DAY_LABELS = ['Today', 'Tomorrow']

export function WeatherForecast({ maxTemp, minTemp, dayIndex, onDayChange, sources = [], loading, error }: WeatherForecastProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-300/50 dark:border-zinc-700/50 p-4 md:p-5 h-full flex items-center justify-center min-h-[140px]"
      >
        <div className="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400">
          <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading forecast...</span>
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

  if (maxTemp == null) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-300/50 dark:border-zinc-700/50 p-4 md:p-5 h-full flex flex-col min-h-0"
    >
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider">
          {DAY_LABELS[dayIndex]} Max
        </h3>
        <div className="flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-600">
          {DAY_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => onDayChange(i)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                dayIndex === i
                  ? 'bg-zinc-600 dark:bg-zinc-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center min-h-[100px]">
        <div className="flex items-baseline gap-4">
          <span className="text-6xl md:text-7xl font-light text-zinc-900 dark:text-white tabular-nums">
            <TempDisplay value={maxTemp} className="cursor-help" />
          </span>
          <span className="text-2xl text-zinc-500 dark:text-zinc-400">
            <span className="text-zinc-600 dark:text-zinc-500">Low</span>{' '}
            {minTemp != null ? <TempDisplay value={minTemp} className="cursor-help" /> : '—'}
          </span>
        </div>
      </div>
      {sources.length > 1 && (
        <div className="mt-4 pt-4 border-t border-zinc-300/50 dark:border-zinc-600/50">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Multi-source comparison</p>
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <span
                key={s.source}
                className="text-xs px-2 py-1 rounded-lg bg-zinc-200/80 dark:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300"
              >
                {s.source}: {s.maxTemp != null ? <TempDisplay value={s.maxTemp} className="cursor-help" /> : '—'}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-zinc-300/50 dark:border-zinc-600/50 flex flex-col gap-0.5">
        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-500">
          Primary: Open-Meteo
        </span>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
          Data display only, not analysis
        </span>
      </div>
    </motion.div>
  )
}
