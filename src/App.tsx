import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Analytics } from '@vercel/analytics/react'
import { CitySelector } from './components/CitySelector'
import { useTheme } from './hooks/useTheme'
import { CityCard } from './components/CityCard'
import { CityDashboard } from './components/CityDashboard/CityDashboard'
import { WeatherLinks } from './components/WeatherLinks'
import { PolymarketFloatingButton } from './components/PolymarketFloatingButton/PolymarketFloatingButton'
import { CITIES } from './config/cities'
import { useForecast } from './hooks/useForecast'
import { useLocalTime } from './hooks/useLocalTime'
import { useAviationWeather } from './hooks/useAviationWeather'
import { useMultiSourceForecast } from './hooks/useMultiSourceForecast'
import { parseCloudBase } from './utils/metarParser'

function getCityFromUrl(): typeof CITIES[0] | null {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('city')
  if (!id) return null
  return CITIES.find((c) => c.id === id) ?? null
}

function App() {
  const [selectedCity, setSelectedCity] = useState<typeof CITIES[0] | null>(() => getCityFromUrl())
  const [dayIndex, setDayIndex] = useState(0)
  const { theme, toggleTheme } = useTheme()

  const handleSelectCity = (city: typeof CITIES[0]) => {
    setSelectedCity(city)
    const url = new URL(window.location.href)
    url.searchParams.set('city', city.id)
    window.history.replaceState(null, '', url.toString())
  }

  useEffect(() => {
    const onPopState = () => {
      setSelectedCity(getCityFromUrl())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const localTime = useLocalTime(selectedCity?.timezone ?? 'UTC')
  const { data: forecast, loading: forecastLoading, error: forecastError } = useForecast(
    selectedCity?.latitude ?? null,
    selectedCity?.longitude ?? null
  )
  const { sources: multiSources } = useMultiSourceForecast(
    selectedCity?.latitude ?? null,
    selectedCity?.longitude ?? null,
    dayIndex
  )
  const { metar, taf, metarHistoryMaxTemp, metarHistoryByDays, loading: aviationLoading, error: aviationError } = useAviationWeather(
    selectedCity?.icao ?? null,
    selectedCity?.timezone ?? 'UTC'
  )

  const dayMax = forecast?.daily?.temperature_2m_max?.[dayIndex] ?? null
  const dayMin = forecast?.daily?.temperature_2m_min?.[dayIndex] ?? null
  const windDir = dayIndex === 0 ? (forecast?.current?.wind_direction_10m ?? null) : (forecast?.daily?.wind_direction_10m_dominant?.[dayIndex] ?? null)
  const windSpeed = dayIndex === 0 ? (forecast?.current?.wind_speed_10m ?? null) : (forecast?.daily?.wind_speed_10m_max?.[dayIndex] ?? null)
  const precipitation = dayIndex === 0
    ? (forecast?.current?.precipitation ?? forecast?.daily?.precipitation_sum?.[0] ?? null)
    : (forecast?.daily?.precipitation_sum?.[dayIndex] ?? null)
  const cloudCover = dayIndex === 0 ? (forecast?.current?.cloud_cover ?? null) : null
  const cloudBaseM = parseCloudBase(metar)

  return (
    <div className="min-h-screen bg-[#f8f8f7] text-zinc-900 dark:bg-[#0c0c0c] dark:text-zinc-100 transition-colors">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 relative"
        >
          <button
            onClick={toggleTheme}
            className="absolute right-0 top-1 p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-all"
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            {theme === 'dark' ? (
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-zinc-800 dark:text-white flex items-center justify-center gap-2.5">
            <img src="/favicon.svg" alt="" className="w-9 h-9 md:w-10 md:h-10" aria-hidden />
            Atmos
          </h1>
          <p className="mt-1.5 text-[13px] text-zinc-400 dark:text-zinc-500 font-normal tracking-wide">
            Weather forecast & aviation data
          </p>
        </motion.header>

        <>
        <div className="mb-6">
          <CitySelector
            cities={CITIES}
            selectedCity={selectedCity}
            onSelect={handleSelectCity}
          />
        </div>

        <AnimatePresence mode="wait">
          {selectedCity ? (
            <motion.div
              key={selectedCity.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <CityCard
                name={selectedCity.name}
                country={selectedCity.country}
                description={selectedCity.description}
                localTime={localTime}
                gradient={selectedCity.gradient}
              />

              <CityDashboard
                city={selectedCity}
                metarHistoryByDays={metarHistoryByDays}
                dayIndex={dayIndex}
                onDayChange={setDayIndex}
                dayMax={dayMax}
                dayMin={dayMin}
                windDir={windDir}
                windSpeed={windSpeed}
                precipitation={precipitation}
                cloudCover={cloudCover}
                cloudBaseM={cloudBaseM}
                forecastLoading={forecastLoading}
                forecastError={forecastError}
                multiSources={multiSources}
                metar={metar}
                taf={taf}
                metarHistoryMaxTemp={metarHistoryMaxTemp}
                aviationLoading={aviationLoading}
                aviationError={aviationError}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-32 text-zinc-400 dark:text-zinc-600 text-sm"
            >
              Select a city above to see weather data
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-16 pb-2 text-center text-[11px] text-zinc-400 dark:text-zinc-600 tracking-wide">
          <p className="flex items-center justify-center gap-1.5 flex-wrap">
            <a href="https://www.rainviewer.com/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">RainViewer</a>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">Open-Meteo</a>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <a href="https://aviationweather.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">Aviation Weather Center</a>
          </p>
        </footer>
        </>
      </div>
      <WeatherLinks city={selectedCity} />
      <PolymarketFloatingButton city={selectedCity} dayIndex={dayIndex} />
      <Analytics />
    </div>
  )
}

export default App
