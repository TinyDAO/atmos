import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CITIES } from '../../config/cities'
import {
  runEuCityScan,
  isEuropeCity,
  YES_MIN_DISPLAY,
  type EuCityScanResult,
  type EuDayScanResult,
} from '../../services/euCityScan'
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

const OPEN_METEO_ECMWF_DOCS = 'https://open-meteo.com/en/docs/ecmwf-api'

function DayBlock({ day }: { day: EuDayScanResult }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="inline-flex items-center rounded-md bg-violet-500/15 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-violet-200/90 ring-1 ring-violet-500/25">
          {day.mmdd}
        </span>
        <span className="text-[13px] text-zinc-400">{day.dayLabel}</span>
        <a
          href={day.polEventUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-[12px] text-violet-400/90 hover:text-violet-300 truncate max-w-[min(100%,280px)] underline-offset-2 hover:underline"
        >
          Polymarket
        </a>
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-[13px]">
          <span className="text-zinc-500">ECMWF 日最高 (2 m)</span>{' '}
          {day.ecmwfMaxC != null && Number.isFinite(day.ecmwfMaxC) ? (
            <span className="font-semibold tabular-nums text-violet-200">{day.ecmwfMaxC}°C</span>
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
              <table className="w-full min-w-[560px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.03] text-zinc-500">
                    <th className="px-3 py-2 font-medium">档位</th>
                    <th className="px-3 py-2 font-medium tabular-nums w-24">YES</th>
                    <th className="px-3 py-2 font-medium tabular-nums w-28">Δ(档−ECMWF°C)</th>
                    <th className="px-3 py-2 font-medium tabular-nums w-24">成交量</th>
                  </tr>
                </thead>
                <tbody>
                  {day.rows.map((r, i) => {
                    const isClosest =
                      i === day.closestIdx &&
                      day.ecmwfMaxC != null &&
                      Number.isFinite(day.ecmwfMaxC)
                    return (
                      <tr
                        key={`${day.slug}-${r.displayLabel}-${i}`}
                        className={
                          isClosest
                            ? 'border-l-4 border-violet-400 bg-violet-500/[0.12] text-white'
                            : 'border-l-4 border-transparent odd:bg-white/[0.02]'
                        }
                      >
                        <td className="px-3 py-2 font-mono text-[11px] text-zinc-200 leading-snug">
                          {isClosest ? <span className="text-violet-300 mr-1">★</span> : null}
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
            {day.closestIdx >= 0 &&
              day.ecmwfMaxC != null &&
              Number.isFinite(day.ecmwfMaxC) && (
                <p className="text-[11px] text-zinc-600">
                  ★ = 与 ECMWF 日最高（{day.ecmwfMaxC}°C）最接近的档位
                </p>
              )}
          </>
        )}
      </div>
    </div>
  )
}

export default function EuCityScanPage() {
  const cities = useMemo(() => CITIES.filter(isEuropeCity), [])
  const [results, setResults] = useState<EuCityScanResult[]>([])
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
      await runEuCityScan(cities, {
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
    const el = document.getElementById(`eu-scan-${cityId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const cityIds = useMemo(() => results.map((r) => r.city.id), [results])
  const jumpItems = useMemo(
    () => results.map((r) => ({ id: r.city.id, name: r.city.name })),
    [results]
  )
  const activeCityId = useScanScrollSpy(cityIds, 'eu-scan')

  useEffect(() => {
    if (!activeCityId) return
    document.getElementById(`eu-scan-nav-${activeCityId}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeCityId])

  return (
    <div className="relative">
      <nav className="mb-8">
        <Link
          to="/tools"
          className="text-[13px] font-medium text-violet-400/80 hover:text-violet-300 transition-colors"
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
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-violet-500/70">
            ECMWF × Polymarket
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-semibold text-white tracking-tight">
            欧洲城市扫描
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Open-Meteo ECMWF 三天 2 m 日最高温（°C）与 Polymarket 档位对比；城市为配置中{' '}
            <code className="text-zinc-400">Europe/</code> 时区条目。仅展示 YES ≥
            {(YES_MIN_DISPLAY * 100).toFixed(0)}% 的档位。
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={phase === 'scanning'}
              className="inline-flex items-center justify-center rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400 disabled:opacity-50 disabled:pointer-events-none"
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
                  id={`eu-scan-${cr.city.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: ci * 0.03 }}
                  className="scroll-mt-24 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-7 backdrop-blur-sm"
                >
                  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] pb-4 mb-5">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-white">{cr.city.name}</h2>
                      <p className="mt-1 text-[11px] text-zinc-600">{cr.city.timezone}</p>
                      <p className="mt-2 text-[13px] text-violet-200/90">
                        <span className="text-zinc-500">当地</span>{' '}
                        <LiveCityClock timeZone={cr.city.timezone} variant="eu" />
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 text-right max-w-md">
                      <a
                        href={OPEN_METEO_ECMWF_DOCS}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-violet-400/85 hover:text-violet-300 underline-offset-2 hover:underline truncate max-w-full"
                      >
                        Open-Meteo ECMWF 文档
                      </a>
                      <a
                        href={atmosCityDetailHref(cr.city.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-emerald-300/90 hover:text-emerald-200 underline-offset-2 hover:underline truncate max-w-full"
                        title="Atmos — city forecast & dashboard"
                      >
                        Atmos
                      </a>
                      {cr.ecmwfSourceUrl ? (
                        <a
                          href={cr.ecmwfSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] text-zinc-500 hover:text-zinc-400 truncate max-w-xs underline-offset-2 hover:underline"
                          title="本次扫描使用的 ECMWF 请求 URL"
                        >
                          ECMWF 请求（本城）
                        </a>
                      ) : null}
                      {cr.weatherError ? (
                        <p className="text-sm text-rose-400/90">ECMWF: {cr.weatherError}</p>
                      ) : (
                        <a
                          href={cr.days[0]?.polEventUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] text-violet-400/80 hover:text-violet-300 truncate max-w-xs"
                        >
                          Polymarket（首日）
                        </a>
                      )}
                    </div>
                  </div>

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
          <p className="mt-10 text-sm text-zinc-500">没有 Europe/ 时区城市配置。</p>
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
        getNavButtonId={(id) => `eu-scan-nav-${id}`}
        accent="violet"
      />
    </div>
  )
}
