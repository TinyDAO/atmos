import { useState, useEffect } from 'react'
import { fetchForecast } from '../services/openMeteo'
import { fetchWeatherApi } from '../services/weatherApi'
import { fetchOpenWeather } from '../services/openWeatherMap'

export interface SourceForecast {
  source: string
  maxTemp: number | null
  minTemp: number | null
}

export function useMultiSourceForecast(
  lat: number | null,
  lon: number | null,
  dayIndex: number
): { sources: SourceForecast[]; loading: boolean } {
  const [rawSources, setRawSources] = useState<Array<{
    source: string
    maxTemp: (number | null)[]
    minTemp: (number | null)[]
  }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (lat == null || lon == null) {
      setRawSources([])
      return
    }
    setLoading(true)
    const openWeatherKey = import.meta.env.VITE_OPENWEATHER_API_KEY
    const weatherApiKey = import.meta.env.VITE_WEATHERAPI_KEY

    const promises: Promise<{ source: string; maxTemp: (number | null)[]; minTemp: (number | null)[] }>[] = [
      fetchForecast(lat, lon).then((d) => ({
        source: 'Open-Meteo',
        maxTemp: d.daily?.temperature_2m_max ?? [],
        minTemp: d.daily?.temperature_2m_min ?? [],
      })),
    ]

    if (weatherApiKey) {
      promises.push(
        fetchWeatherApi(lat, lon, weatherApiKey)
          .then((d) => {
            const days = d.forecast?.forecastday ?? []
            return {
              source: 'WeatherAPI',
              maxTemp: days.map((fd) => fd?.day?.maxtemp_c ?? null),
              minTemp: days.map((fd) => fd?.day?.mintemp_c ?? null),
            }
          })
          .catch(() => ({ source: 'WeatherAPI', maxTemp: [], minTemp: [] }))
      )
    }
    if (openWeatherKey) {
      promises.push(
        fetchOpenWeather(lat, lon, openWeatherKey)
          .then((d) => ({
            source: 'OpenWeather',
            maxTemp: (d.daily ?? []).map((day) => day?.temp?.max ?? null),
            minTemp: (d.daily ?? []).map((day) => day?.temp?.min ?? null),
          }))
          .catch(() => ({ source: 'OpenWeather', maxTemp: [], minTemp: [] }))
      )
    }

    Promise.all(promises).then(setRawSources).finally(() => setLoading(false))
  }, [lat, lon])

  const sources: SourceForecast[] = rawSources.map((s) => ({
    source: s.source,
    maxTemp: s.maxTemp[dayIndex] ?? null,
    minTemp: s.minTemp[dayIndex] ?? null,
  }))

  return { sources, loading }
}
