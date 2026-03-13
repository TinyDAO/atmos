import { useMemo, useState } from 'react'
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  ReferenceLine,
} from 'recharts'
import { motion } from 'framer-motion'
import { useTheme } from '../../hooks/useTheme'
import type { MetarChartPoint, MetarDayData } from '../../utils/metarParser'

interface MetarHistoryChartProps {
  days: MetarDayData[]
  icao: string
  timezone: string
  loading?: boolean
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; dataKey?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  const temp = payload.find((p) => p.dataKey === 'temp')?.value
  const dewpoint = payload.find((p) => p.dataKey === 'dewpoint')?.value
  return (
    <div className="rounded-lg border border-zinc-300/60 dark:border-zinc-600/60 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm px-3 py-2 shadow-lg text-sm">
      <div className="font-medium text-zinc-700 dark:text-zinc-200">{label}</div>
      <div className="flex gap-3 mt-1 text-zinc-600 dark:text-zinc-400">
        {temp != null && <span>气温 {temp.toFixed(1)}°C</span>}
        {dewpoint != null && <span>露点 {dewpoint.toFixed(1)}°C</span>}
      </div>
    </div>
  )
}

/** Slot index for 30-min intervals: 0=00:00, 1=00:30, 2=01:00, ... 47=23:30 */
function toSlotIndex(hour: number, minute: number): number {
  return hour * 2 + (minute >= 30 ? 1 : 0)
}

/** Build chart data for a day: 30-min slots 00:00–24:00. METAR typically reports every 30 minutes. */
function buildDayChartData(
  rawData: MetarChartPoint[],
  timezone: string,
  isToday: boolean
): Array<{ label: string; slot: number; temp: number | null; dewpoint: number | null }> {
  const timeFmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false })
  const nowStr = timeFmt.format(new Date())

  const bySlot = new Map<number, { temp: number; dewpoint: number | null; ts: number }>()
  for (const p of rawData) {
    const tStr = timeFmt.format(p.time)
    if (isToday && tStr > nowStr) continue
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(p.time)
    const hour = parseInt(parts.find((x) => x.type === 'hour')!.value, 10)
    const minute = parseInt(parts.find((x) => x.type === 'minute')!.value, 10)
    const slot = toSlotIndex(hour, minute)
    const existing = bySlot.get(slot)
    if (!existing || p.time.getTime() > existing.ts) {
      bySlot.set(slot, { temp: p.temp, dewpoint: p.dewpoint, ts: p.time.getTime() })
    }
  }

  const nowParts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date())
  const currentHour = parseInt(nowParts.find((x) => x.type === 'hour')!.value, 10)
  const currentMin = parseInt(nowParts.find((x) => x.type === 'minute')!.value, 10)
  const currentSlot = toSlotIndex(currentHour, currentMin)
  const pad = (n: number) => String(n).padStart(2, '0')
  const slots: Array<{ label: string; slot: number; temp: number | null; dewpoint: number | null }> = []
  for (let s = 0; s <= 48; s++) {
    const isFuture = isToday && s > currentSlot
    const pt = !isFuture && bySlot.has(s) ? bySlot.get(s)! : null
    const h = Math.floor(s / 2)
    const m = (s % 2) * 30
    slots.push({
      label: s === 48 ? '24:00' : `${pad(h)}:${pad(m)}`,
      slot: s,
      temp: pt ? pt.temp : null,
      dewpoint: pt ? pt.dewpoint : null,
    })
  }
  return slots
}

export function MetarHistoryChart({ days, icao, timezone, loading = false }: MetarHistoryChartProps) {
  const { theme } = useTheme()
  const [dayIndex, setDayIndex] = useState(0)
  const selectedDay = days[dayIndex] ?? days[0]
  const chartData = useMemo(
    () => selectedDay ? buildDayChartData(selectedDay.points, timezone, selectedDay.isToday) : [],
    [selectedDay, timezone]
  )

  const tempRange = useMemo(() => {
    const temps = chartData.map((d) => d.temp).filter((t): t is number => t != null && !Number.isNaN(t))
    if (temps.length === 0) return { min: 0, max: 30 }
    const min = Math.min(...temps)
    const max = Math.max(...temps)
    const padding = Math.max(2, Math.ceil((max - min) * 0.15))
    return { min: min - padding, max: max + padding }
  }, [chartData])

  const hasData = days.length > 0 && chartData.some((d) => d.temp != null)
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl bg-zinc-100/80 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-700/50 p-6 flex items-center justify-center min-h-[280px]"
      >
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">加载中...</span>
        </div>
      </motion.div>
    )
  }
  if (!hasData || chartData.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl bg-zinc-100/80 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-700/50 p-6 text-center"
      >
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          过去 15 天 METAR 数据不足，无法绘制图表
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl bg-zinc-100/80 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-700/50 overflow-hidden"
    >
      <div className="px-4 py-2.5 border-b border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            Aviation Temp · {icao}
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
            METAR observations · Past 15 days
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded bg-amber-500" />
              Temp
            </span>
            {chartData.some((d) => d.dewpoint != null) && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded border border-dashed border-cyan-500" />
                Dewpoint
              </span>
            )}
          </div>
          <select
            value={dayIndex}
            onChange={(e) => setDayIndex(Number(e.target.value))}
            className="text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 min-h-0 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            {days.map((d, i) => (
              <option key={d.dateStr} value={i}>
                {d.label}
                {d.maxTemp != null ? ` ${d.maxTemp.toFixed(1)}°` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="p-4">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme === 'dark' ? '#fbbf24' : '#f59e0b'} stopOpacity={theme === 'dark' ? 0.35 : 0.4} />
                  <stop offset="100%" stopColor={theme === 'dark' ? '#fbbf24' : '#f59e0b'} stopOpacity={theme === 'dark' ? 0.02 : 0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-zinc-200/80 dark:text-zinc-700/60"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-zinc-500 dark:text-zinc-500"
                tickLine={false}
                axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
                interval={5}
              />
              <YAxis
                domain={[tempRange.min, tempRange.max]}
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-zinc-500 dark:text-zinc-500"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Number(v).toFixed(1)}°`}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={0}
                stroke="currentColor"
                strokeOpacity={0.2}
                strokeDasharray="2 2"
              />
              <Area
                type="monotone"
                dataKey="temp"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#tempGradient)"
                connectNulls={false}
              />
              {chartData.some((d) => d.dewpoint != null) && (
                <Line
                  type="monotone"
                  dataKey="dewpoint"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}
