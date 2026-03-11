import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePolymarketEvent } from '../../hooks/usePolymarketEvent'
import type { City } from '../../config/cities'
import type { PolymarketMarketWithBook } from '../../hooks/usePolymarketEvent'

const ORDER_BOOK_DEPTH = 5

interface PolymarketDashboardProps {
  city: City
  dayIndex?: number
}

function formatPrice(p: number | string): string {
  const n = typeof p === 'string' ? parseFloat(p) : p
  if (Number.isNaN(n)) return '—'
  return (n * 100).toFixed(1) + '%'
}

function formatVolume(v: number | string | undefined): string {
  if (v == null) return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (Number.isNaN(n)) return '—'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toFixed(0)
}

function MarketRow({
  market,
  expanded,
  onToggle,
}: {
  market: PolymarketMarketWithBook
  expanded: boolean
  onToggle: () => void
}) {
  const yesPrice =
    market.lastTradePrice ??
    (() => {
      try {
        const arr = JSON.parse(market.outcomePrices || '[]') as string[]
        return parseFloat(arr[0] ?? '0')
      } catch {
        return 0
      }
    })()

  const volume = market.volumeNum ?? (market.volume ? parseFloat(market.volume) : 0)
  const ob = market.orderBook
  const topBids = ob?.bids?.slice(0, ORDER_BOOK_DEPTH) ?? []
  const topAsks = ob?.asks?.slice(0, ORDER_BOOK_DEPTH) ?? []

  return (
    <div className="border-b border-zinc-200/80 dark:border-zinc-700/80 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 py-3 px-4 text-left hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
            {market.groupItemTitle || market.question}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
            {formatPrice(yesPrice)}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            Vol {formatVolume(volume)}
          </span>
          <svg
            className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800">
              <div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 uppercase tracking-wider">
                  Bids
                </div>
                <div className="space-y-1">
                  {topBids.length === 0 ? (
                    <span className="text-xs text-zinc-400">—</span>
                  ) : (
                    topBids.map((b, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs font-mono tabular-nums"
                      >
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {formatPrice(b.price)}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400">{b.size}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2 uppercase tracking-wider">
                  Asks
                </div>
                <div className="space-y-1">
                  {topAsks.length === 0 ? (
                    <span className="text-xs text-zinc-400">—</span>
                  ) : (
                    topAsks.map((a, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs font-mono tabular-nums"
                      >
                        <span className="text-rose-600 dark:text-rose-400">
                          {formatPrice(a.price)}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400">{a.size}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function PolymarketDashboard({ city, dayIndex = 0 }: PolymarketDashboardProps) {
  const { event, marketsWithBooks, loading, error } = usePolymarketEvent(
    city.id,
    city.timezone,
    dayIndex
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const activeMarkets = marketsWithBooks.filter((m) => m.active || !m.closed)

  const cardClass =
    'rounded-2xl bg-white/60 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200/60 dark:border-zinc-700/50 overflow-hidden h-full flex flex-col min-h-0'

  if (loading) {
    return (
      <div className={cardClass}>
        <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-700/80 shrink-0">
          <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
            Polymarket
          </h4>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="animate-pulse text-zinc-400 dark:text-zinc-500 text-sm">
            Loading markets…
          </div>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className={cardClass}>
        <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-700/80 shrink-0">
          <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
            Polymarket
          </h4>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {error || 'No markets found for this date'}
          </p>
          <a
            href={`https://polymarket.com/event/${event?.slug ?? ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            View on Polymarket →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={cardClass + ' shadow-[0_0_0_1px_rgba(0,0,0,0.02)]'}>
      <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-700/80 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
              Polymarket
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 truncate" title={event.slug}>
              {event.title}
            </p>
          </div>
          <a
            href={`https://polymarket.com/event/${event.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
          >
            View →
          </a>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeMarkets.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No active markets
          </div>
        ) : (
          activeMarkets.map((market) => (
            <MarketRow
              key={market.id}
              market={market}
              expanded={expandedId === market.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === market.id ? null : market.id))
              }
            />
          ))
        )}
      </div>
    </div>
  )
}
