import { motion } from 'framer-motion'
import { getPolymarketSlug } from '../../utils/polymarketSlug'
import { useTranslation } from '../../hooks/useTranslation'

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
  const { t } = useTranslation()
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
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 md:gap-2.5 md:px-3.5 md:py-2.5 rounded-xl
        bg-zinc-900 dark:bg-zinc-100
        text-white dark:text-zinc-900 shadow-lg shadow-black/10 dark:shadow-black/30
        hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
        transition-all duration-200"
      title={t('polymarketButton.title').replace('{city}', city.name)}
    >
      <svg className="w-5 h-5 md:w-6 md:h-6 shrink-0" viewBox="0 0 400 400" fill="currentColor" aria-hidden>
        <path d="M200 0C89.5 0 0 89.5 0 200s89.5 200 200 200 200-89.5 200-200S310.5 0 200 0zm-30 300h-40V100h100c44.2 0 80 35.8 80 80s-35.8 80-80 80h-60v40zm0-80h60c22.1 0 40-17.9 40-40s-17.9-40-40-40h-60v80z" />
      </svg>
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-xs md:text-[13px] whitespace-nowrap">Polymarket</span>
        <span className="hidden md:block text-[11px] text-white/60 dark:text-zinc-500" title={slug}>
          {shortDisplay}
        </span>
      </div>
      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </motion.a>
  )
}
