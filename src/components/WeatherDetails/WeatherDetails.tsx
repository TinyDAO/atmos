import { motion } from 'framer-motion'
import { useTranslation } from '../../hooks/useTranslation'

function windDegToDir(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const i = Math.round(deg / 22.5) % 16
  return dirs[i]
}

interface WeatherDetailsProps {
  windDir: number | null
  windSpeed: number | null
  precipitation: number | null
  cloudCover: number | null
  cloudBaseM: number | null
  loading: boolean
}

const cardBase =
  'rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50'

export function WeatherDetails({
  windDir,
  windSpeed,
  precipitation,
  cloudCover,
  cloudBaseM,
  loading,
}: WeatherDetailsProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`${cardBase} p-5 h-full flex flex-col min-h-0`}
      >
        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800 mb-4 shrink-0" />
        <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
              <div className="w-5 h-5 rounded bg-zinc-200 dark:bg-zinc-700 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-3 w-12 rounded bg-zinc-200 dark:bg-zinc-700 mb-1.5" />
                <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    )
  }

  const items = [
    {
      label: t('weatherDetails.wind'),
      value: windSpeed != null && windDir != null
        ? `${windDegToDir(windDir)} ${windSpeed} km/h`
        : '—',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: `rotate(${(windDir ?? 0) + 90}deg)` }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      ),
    },
    {
      label: t('weatherDetails.precipitation'),
      value: precipitation != null ? `${precipitation} mm` : '—',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      label: t('weatherDetails.cloudCover'),
      value: cloudCover != null ? `${cloudCover}%` : '—',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
    },
    {
      label: t('weatherDetails.cloudBase'),
      value: cloudBaseM != null ? `${cloudBaseM} m` : '—',
      sub: cloudBaseM != null ? t('weatherDetails.fromMETAR') : null,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className={`${cardBase} p-5 h-full flex flex-col min-h-0`}
    >
      <h3 className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.08em] mb-4 shrink-0">
        {t('weatherDetails.title')}
      </h3>
      <div className="flex-1 grid grid-cols-2 gap-2.5 min-h-0">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40"
          >
            <span className="text-zinc-400 dark:text-zinc-500 shrink-0">{item.icon}</span>
            <div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{item.label}</p>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {item.value}
              </p>
              {item.sub && (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{item.sub}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
