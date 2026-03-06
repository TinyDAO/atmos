export interface OpenWeatherForecast {
  daily?: Array<{
    temp: { max: number; min: number }
    wind_speed: number
    wind_deg: number
    rain?: number
    pop: number
    clouds: number
  }>
  current?: {
    temp: number
    wind_speed: number
    wind_deg: number
    clouds: number
    rain?: { '1h': number }
  }
}

export async function fetchOpenWeather(
  lat: number,
  lon: number,
  apiKey: string
): Promise<OpenWeatherForecast> {
  const res = await fetch(
    `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,hourly,alerts&appid=${apiKey}`
  )
  if (!res.ok) throw new Error('OpenWeatherMap fetch failed')
  return res.json()
}
