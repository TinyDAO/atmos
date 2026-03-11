import { useState } from 'react'
import { motion } from 'framer-motion'
import { MetarHistoryChart } from '../MetarHistoryChart'
import { HistoricalMonthChart } from '../HistoricalMonthChart/HistoricalMonthChart'
import { PolymarketDashboard } from '../PolymarketDashboard/PolymarketDashboard'
import { useHistoricalMonth } from '../../hooks/useHistoricalMonth'
import type { City } from '../../config/cities'
import type { MetarDayData } from '../../utils/metarParser'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface CityDashboardProps {
  city: City
  metarHistoryByDays: MetarDayData[]
}

function WebcamSlot({ url, city, index }: { url: string | null; city: City; index: number }) {
  const [error, setError] = useState(false)
  const showPlaceholder = !url || error

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className="aspect-video rounded-xl overflow-hidden bg-zinc-200/80 dark:bg-zinc-800/60
        border border-zinc-200/60 dark:border-zinc-700/50 relative"
    >
      {url && !error ? (
        <img
          src={url}
          alt={`${city.name} webcam ${index + 1}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setError(true)}
        />
      ) : null}
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <svg className="w-8 h-8 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Configure webcam</span>
        </div>
      )}
    </motion.div>
  )
}

function WebcamGrid({ city }: { city: City }) {
  const slots = 4
  const webcams = city.webcams ?? []
  const items = Array.from({ length: slots }, (_, i) => webcams[i] ?? null)

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((url, i) => (
        <WebcamSlot key={i} url={url} city={city} index={i} />
      ))}
    </div>
  )
}

export function CityDashboard({ city, metarHistoryByDays }: CityDashboardProps) {
  const currentMonth = new Date().getMonth()
  const monthName = MONTH_NAMES[currentMonth]
  const { data: historicalData, loading: historicalLoading, error: historicalError } = useHistoricalMonth(
    city.latitude,
    city.longitude,
    city.timezone,
    5
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl p-6 md:p-8
        bg-gradient-to-br from-zinc-100/90 to-zinc-50/90 dark:from-zinc-900/90 dark:to-zinc-950/90
        border border-zinc-200/60 dark:border-zinc-700/60
        shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)]
        dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_4px_24px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {city.name} Dashboard
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Charts · Historical · Live webcams
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 items-stretch">
        {/* Left: Charts */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl overflow-hidden shadow-sm">
            <MetarHistoryChart
              days={metarHistoryByDays}
              icao={city.icao}
              timezone={city.timezone}
            />
          </div>
          <HistoricalMonthChart
            data={historicalData}
            monthName={monthName}
            timezone={city.timezone}
            loading={historicalLoading}
            error={historicalError}
          />
        </div>

        {/* Right: Webcams + Polymarket (stretch to match left column height) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-white/60 dark:bg-zinc-900/50 backdrop-blur-sm
              border border-zinc-200/60 dark:border-zinc-700/50 overflow-hidden
              shadow-[0_0_0_1px_rgba(0,0,0,0.02)] shrink-0"
          >
            <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-700/80">
              <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                Live Webcams
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                Real-time views · {city.name}
              </p>
            </div>
            <div className="p-4">
              <WebcamGrid city={city} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <PolymarketDashboard city={city} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
