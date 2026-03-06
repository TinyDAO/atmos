const AVIATION_BASE = import.meta.env.DEV ? '/aviation-weather/api' : 'https://aviationweather.gov/api'

export async function fetchMetar(icao: string): Promise<string> {
  const url = `${AVIATION_BASE}/data/metar?ids=${icao}&format=raw`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch METAR')
  const text = await res.text()
  return text.trim() || 'No METAR data available'
}

/**
 * Fetch historical METARs for the past N hours (max 360 = 15 days).
 * Returns array of raw METAR strings, one per observation.
 */
export async function fetchMetarHistory(icao: string, hours = 360): Promise<string[]> {
  const url = `${AVIATION_BASE}/data/metar?ids=${icao}&format=raw&hours=${hours}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch METAR history')
  const text = await res.text()
  const lines = text.trim().split(/\n/).filter((l) => l.trim().length > 0)
  return lines
}

export async function fetchTaf(icao: string): Promise<string> {
  const url = `${AVIATION_BASE}/data/taf?ids=${icao}&format=raw`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch TAF')
  const text = await res.text()
  return text.trim() || 'No TAF data available'
}
