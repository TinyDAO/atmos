/**
 * Weather Underground / Weather Company Data API
 * Wunderground 的公开 API 已停用，使用同属 IBM 的 Weather Company Data API（数据源相同）
 * 需申请免费试用: https://www.weathercompany.com/weather-data-api-free-trial/
 */
export interface WundergroundForecast {
  temperatureMax?: (number | null)[]
  temperatureMin?: (number | null)[]
  calendarDayTemperatureMax?: (number | null)[]
  calendarDayTemperatureMin?: (number | null)[]
}

export async function fetchWunderground(
  lat: number,
  lon: number,
  apiKey: string
): Promise<WundergroundForecast> {
  const params = new URLSearchParams({
    geocode: `${lat},${lon}`,
    units: 'm',
    language: 'en-US',
    format: 'json',
    apiKey,
  })
  const res = await fetch(
    `https://api.weather.com/v3/wx/forecast/daily/5day?${params}`
  )
  if (!res.ok) throw new Error('Wunderground fetch failed')
  return res.json()
}
