import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Hls from 'hls.js'
import { MetarHistoryChart } from '../MetarHistoryChart'
import { HistoricalMonthChart } from '../HistoricalMonthChart/HistoricalMonthChart'
import { PolymarketDashboard } from '../PolymarketDashboard/PolymarketDashboard'
import { WeatherForecast } from '../WeatherForecast'
import { WeatherDetails } from '../WeatherDetails'
import { AviationWeather } from '../AviationWeather'
import { AviationShareModal } from '../AviationShareModal'
import { SatelliteMap } from '../SatelliteMap'
import { useHistoricalMonth } from '../../hooks/useHistoricalMonth'
import { parseTimestampFromMetar, parseTemperatureFromMetar, parseWindFromMetar } from '../../utils/metarParser'
import { analyzeWind } from '../../utils/windAnalysis'
import type { City } from '../../config/cities'
import type { MetarDayData } from '../../utils/metarParser'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface SourceForecast {
  source: string
  maxTemp: number | null
  minTemp: number | null
}

interface CityDashboardProps {
  city: City
  metarHistoryByDays: MetarDayData[]
  dayIndex: number
  onDayChange: (i: number) => void
  dayMax: number | null
  dayMin: number | null
  windDir: number | null
  windSpeed: number | null
  precipitation: number | null
  cloudCover: number | null
  cloudBaseM: number | null
  forecastLoading: boolean
  forecastError: string | null
  multiSources: SourceForecast[]
  metar: string | null
  taf: string | null
  metarHistoryMaxTemp: number | null
  aviationLoading: boolean
  aviationError: string | null
}

type WebcamItem =
  | string
  | { type: 'iframe'; url: string }
  | { type: 'video'; url: string; poster?: string }
  | { type: 'link'; url: string; poster?: string }
  | null

function VideoWebcam({
  url,
  poster,
  title,
  onError,
}: {
  url: string
  poster?: string
  title: string
  onError: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return

    const isHls = url.includes('.m3u8')

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) onErrorRef.current()
      })
      return () => hls.destroy()
    }

    const handleError = () => onErrorRef.current()
    if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.addEventListener('error', handleError)
      return () => video.removeEventListener('error', handleError)
    }

    if (!isHls) {
      video.src = url
      video.addEventListener('error', handleError)
      return () => video.removeEventListener('error', handleError)
    }
  }, [url])

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-cover"
      poster={poster}
      playsInline
      autoPlay
      muted
      loop
      title={title}
    />
  )
}

function WebcamSlot({ item, city, index }: { item: WebcamItem; city: City; index: number }) {
  const [error, setError] = useState(false)
  const isImage = typeof item === 'string'
  const isIframe = item && typeof item === 'object' && item.type === 'iframe'
  const isVideo = item && typeof item === 'object' && item.type === 'video'
  const isLink = item && typeof item === 'object' && item.type === 'link'
  const showPlaceholder = !item || (isImage && error) || (isVideo && error)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className="aspect-video rounded-xl overflow-hidden bg-zinc-200/80 dark:bg-zinc-800/60
        border border-zinc-200/60 dark:border-zinc-700/50 relative"
    >
      {isImage && item && !error ? (
        <img
          src={item}
          alt={`${city.name} webcam ${index + 1}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setError(true)}
        />
      ) : isIframe && item ? (
        <iframe
          src={item.url}
          title={`${city.name} webcam ${index + 1}`}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      ) : isVideo && item && !error ? (
        <VideoWebcam
          url={item.url}
          poster={item.poster}
          title={`${city.name} webcam ${index + 1}`}
          onError={() => setError(true)}
        />
      ) : isLink && item ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full relative group"
        >
          {item.poster ? (
            <img
              src={item.poster}
              alt={`${city.name} webcam ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-300/80 dark:bg-zinc-700/60" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 group-hover:bg-black/50 transition-colors">
            <svg className="w-10 h-10 text-white/90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="text-sm font-medium text-white drop-shadow">观看直播</span>
          </div>
        </a>
      ) : null}
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <svg className="w-8 h-8 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-zinc-500 dark:text-zinc-400"></span>
        </div>
      )}
    </motion.div>
  )
}

function WebcamGrid({ city }: { city: City }) {
  const slots = 4
  const webcams = city.webcams ?? []
  const items: WebcamItem[] = Array.from({ length: slots }, (_, i) => webcams[i] ?? null)

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, i) => (
        <WebcamSlot key={i} item={item} city={city} index={i} />
      ))}
    </div>
  )
}

