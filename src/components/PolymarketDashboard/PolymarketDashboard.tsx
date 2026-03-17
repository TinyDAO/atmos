import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePolymarketEvent } from '../../hooks/usePolymarketEvent'
import { useMarketOrderBook } from '../../hooks/useMarketOrderBook'
import { useTranslation } from '../../hooks/useTranslation'
import type { City } from '../../config/cities'
import type { PolymarketMarketWithBook } from '../../hooks/usePolymarketEvent'

const ORDER_BOOK_DEPTH = 5

interface PolymarketDashboardProps {
  city: City
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
  const { t } = useTranslation()
  const [tab, setTab] = useState<'yes' | 'no'>('yes')
  const { orderBookYes: obYes, orderBookNo: obNo, loading: obLoading } = useMarketOrderBook(
    market.clobTokenIds,
    expanded
  )
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
  const topBidsYes =
    obYes?.bids
      ?.slice()
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      .slice(0, ORDER_BOOK_DEPTH) ?? []
  const topAsksYes =
    obYes?.asks
      ?.slice()
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      .slice(0, ORDER_BOOK_DEPTH) ?? []
  const topBidsNo =
    obNo?.bids
      ?.slice()
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      .slice(0, ORDER_BOOK_DEPTH) ?? []
  const topAsksNo =
    obNo?.asks
      ?.slice()
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      .slice(0, ORDER_BOOK_DEPTH) ?? []

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 py-3 px-5 text-left hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-all"
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
            {t('polymarket.vol')} {formatVolume(volume)}
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
            <div className="px-5 pb-4 pt-0 border-t border-zinc-50 dark:border-zinc-800/40">
              <div className="flex justify-center gap-2 py-3 mb-1.5">
                <button
                  type="button"
                  onClick={() => setTab('yes')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    tab === 'yes'
                      ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  {t('polymarket.yes')}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('no')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    tab === 'no'
                      ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  {t('polymarket.no')}
                </button>
              </div>
              {obLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-zinc-400 dark:text-zinc-500">
                  <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">{t('polymarket.loadingOrderBook')}</span>
                </div>
              ) : (
              <div className="grid grid-cols-2 gap-4">
                {tab === 'yes' ? (
                  <>
                    <div>
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                        {t('polymarket.bids')}
                      </div>
                      <div className="space-y-1">
                        {topBidsYes.length === 0 ? (
                          <span className="text-xs text-zinc-400">—</span>
                        ) : (
                          topBidsYes.map((b, i) => (
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
                      <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2">
                        {t('polymarket.asks')}
                      </div>
                      <div className="space-y-1">
                        {topAsksYes.length === 0 ? (
                          <span className="text-xs text-zinc-400">—</span>
                        ) : (
                          topAsksYes.map((a, i) => (
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
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                        {t('polymarket.bids')}
                      </div>
                      <div className="space-y-1">
                        {topBidsNo.length === 0 ? (
                          <span className="text-xs text-zinc-400">—</span>
                        ) : (
                          topBidsNo.map((b, i) => (
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
                      <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2">
                        {t('polymarket.asks')}
                      </div>
                      <div className="space-y-1">
                        {topAsksNo.length === 0 ? (
                          <span className="text-xs text-zinc-400">—</span>
                        ) : (
                          topAsksNo.map((a, i) => (
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
                  </>
                )}
              </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function buildDayOptions(timezone: string, todayLabel: string): Array<{ value: number; label: string }> {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone, month: 'short', day: 'numeric' })
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date()
    d.setTime(d.getTime() + i * 24 * 60 * 60 * 1000)
    return { value: i, label: i === 0 ? todayLabel : fmt.format(d) }
  })
}

export function PolymarketDashboard({ city }: PolymarketDashboardProps) {
  const { t } = useTranslation()
  const [dayIndex, setDayIndex] = useState(0)
  const { event, marketsWithBooks, loading, error } = usePolymarketEvent(
    city.id,
    city.timezone,
    dayIndex
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const dayOptions = buildDayOptions(city.timezone, t('common.today'))

  const activeMarkets = marketsWithBooks.filter((m) => m.active || !m.closed)

  const cardClass =
    'rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden h-full flex flex-col min-h-0'

  const dateSelector = (
    <select
      value={dayIndex}
      onChange={(e) => { setDayIndex(Number(e.target.value)); setExpandedId(null) }}
      className="text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 min-h-0 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
    >
      {dayOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )

  if (loading) {
    return (
      <div className={cardClass}>
        <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0 flex items-center justify-between">
          <h4 className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.08em]">
            Polymarket
          </h4>
          {dateSelector}
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
            <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">{t('polymarket.loading')}</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className={cardClass}>
        <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0 flex items-center justify-between">
          <h4 className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.08em]">
            Polymarket
          </h4>
          {dateSelector}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {error || t('polymarket.noMarkets')}
          </p>
          <a
            href={`https://polymarket.com/event/${event?.slug ?? ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            {t('polymarket.viewOnPolymarket')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.08em]">
            Polymarket
          </h4>
          <div className="flex items-center gap-2 shrink-0">
            {dateSelector}
            <a
              href={`https://polymarket.com/event/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
            >
              {t('polymarket.view')}
            </a>
          </div>
        </div>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate" title={event.slug}>
          {event.title}
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeMarkets.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t('polymarket.noActive')}
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
