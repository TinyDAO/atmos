export interface OpenMeteoForecast {
  latitude: number
  longitude: number
  current?: {
    wind_direction_10m: number
    wind_speed_10m: number
    precipitation: number
    cloud_cover: number
  }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    weather_code: number[]
    precipitation_sum?: number[]
    rain_sum?: number[]
    wind_direction_10m_dominant?: number[]
    wind_speed_10m_max?: number[]
  }
}

export async function fetchForecast(lat: number, lon: number): Promise<OpenMeteoForecast> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: 'wind_direction_10m,wind_speed_10m,precipitation,cloud_cover',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,rain_sum,wind_direction_10m_dominant,wind_speed_10m_max',
    timezone: 'auto',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error('Failed to fetch forecast')
  return res.json()
}
