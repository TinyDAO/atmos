/**
 * Get UTC offset in minutes for a timezone (positive = east of UTC).
 * Used for sorting cities by timezone.
 */
export function getTimezoneOffsetMinutes(timezone: string): number {
  const now = new Date()
  try {
    for (const tzName of ['longOffset', 'shortOffset'] as const) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: tzName,
      }).formatToParts(now)
      const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
      if (/^GMT$|^UTC$/i.test(tzPart)) return 0
      const match = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i)
      if (match) {
        const sign = match[1] === '+' ? 1 : -1
        const hours = parseInt(match[2], 10)
        const mins = parseInt(match[3] ?? '0', 10)
        return sign * (hours * 60 + mins)
      }
    }
  } catch {
    /* fall through to hour-diff method */
  }
  const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes()
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const h = parseInt(fmt.find((p) => p.type === 'hour')?.value ?? '0', 10)
  const m = parseInt(fmt.find((p) => p.type === 'minute')?.value ?? '0', 10)
  let localMins = h * 60 + m
  if (localMins - utcMins < -12 * 60) localMins += 24 * 60
  if (localMins - utcMins > 12 * 60) localMins -= 24 * 60
  return localMins - utcMins
}

export function formatLocalTime(timezone: string, date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return '--:--:--'
  }
}

export function formatLocalDate(timezone: string, date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('zh-CN', {
      timeZone: timezone,
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(date)
    const month = parts.find((p) => p.type === 'month')?.value ?? ''
    const day = parts.find((p) => p.type === 'day')?.value ?? ''
    return `${month}月${day}日`
  } catch {
    return '--'
  }
}
