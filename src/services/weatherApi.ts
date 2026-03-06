export interface WeatherApiForecast {
  current?: {
    temp_c: number
    wind_kph: number
    wind_degree: number
    wind_dir: string
    precip_mm: number
    cloud: number
  }
  forecast?: {
    forecastday: Array<{
      day: {
        maxtemp_c: number
        mintemp_c: number
        totalprecip_mm: number
        daily_chance_of_rain: number
      }
    }>
  }
}

export async function fetchWeatherApi(
  lat: number,
  lon: number,
  apiKey: string
): Promise<WeatherApiForecast> {
  const params = new URLSearchParams({
    key: apiKey,
    q: `${lat},${lon}`,
    days: '3',
  })
  const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?${params}`)
  if (!res.ok) throw new Error('WeatherAPI fetch failed')
  return res.json()
}
