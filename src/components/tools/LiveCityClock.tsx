import { useEffect, useState } from 'react'

export type LiveCityClockVariant = 'us' | 'eu'

function formatCityLocalTime(timeZone: string, variant: LiveCityClockVariant): string {
  try {
    if (variant === 'us') {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date())
    }
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date())
  } catch {
    return '—'
  }
}

/** 卡片内：该城市时区当前时间，每秒刷新（与 US / EU 扫描页一致） */
export function LiveCityClock({
  timeZone,
  variant = 'us',
}: {
  timeZone: string
  variant?: LiveCityClockVariant
}) {
  const [label, setLabel] = useState(() => formatCityLocalTime(timeZone, variant))

  useEffect(() => {
    const tick = () => setLabel(formatCityLocalTime(timeZone, variant))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [timeZone, variant])

  return (
    <span className="font-mono tabular-nums tracking-tight" title={timeZone}>
      {label}
    </span>
  )
}