export function CityDashboard({
  city,
  metarHistoryByDays,
  dayIndex,
  onDayChange,
  dayMax,
  dayMin,
  windDir,
  windSpeed,
  precipitation,
  cloudCover,
  cloudBaseM,
  forecastLoading,
  forecastError,
  multiSources,
  metar,
  taf,
  metarHistoryMaxTemp,
  aviationLoading,
  aviationError,
}: CityDashboardProps) {
  const [showShareModal, setShowShareModal] = useState(false)
  const metarWind = metar ? parseWindFromMetar(metar) : null
  const shareWindAnalysis =
    metarWind && (metarWind.speedKt != null || metarWind.variable)
      ? analyzeWind({
          dirDeg: metarWind.dirDeg,
          variable: metarWind.variable,
          speedKt: metarWind.speedKt,
          gustKt: metarWind.gustKt,
          timezone: city.timezone,
          latitude: city.latitude,
          lang: 'en',
        })
      : null
  const currentMonth = new Date().getMonth()
  const monthName = MONTH_NAMES[currentMonth]
  const { data: historicalData, loading: historicalLoading, error: historicalError } = useHistoricalMonth(
    city.latitude,
    city.longitude,
    city.timezone,
    5
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-4 md:p-5
        bg-gradient-to-br from-zinc-100/90 to-zinc-50/90 dark:from-zinc-900/90 dark:to-zinc-950/90
        border border-zinc-200/60 dark:border-zinc-700/60
        shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)]
        dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_4px_24px_rgba(0,0,0,0.3)]"
    >
      {/* Row 1: Forecast, Details, Webcams (when configured) */}
      <div
        className={`grid grid-cols-1 gap-4 mb-4 items-stretch ${city.webcams?.length ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}
      >
        <WeatherForecast
          maxTemp={dayMax}
          minTemp={dayMin}
          dayIndex={dayIndex}
          onDayChange={onDayChange}
          sources={multiSources}
          loading={forecastLoading}
          error={forecastError}
        />
        <WeatherDetails
          windDir={windDir}
          windSpeed={windSpeed}
          precipitation={precipitation}
          cloudCover={cloudCover}
          cloudBaseM={cloudBaseM}
          loading={forecastLoading}
        />
        {city.webcams?.length ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl bg-white/60 dark:bg-zinc-900/50 backdrop-blur-sm
              border border-zinc-200/60 dark:border-zinc-700/50 overflow-hidden
              shadow-[0_0_0_1px_rgba(0,0,0,0.02)]"
          >
            <div className="px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-700/80">
              <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                Live Webcams
              </h4>
            </div>
            <div className="p-3">
              <WebcamGrid city={city} />
            </div>
          </motion.div>
        ) : null}
      </div>

      {/* Row 2: Aviation Weather — full width */}
      <div className="mb-4">
        <AviationWeather
          metar={metar}
          taf={taf}
          icao={city.icao}
          timezone={city.timezone}
          latitude={city.latitude}
          dayIndex={dayIndex}
          forecastMaxTemp={dayMax}
          metarHistoryMaxTemp={metarHistoryMaxTemp}
          loading={aviationLoading}
          error={aviationError}
          onShare={() => setShowShareModal(true)}
        />
      </div>
      {showShareModal && (
        <AviationShareModal
          city={city}
          metar={metar}
          metarHistoryByDays={metarHistoryByDays}
          metarObservedAt={parseTimestampFromMetar(metar)}
          metarTemp={parseTemperatureFromMetar(metar)}
          metarHistoryMaxTemp={metarHistoryMaxTemp}
          windAnalysis={shareWindAnalysis}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Row 3: MetarHistoryChart | Historical chart */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <MetarHistoryChart
          days={metarHistoryByDays}
          icao={city.icao}
          timezone={city.timezone}
          loading={aviationLoading}
        />
        <HistoricalMonthChart
          data={historicalData}
          monthName={monthName}
          timezone={city.timezone}
          loading={historicalLoading}
          error={historicalError}
        />
      </div>

      {/* Row 5: SatelliteMap | Polymarket */}
      <div className="grid lg:grid-cols-5 gap-4 items-stretch">
        <div className="lg:col-span-3 min-h-0">
          <SatelliteMap lat={city.latitude} lon={city.longitude} />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-0 flex flex-col">
            <PolymarketDashboard city={city} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
