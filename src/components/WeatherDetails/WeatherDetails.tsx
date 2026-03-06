import { motion } from 'framer-motion'

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

export function WeatherDetails({
  windDir,
  windSpeed,
  precipitation,
  cloudCover,
  cloudBaseM,
  loading,
}: WeatherDetailsProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-zinc-200/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-300/50 dark:border-zinc-700/50 p-6"
      >
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading details...</span>
        </div>
      </motion.div>
    )
  }

  const items = [
    {
      label: 'Wind',
      value: windSpeed != null && windDir != null
        ? `${windDegToDir(windDir)} ${windSpeed} km/h`
        : '—',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: `rotate(${(windDir ?? 0) + 90}deg)` }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      ),
    },
    {
      label: 'Precipitation',
      value: precipitation != null ? `${precipitation} mm` : '—',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      label: 'Cloud Cover',
      value: cloudCover != null ? `${cloudCover}%` : '—',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
    },
    {
      label: 'Cloud Base',
      value: cloudBaseM != null ? `${cloudBaseM} m` : '—',
      sub: cloudBaseM != null ? '(from METAR)' : null,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl bg-zinc-200/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-300/50 dark:border-zinc-700/50 p-6"
    >
      <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-4">
        Wind · Rain · Cloud
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/50"
          >
            <span className="text-zinc-500 dark:text-zinc-400 mt-0.5">{item.icon}</span>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.label}</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                {item.value}
              </p>
              {item.sub && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.sub}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Wind/precip/cloud: Open-Meteo · Cloud base: METAR
      </p>
    </motion.div>
  )
}
