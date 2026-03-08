import { motion, AnimatePresence } from 'framer-motion'

interface City {
  latitude: number
  longitude: number
  icao: string
  name: string
}

interface WundergroundEmbedProps {
  city: City | null
  open: boolean
  onClose: () => void
}

/** Wunderground URL: forecast with lat,lon works for all cities */
function getWundergroundUrl(city: City): string {
  return `https://www.wunderground.com/weather/fr/mauregard/${city.icao}`
}

export function WundergroundEmbed({ city, open, onClose }: WundergroundEmbedProps) {
  if (!city) return null

  const url = getWundergroundUrl(city)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl
              bg-zinc-100 dark:bg-zinc-900 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <img
                  src="https://www.wunderground.com/favicon.ico"
                  alt=""
                  className="w-6 h-6 rounded"
                  aria-hidden
                />
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  Wunderground · {city.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  新窗口打开
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  aria-label="关闭"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <iframe
                src={url}
                title={`Wunderground ${city.name}`}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
