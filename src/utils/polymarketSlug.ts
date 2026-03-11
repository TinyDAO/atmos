/** Build Polymarket event slug for highest-temperature market */
export function getPolymarketSlug(
  cityId: string,
  dayIndex: number,
  timezone: string
): string {
  const d = new Date()
  d.setTime(d.getTime() + dayIndex * 24 * 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).formatToParts(d)
  const month = parts.find((p) => p.type === 'month')?.value?.toLowerCase() ?? ''
  const day = parts.find((p) => p.type === 'day')?.value ?? ''
  const year = parts.find((p) => p.type === 'year')?.value ?? ''
  return `highest-temperature-in-${cityId}-on-${month}-${day}-${year}`
}
