import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CITIES } from '../../config/cities'
import {
  runChinaMojiScan,
  YES_MIN_DISPLAY,
  type CityScanResult,
  type DayScanResult,
} from '../../services/chinaMojiScan'
import { useScanScrollSpy } from '../../hooks/useScanScrollSpy'
import {
  ScanQuickJumpAside,
  SCAN_QUICK_JUMP_LAYOUT_PADDING,
} from '../../components/tools/ScanQuickJumpAside'
import { LiveCityClock } from '../../components/tools/LiveCityClock'
import { atmosCityDetailHref } from '../../utils/atmosCityHref'

function formatPct(p: number): string {
  if (!Number.isFinite(p)) return '—'
  return `${(p * 100).toFixed(1)}%`
}

function formatVol(v: number): string {
  if (!Number.isFinite(v)) return '—'
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return String(Math.round(v))
}

function DayBlock({ day }: { day: DayScanResult }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-amber-200/90 ring-1 ring-amber-500/25">
          {day.mmdd}
        </span>
        <span className="text-[13px] text-zinc-400">{day.dayLabel}</span>
        <a
          href={day.polEventUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-[12px] text-sky-400/90 hover:text-sky-300 truncate max-w-[min(100%,280px)] underline-offset-2 hover:underline"
        >
          Polymarket
        </a>
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-[13px]">
          <span className="text-zinc-500">CMA 预报最高温（城市页）</span>{' '}
          {day.cmaMaxC != null && Number.isFinite(day.cmaMaxC) ? (
            <span className="font-semibold tabular-nums text-amber-200">{day.cmaMaxC}°C</span>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
        </p>

        {day.status === 'gamma_error' && (
          <p className="text-sm text-rose-400/90">Gamma: {day.errorMessage}</p>
        )}
        {day.status === 'no_event' && (
          <p className="text-sm text-zinc-500">暂无对应 Polymarket 事件</p>
        )}
        {day.status === 'no_bins' && (
          <p className="text-sm text-zinc-500">无法解析温度档位（标题格式或市场为空）</p>
        )}
        {day.status === 'filtered_empty' && (
          <p className="text-sm text-zinc-500">
            全部档位 YES &lt; {(YES_MIN_DISPLAY * 100).toFixed(0)}%（已隐藏 {day.hiddenCount} 档）
          </p>
        )}

        {day.status === 'ok' && day.rows.length > 0 && (
          <>
            {day.hiddenCount > 0 && (
              <p className="text-[11px] text-zinc-600">
                已隐藏 {day.hiddenCount} 个 YES &lt; {(YES_MIN_DISPLAY * 100).toFixed(0)}% 的档位
              </p>
            )}
            <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full min-w-[520px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.03] text-zinc-500">
                    <th className="px-3 py-2 font-medium">档位</th>
                    <th className="px-3 py-2 font-medium tabular-nums w-24">YES</th>
                    <th className="px-3 py-2 font-medium tabular-nums w-28">Δ(档−CMA°C)</th>
                    <th className="px-3 py-2 font-medium tabular-nums w-24">成交量</th>
                  </tr>
                </thead>
                <tbody>
                  {day.rows.map((r, i) => {
                    const isClosest =
                      i === day.closestIdx &&
                      day.cmaMaxC != null &&
                      Number.isFinite(day.cmaMaxC)
                    return (
                      <tr
                        key={`${day.slug}-${r.displayLabel}-${i}`}
                        className={
                          isClosest
                            ? 'border-l-4 border-amber-400 bg-amber-500/[0.12] text-white'
                            : 'border-l-4 border-transparent odd:bg-white/[0.02]'
                        }
                      >
                        <td className="px-3 py-2 font-mono text-[11px] text-zinc-200">
                          {isClosest ? <span className="text-amber-300 mr-1">★</span> : null}
                          {r.displayLabel}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-300">{formatPct(r.yes)}</td>
                        <td className="px-3 py-2 tabular-nums text-zinc-400">
                          {r.deltaC != null && Number.isFinite(r.deltaC)
                            ? `${r.deltaC >= 0 ? '+' : ''}${r.deltaC.toFixed(1)}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-500">{formatVol(r.vol)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {day.closestIdx >= 0 && day.cmaMaxC != null && Number.isFinite(day.cmaMaxC) && (
              <p className="text-[11px] text-zinc-600">
                ★ = 与 CMA 预报最高温 ({day.cmaMaxC}°C) 最接近的档位
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** 山地河谷、多中心城区，单站 CMA 页与实况/体感温差常较大 */
const CHONGQING_CITY_ID = 'chongqing'

export default function ChinaMojiScanPage() {
  const cities = CITIES.filter(
    (c) => c.country === 'China' && typeof c.cma === 'string' && c.cma.length > 0
  )
  const [results, setResults] = useState<CityScanResult[]>([])
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(async () => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setPhase('scanning')
    setError(null)
    setResults([])
    setProgress(0)

    try {
      await runChinaMojiScan(cities, {
        signal: ac.signal,
        onCityComplete: (r) => {
          setResults((prev) => [...prev, r])
          setProgress((p) => p + 1)
        },
      })
      if (!ac.signal.aborted) setPhase('done')
    } catch (e) {
      if (!ac.signal.aborted) {
        setPhase('error')
        setError(e instanceof Error ? e.message : String(e))
      }
    }
  }, [cities])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const scrollToCity = useCallback((cityId: string) => {
    const el = document.getElementById(`china-scan-${cityId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const cityIds = useMemo(() => results.map((r) => r.city.id), [results])
  const jumpItems = useMemo(
    () => results.map((r) => ({ id: r.city.id, name: r.city.name })),
    [results]
  )
  const activeCityId = useScanScrollSpy(cityIds, 'china-scan')

  useEffect(() => {
    if (!activeCityId) return
    document.getElementById(`china-scan-nav-${activeCityId}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeCityId])

  return (
    <div className="relative">
      <nav className="mb-8">
        <Link
          to="/tools"
          className="text-[13px] font-medium text-amber-400/80 hover:text-amber-300 transition-colors"
        >
          ← 工具列表
        </Link>
      </nav>

      <div className={results.length > 0 ? SCAN_QUICK_JUMP_LAYOUT_PADDING : undefined}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber-500/70">CMA × Polymarket</p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl font-semibold text-white tracking-tight">
          中国城市扫描
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
          三日的白天最高温（°C），与 Polymarket 档位对比。仅展示 YES ≥
          {(YES_MIN_DISPLAY * 100).toFixed(0)}% 的档位。
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={phase === 'scanning'}
            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50 disabled:pointer-events-none"
          >
            {phase === 'scanning' ? '扫描中…' : '开始扫描'}
          </button>
          {phase === 'scanning' && (
            <span className="text-[13px] tabular-nums text-zinc-500">
              {progress} / {cities.length} 城市
            </span>
          )}
        </div>
      </motion.div>

      {error && (
        <p className="mt-6 text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}

      <AnimatePresence mode="popLayout">
        {results.length > 0 && (
          <motion.ul
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 space-y-10"
          >
            {results.map((cr, ci) => (
              <motion.li
                key={cr.city.id}
                id={`china-scan-${cr.city.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: ci * 0.03 }}
                className="scroll-mt-24 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-7 backdrop-blur-sm"
              >
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] pb-4 mb-5">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-white">{cr.city.name}</h2>
                    <p className="mt-1 text-[12px] text-zinc-500 font-mono">{cr.city.id}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">{cr.city.timezone}</p>
                    <p className="mt-2 text-[13px] text-amber-200/90">
                      <span className="text-zinc-500">当地</span>{' '}
                      <LiveCityClock timeZone={cr.city.timezone} />
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 text-right max-w-md">
                    <a
                      href={atmosCityDetailHref(cr.city.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-violet-300/90 hover:text-violet-200 underline-offset-2 hover:underline truncate max-w-full"
                      title="Atmos — city forecast & dashboard"
                    >
                      Atmos
                    </a>
                    {cr.cmaSourceUrl ? (
                      <a
                        href={cr.cmaSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-zinc-500 hover:text-zinc-400 truncate max-w-xs underline-offset-2 hover:underline"
                        title="本城 cma 配置（与 scripts/scan.js 相同）"
                      >
                        本城预报页
                      </a>
                    ) : null}
                    {cr.weatherError ? (
                      <p className="text-sm text-rose-400/90">CMA: {cr.weatherError}</p>
                    ) : (
                      <a
                        href={cr.days[0]?.polEventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-sky-400/80 hover:text-sky-300 truncate max-w-xs"
                      >
                        Polymarket（首日）
                      </a>
                    )}
                  </div>
                </div>

                {cr.city.id === CHONGQING_CITY_ID ? (
                  <p
                    className="mb-5 rounded-lg border border-amber-500/25 bg-amber-500/[0.08] px-3 py-2.5 text-[12px] leading-relaxed text-amber-100/90"
                    role="note"
                  >
                    <span className="font-semibold text-amber-200">重庆</span>
                    ：山地河谷、城区差异大，中央气象台该站页预报与实况气温、体感经常偏差较大，仅供参考。
                  </p>
                ) : null}

                {cr.weatherError ? null : (
                  <div className="space-y-6">
                    {cr.days.map((d) => (
                      <DayBlock key={`${cr.city.id}-${d.dayIndex}`} day={d} />
                    ))}
                  </div>
                )}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {phase === 'done' && results.length === 0 && !error && (
        <p className="mt-10 text-sm text-zinc-500">
          没有带 <code className="text-zinc-400">cma</code> 链接的中国城市（请在 cities.ts 中配置）。
        </p>
      )}
      </div>

      <ScanQuickJumpAside
        visible={results.length > 0}
        ariaLabel="Quick jump to cities"
        title="Quick jump"
        description="Tap a city below to smoothly scroll to its card."
        items={jumpItems}
        activeId={activeCityId}
        onSelect={scrollToCity}
        getNavButtonId={(id) => `china-scan-nav-${id}`}
        accent="amber"
      />
    </div>
  )
}
