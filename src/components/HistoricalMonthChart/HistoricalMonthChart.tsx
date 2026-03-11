import { useMemo } from 'react'
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, ReferenceLine, ReferenceArea } from 'recharts'
import { motion } from 'framer-motion'
import { useTheme } from '../../hooks/useTheme'
import type { HistoricalMonthPoint } from '../../hooks/useHistoricalMonth'

interface HistoricalMonthChartProps {
  data: HistoricalMonthPoint[]
  monthName: string
  timezone: string
  loading: boolean
  error: string | null
}

function getTodayDay(timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date())
  return parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10)
}

function CustomTooltip({
  active,
  payload,
  label,
  todayDay,
}: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: number
  todayDay?: number
}) {
  if (!active || !payload?.length) return null
  const temp = payload[0]?.value
  const isToday = label === todayDay
  return (
    <div className="rounded-lg border border-zinc-300/60 dark:border-zinc-600/60 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm px-3 py-2 shadow-lg text-sm">
      <div className="font-medium text-zinc-700 dark:text-zinc-200">
        Day {label}
        {isToday && <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-semibold">· Today</span>}
      </div>
      {temp != null && !Number.isNaN(temp) && (
        <div className="text-zinc-600 dark:text-zinc-400 mt-0.5">{temp.toFixed(1)}°C</div>
      )}
    </div>
  )
}

export function HistoricalMonthChart({ data, monthName, timezone, loading, error }: HistoricalMonthChartProps) {
  const { theme } = useTheme()
  const todayDay = useMemo(() => getTodayDay(timezone), [timezone])
  const highlightRange = useMemo(() => {
    const start = Math.max(1, todayDay - 4)
    const end = Math.min(31, todayDay + 4)
    return { start, end }
  }, [todayDay])
  const chartData = useMemo(
    () => data.filter((d) => !Number.isNaN(d.avgMax) && d.years > 0),
    [data]
  )

  const monthAvg = useMemo(() => {
    const valid = chartData.filter((d) => !Number.isNaN(d.avgMax) && d.years > 0)
    if (valid.length === 0) return null
    const sum = valid.reduce((s, d) => s + d.avgMax, 0)
    return sum / valid.length
  }, [chartData])

  const tempRange = useMemo(() => {
    const temps = chartData.map((d) => d.avgMax).filter((t) => !Number.isNaN(t))
    const values = monthAvg != null ? [...temps, monthAvg] : temps
    if (values.length === 0) return { min: 0, max: 30 }
    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = Math.max(2, Math.ceil((max - min) * 0.15))
    return { min: min - padding, max: max + padding }
  }, [chartData, monthAvg])

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-zinc-100/60 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-700/50 p-8 flex items-center justify-center min-h-[280px]"
      >
        <div className="animate-pulse text-zinc-500 dark:text-zinc-400 text-sm">Loading...</div>
      </motion.div>
    )
  }

  if (error || chartData.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-zinc-100/60 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-700/50 p-8 text-center min-h-[280px]"
      >
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {error ?? 'No historical data for this month'}
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl bg-zinc-100/60 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-700/50 overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-700/80">
        <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
          Historical · {monthName}
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
          Past {chartData[0]?.years ?? 0} years same-month average max °C
          {chartData.some((d) => d.day === todayDay) && (
            <span className="ml-2 inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-medium text-amber-600 dark:text-amber-400">Today · Day {todayDay}</span>
            </span>
          )}
        </p>
      </div>
      <div className="p-4">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={theme === 'dark' ? '#06b6d4' : '#0891b2'}
                    stopOpacity={theme === 'dark' ? 0.35 : 0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor={theme === 'dark' ? '#06b6d4' : '#0891b2'}
                    stopOpacity={theme === 'dark' ? 0.02 : 0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-zinc-200/80 dark:text-zinc-700/60"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-zinc-500 dark:text-zinc-500"
                tickLine={false}
                axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
                interval={4}
              />
              <YAxis
                domain={[tempRange.min, tempRange.max]}
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-zinc-500 dark:text-zinc-500"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Number(v).toFixed(1)}°`}
                width={32}
              />
              <Tooltip content={<CustomTooltip todayDay={todayDay} />} />
              {monthAvg != null && (
                <ReferenceLine
                  y={monthAvg}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg ${monthAvg.toFixed(1)}°`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: 'currentColor',
                    offset: 4,
                  }}
                />
              )}
              {chartData.some((d) => d.day >= highlightRange.start && d.day <= highlightRange.end) && (
                <>
                  <ReferenceArea
                    x1={highlightRange.start}
                    x2={highlightRange.end}
                    fill="#f59e0b"
                    fillOpacity={0.12}
                  />
                  <ReferenceLine
                    x={highlightRange.start}
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  <ReferenceLine
                    x={highlightRange.end}
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                </>
              )}
              <Area
                type="monotone"
                dataKey="avgMax"
                stroke="#0891b2"
                strokeWidth={2}
                fill="url(#histGradient)"
                dot={({ cx, cy, payload }) =>
                  payload.day === todayDay ? (
                    <circle
                      key={payload.day}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="#f59e0b"
                      stroke="white"
                      strokeWidth={1.5}
                    />
                  ) : null
                }
                activeDot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}
