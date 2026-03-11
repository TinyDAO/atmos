/** Historical weather from Open-Meteo Archive API */
export interface HistoricalDaily {
  time: string[]
  temperature_2m_max: number[]
}

export async function fetchHistoricalMonth(
  lat: number,
  lon: number,
  year: number,
  month: number,
  timezone: string
): Promise<HistoricalDaily> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    start_date: start,
    end_date: end,
    daily: 'temperature_2m_max',
    timezone,
  })
  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`)
  if (!res.ok) throw new Error('Failed to fetch historical weather')
  const data = await res.json()
  return {
    time: data.daily?.time ?? [],
    temperature_2m_max: data.daily?.temperature_2m_max ?? [],
  }
}

/** Aggregate same-month data from multiple years into day-of-month averages */
export function aggregateSameMonthAverages(
  yearlyData: { time: string[]; temperature_2m_max: number[] }[]
): Array<{ day: number; avgMax: number; years: number }> {
  const byDay = new Map<number, number[]>()
  for (const { time, temperature_2m_max } of yearlyData) {
    for (let i = 0; i < time.length; i++) {
      const date = new Date(time[i])
      const day = date.getDate()
      const temp = temperature_2m_max[i]
      if (temp != null && !Number.isNaN(temp)) {
        const arr = byDay.get(day) ?? []
        arr.push(temp)
        byDay.set(day, arr)
      }
    }
  }
  return Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
    const temps = byDay.get(day) ?? []
    const avgMax = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : NaN
    return { day, avgMax, years: temps.length }
  })
}
