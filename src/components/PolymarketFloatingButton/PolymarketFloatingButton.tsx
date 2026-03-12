import { motion } from 'framer-motion'
import { getPolymarketSlug } from '../../utils/polymarketSlug'

interface City {
  id: string
  name: string
  timezone: string
}

interface PolymarketFloatingButtonProps {
  city: City | null
  dayIndex: number
}

function getShortSlugDisplay(cityId: string, dayIndex: number, timezone: string): string {
  const d = new Date()
  d.setTime(d.getTime() + dayIndex * 24 * 60 * 60 * 1000)
  const shortDate = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
  }).format(d)
  return `${cityId} · ${shortDate}`
}

export function PolymarketFloatingButton({ city, dayIndex }: PolymarketFloatingButtonProps) {
  if (!city) return null

  const slug = getPolymarketSlug(city.id, dayIndex, city.timezone)
  const shortDisplay = getShortSlugDisplay(city.id, dayIndex, city.timezone)
  const href = `https://polymarket.com/event/${slug}`

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 md:gap-3 md:px-4 md:py-3 rounded-xl md:rounded-2xl
        bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
        text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40
        border border-violet-500/30 hover:scale-[1.02] active:scale-[0.98]
        transition-all duration-200"
      title={`Polymarket ${city.name} 最高温预测市场`}
    >
      <img
        src="https://polymarket.com/favicon.ico"
        alt=""
        className="w-6 h-6 md:w-8 md:h-8"
        aria-hidden
      />
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-xs md:text-sm whitespace-nowrap">Polymarket</span>
        <span className="hidden md:block text-xs text-violet-200" title={slug}>
          {shortDisplay}
        </span>
      </div>
      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </motion.a>
  )
}
