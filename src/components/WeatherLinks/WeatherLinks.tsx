import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WundergroundEmbed } from '../WundergroundEmbed/WundergroundEmbed'
import { TempConverterDrawer } from '../TempConverterDrawer/TempConverterDrawer'

interface City {
  id: string
  name: string
  latitude: number
  longitude: number
  icao: string
  timezone: string
}

interface WeatherLinksProps {
  city: City | null
}

const LINKS = [
  {
    id: 'windy',
    name: 'Windy',
    desc: 'Wind & weather',
    logo: 'https://www.windy.com/favicon.ico',
    href: (c: City) => `https://www.windy.com/?${c.latitude},${c.longitude},8`,
    fallback: 'https://www.windy.com/',
  },
  {
    id: 'webcams',
    name: 'Webcams',
    desc: 'Live webcams',
    logo: 'https://www.windy.com/favicon.ico',
    href: (c: City) => `https://www.windy.com/webcams?${c.latitude},${c.longitude},10`,
    fallback: 'https://www.windy.com/webcams',
  },
  {
    id: 'ventusky',
    name: 'Ventusky',
    desc: 'Weather map',
    logo: 'https://www.ventusky.com/favicon.ico',
    href: (c: City) => `https://www.ventusky.com/${c.longitude};${c.latitude}`,
    fallback: 'https://www.ventusky.com/',
  },
  {
    id: 'rainviewer',
    name: 'RainViewer',
    desc: 'Radar',
    logo: 'https://www.rainviewer.com/favicon.ico',
    href: () => 'https://www.rainviewer.com/weather-radar-map-live.html',
    fallback: 'https://www.rainviewer.com/weather-radar-map-live.html',
  },
  {
    id: 'aviation',
    name: 'Aviation Weather',
    desc: 'METAR/TAF',
    logo: 'https://aviationweather.gov/assets/nws-BZtavOX9.svg',
    href: (c: City) => `https://aviationweather.gov/metar?ids=${c.icao}`,
    fallback: 'https://aviationweather.gov/',
  },
  {
    id: 'meteoblue',
    name: 'Meteoblue',
    desc: 'Weather map',
    logo: 'https://www.meteoblue.com/favicon.ico',
    href: (c: City) => `https://www.meteoblue.com/en/weather/maps#coords=8/${c.latitude}/${c.longitude}`,
    fallback: 'https://www.meteoblue.com/en/weather/maps',
  },
  {
    id: 'wunderground',
    name: 'Wunderground',
    desc: 'PWS forecast',
    logo: 'https://www.wunderground.com/favicon.ico',
    href: (c: City) => `https://www.wunderground.com/forecast/${c.latitude},${c.longitude}`,
    fallback: 'https://www.wunderground.com/',
  },
]

export function WeatherLinks({ city }: WeatherLinksProps) {
  const [expanded, setExpanded] = useState(false)
  const [wundergroundEmbedOpen, setWundergroundEmbedOpen] = useState(false)
  const [tempConverterOpen, setTempConverterOpen] = useState(false)

  return (
    <>
      {city && (
        <WundergroundEmbed
          city={city}
          open={wundergroundEmbedOpen}
          onClose={() => setWundergroundEmbedOpen(false)}
        />
      )}
      <TempConverterDrawer
        open={tempConverterOpen}
        onClose={() => setTempConverterOpen(false)}
      />
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 }}
      className="fixed bottom-6 left-6 z-40"
    >
      <AnimatePresence>
        {expanded ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl bg-zinc-100/95 dark:bg-zinc-900/95 backdrop-blur-md
              border border-zinc-200/80 dark:border-zinc-700/80 shadow-xl shadow-zinc-900/10
              p-3 mb-2"
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Tools
              </span>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTempConverterOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm col-span-2
                  bg-sky-100/80 dark:bg-sky-900/30 hover:bg-sky-200/80 dark:hover:bg-sky-800/40
                  text-sky-800 dark:text-sky-200 border border-sky-300/50 dark:border-sky-600/50
                  transition-colors"
                title="Temperature converter"
              >
                <svg className="w-6 h-6 flex-shrink-0 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div className="min-w-0 text-left">
                  <span className="font-medium block">Temperature</span>
                  <span className="text-xs text-sky-600 dark:text-sky-400 block">°C / °F / K converter</span>
                </div>
              </button>
              {city && LINKS.map((link) => (
                <a
                  key={link.id}
                  href={city ? link.href(city) : link.fallback}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm
                    bg-zinc-200/60 dark:bg-zinc-800/60 hover:bg-zinc-300/60 dark:hover:bg-zinc-700/60
                    text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100
                    transition-colors border border-transparent hover:border-zinc-300/50 dark:hover:border-zinc-600/50"
                  title={city ? `View ${city.name} on ${link.name}` : link.desc}
                >
                  <img
                    src={link.logo}
                    alt=""
                    className="w-6 h-6 rounded-md flex-shrink-0"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <span className="font-medium block truncate">{link.name}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate block">{link.desc}</span>
                  </div>
                </a>
              ))}
              {city && (
              <button
                type="button"
                onClick={() => setWundergroundEmbedOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm col-span-2
                  bg-amber-100/80 dark:bg-amber-900/30 hover:bg-amber-200/80 dark:hover:bg-amber-800/40
                  text-amber-800 dark:text-amber-200 border border-amber-300/50 dark:border-amber-600/50
                  transition-colors"
                title="Embed Wunderground"
              >
                <img
                  src="https://www.wunderground.com/favicon.ico"
                  alt=""
                  className="w-6 h-6 rounded-md flex-shrink-0"
                  aria-hidden
                />
                <div className="min-w-0 text-left">
                  <span className="font-medium block">Wunderground</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 block">Embed</span>
                </div>
                <svg className="w-4 h-4 ml-auto opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-3 rounded-2xl
          bg-zinc-200/90 dark:bg-zinc-800/90 backdrop-blur-md
          border border-zinc-300/60 dark:border-zinc-600/60
          shadow-lg shadow-zinc-900/10 hover:shadow-xl
          text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100
          transition-all hover:scale-[1.02] active:scale-[0.98]"
        aria-label={expanded ? 'Close tools' : 'Open tools'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <span className="font-medium text-sm">Tools</span>
      </button>
    </motion.div>
    </>
  )
}
