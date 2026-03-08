import { motion } from 'framer-motion'

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
    desc: '风场与天气',
    href: (c: City) => `https://www.windy.com/?${c.latitude},${c.longitude},8`,
    fallback: 'https://www.windy.com/',
  },
  {
    id: 'ventusky',
    name: 'Ventusky',
    desc: '天气地图',
    href: (c: City) => `https://www.ventusky.com/${c.longitude};${c.latitude}`,
    fallback: 'https://www.ventusky.com/',
  },
  {
    id: 'rainviewer',
    name: 'RainViewer',
    desc: '雷达降水',
    href: () => 'https://www.rainviewer.com/weather-radar-map-live.html',
    fallback: 'https://www.rainviewer.com/weather-radar-map-live.html',
  },
  {
    id: 'aviation',
    name: 'Aviation Weather',
    desc: 'METAR/TAF',
    href: (c: City) => `https://aviationweather.gov/metar?ids=${c.icao}`,
    fallback: 'https://aviationweather.gov/',
  },
  {
    id: 'meteoblue',
    name: 'Meteoblue',
    desc: '天气地图',
    href: (c: City) => `https://www.meteoblue.com/en/weather/maps#coords=8/${c.latitude}/${c.longitude}`,
    fallback: 'https://www.meteoblue.com/en/weather/maps',
  },
  {
    id: 'wunderground',
    name: 'Wunderground',
    desc: 'PWS 预报',
    href: (c: City) => `https://www.wunderground.com/forecast/${c.latitude},${c.longitude}`,
    fallback: 'https://www.wunderground.com/',
  },
]

export function WeatherLinks({ city }: WeatherLinksProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl bg-zinc-100/80 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-700/50 p-4"
    >
      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-3">
        跳转工具
      </p>
      <div className="flex flex-wrap gap-2">
        {LINKS.map((link) => (
          <a
            key={link.id}
            href={city ? link.href(city) : link.fallback}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm
              bg-zinc-200/60 dark:bg-zinc-800/60 hover:bg-zinc-300/60 dark:hover:bg-zinc-700/60
              text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100
              transition-colors border border-transparent hover:border-zinc-300/50 dark:hover:border-zinc-600/50"
            title={city ? `在 ${link.name} 查看 ${city.name} 天气` : link.desc}
          >
            <span className="font-medium">{link.name}</span>
            <span className="text-zinc-500 dark:text-zinc-400 text-xs">{link.desc}</span>
          </a>
        ))}
      </div>
    </motion.div>
  )
}
