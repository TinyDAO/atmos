/**
 * Parse cloud layers from METAR string.
 * Examples: FEW020, SCT035, BKN060, OVC080
 * Numbers are cloud base height in hundreds of feet (e.g. 060 = 6000 ft)
 */
export function parseCloudBase(metar: string | null): number | null {
  if (!metar) return null
  const match = metar.match(/\b(FEW|SCT|BKN|OVC)(\d{3})\b/)
  if (!match) return null
  const heightHundredsFt = parseInt(match[2], 10)
  const heightMeters = Math.round(heightHundredsFt * 100 * 0.3048)
  return heightMeters
}

/**
 * Parse current temperature from METAR.
 * Format: TT/TdTd or Mtt/Mtd (e.g. 18/16 = 18°C, M05/M07 = -5°C/-7°C)
 */
export function parseTemperatureFromMetar(metar: string | null): number | null {
  if (!metar) return null
  const match = metar.match(/\b(M?\d{2})\/(M?\d{2})\b/)
  if (!match) return null
  const tempStr = match[1]
  const temp = tempStr.startsWith('M') ? -parseInt(tempStr.slice(1), 10) : parseInt(tempStr, 10)
  return isNaN(temp) ? null : temp
}

/**
 * Parse maximum temperature from METAR remarks (TXnn/nnnnZ).
 * Example: TX18/0615Z = max 18°C at 06:15 UTC
 */
export function parseMaxTempFromMetarRemarks(metar: string | null): number | null {
  if (!metar) return null
  const match = metar.match(/\bTX(M?\d{2})\/(\d{4,6})Z\b/)
  if (!match) return null
  const tempStr = match[1]
  const temp = tempStr.startsWith('M') ? -parseInt(tempStr.slice(1), 10) : parseInt(tempStr, 10)
  return isNaN(temp) ? null : temp
}

/**
 * Parse minimum temperature from METAR remarks (TNnn/nnnnZ).
 * Example: TN12/0420Z = min 12°C at 04:20 UTC
 */
export function parseMinTempFromMetarRemarks(metar: string | null): number | null {
  if (!metar) return null
  const match = metar.match(/\bTN(M?\d{2})\/(\d{4,6})Z\b/)
  if (!match) return null
  const tempStr = match[1]
  const temp = tempStr.startsWith('M') ? -parseInt(tempStr.slice(1), 10) : parseInt(tempStr, 10)
  return isNaN(temp) ? null : temp
}

/**
 * Parse dewpoint from METAR (second value in TT/TdTd).
 */
export function parseDewpointFromMetar(metar: string | null): number | null {
  if (!metar) return null
  const match = metar.match(/\b(M?\d{2})\/(M?\d{2})\b/)
  if (!match) return null
  const dpStr = match[2]
  const dp = dpStr.startsWith('M') ? -parseInt(dpStr.slice(1), 10) : parseInt(dpStr, 10)
  return isNaN(dp) ? null : dp
}

/**
 * Parse timestamp from METAR (DDHHMMZ format, e.g. 011551Z = day 01, 15:51 UTC).
 */
export function parseTimestampFromMetar(metar: string | null): Date | null {
  if (!metar) return null
  const match = metar.match(/\b(\d{2})(\d{2})(\d{2})Z\b/)
  if (!match) return null
  const day = parseInt(match[1], 10)
  const hour = parseInt(match[2], 10)
  const min = parseInt(match[3], 10)
  const now = new Date()
  let d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, min, 0))
  if (d.getTime() > now.getTime() + 12 * 60 * 60 * 1000) {
    d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, day, hour, min, 0))
  }
  return d
}

export interface MetarChartPoint {
  time: Date
  label: string
  temp: number
  dewpoint: number | null
}

/**
 * Parse METAR history into chart-ready time series (temp, dewpoint).
 */
export function parseMetarHistoryToChartData(metars: string[]): MetarChartPoint[] {
  const points: MetarChartPoint[] = []
  for (const m of metars) {
    const time = parseTimestampFromMetar(m)
    const temp = parseTemperatureFromMetar(m)
    const dewpoint = parseDewpointFromMetar(m)
    if (time && temp !== null) {
      const pad = (n: number) => String(n).padStart(2, '0')
      points.push({
        time,
        label: `${pad(time.getUTCHours())}:${pad(time.getUTCMinutes())}`,
        temp,
        dewpoint,
      })
    }
  }
  points.sort((a, b) => a.time.getTime() - b.time.getTime())
  return points
}

/**
 * Parse all temperatures from METAR history and return the maximum.
 */
export function parseMaxTempFromMetarHistory(metars: string[]): number | null {
  const temps = metars
    .map((m) => parseTemperatureFromMetar(m))
    .filter((t): t is number => t !== null)
  if (temps.length === 0) return null
  return Math.max(...temps)
}

export interface MetarDayData {
  dateStr: string
  label: string
  points: MetarChartPoint[]
  maxTemp: number | null
  minTemp: number | null
  isToday: boolean
}

/**
 * Parse METAR history into daily groups (by local timezone).
 * Returns array of days, newest first (today, yesterday, ...).
 */
export function parseMetarHistoryByDays(metars: string[], timezone: string): MetarDayData[] {
  const rawPoints = parseMetarHistoryToChartData(metars)
  const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const timeFmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false })
  const todayStr = dateFmt.format(new Date())
  const nowStr = timeFmt.format(new Date())

  const byDate = new Map<string, MetarChartPoint[]>()
  for (const p of rawPoints) {
    const dStr = dateFmt.format(p.time)
    const tStr = timeFmt.format(p.time)
    if (dStr === todayStr && tStr > nowStr) continue
    const arr = byDate.get(dStr) ?? []
    arr.push(p)
    byDate.set(dStr, arr)
  }

  const [y, m, d] = todayStr.split('-').map(Number)
  const yesterdayStr = dateFmt.format(new Date(Date.UTC(y, m - 1, d - 1)))
  const sortedDates = Array.from(byDate.keys()).sort().reverse()
  const result: MetarDayData[] = []
  sortedDates.forEach((dateStr) => {
    const [, mo, da] = dateStr.split('-').map(Number)
    const label = dateStr === todayStr ? '今日' : dateStr === yesterdayStr ? '昨日' : `${mo}月${da}日`

    const points = (byDate.get(dateStr) ?? []).sort((a, b) => a.time.getTime() - b.time.getTime())
    const temps = points.map((p) => p.temp).filter((t) => !Number.isNaN(t))
    const maxTemp = temps.length ? Math.max(...temps) : null
    const minTemp = temps.length ? Math.min(...temps) : null
    result.push({
      dateStr,
      label,
      points,
      maxTemp,
      minTemp,
      isToday: dateStr === todayStr,
    })
  })
  return result
}

/**
 * Parse max temperature from METAR history, filtered to local today (midnight to now).
 */
export function parseMaxTempFromMetarHistoryLocalToday(metars: string[], timezone: string): number | null {
  const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const timeFmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false })
  const todayStr = dateFmt.format(new Date())
  const nowStr = timeFmt.format(new Date())

  const temps: number[] = []
  for (const m of metars) {
    const time = parseTimestampFromMetar(m)
    const temp = parseTemperatureFromMetar(m)
    if (!time || temp === null) continue
    const dStr = dateFmt.format(time)
    const tStr = timeFmt.format(time)
    if (dStr !== todayStr || tStr > nowStr) continue
    temps.push(temp)
  }
  if (temps.length === 0) return null
  return Math.max(...temps)
}
