import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { City } from '../../config/cities'
import { formatLocalTime, formatLocalDate } from '../../utils/timezone'

interface CitySelectorProps {
  cities: City[]
  selectedCity: City | null
  onSelect: (city: City) => void
}

export function CitySelector({ cities, selectedCity, onSelect }: CitySelectorProps) {
  const [now, setNow] = useState(() => new Date())
  const [sticky, setSticky] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => (b.utcOffsetMinutes ?? 0) - (a.utcOffsetMinutes ?? 0)),
    [cities]
  )

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.bottom < 0
        setSticky(scrolledPast)
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <AnimatePresence>
        {sticky && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-30 py-2.5 px-4
              bg-white/98 dark:bg-zinc-950/98 backdrop-blur-xl
              border-b border-zinc-200 dark:border-zinc-800
              shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]"
          >
            <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto pb-1">
              {sortedCities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => {
                    onSelect(city)
                    wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={`
                    flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${selectedCity?.id === city.id
                      ? 'bg-amber-500 dark:bg-amber-500 text-white shadow-md shadow-amber-500/25'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }
                  `}
                >
                  {city.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={wrapperRef} className="w-full max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-7 gap-3"
      >
        {sortedCities.map((city, i) => (
          <motion.button
            key={city.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * Math.min(i, 8) }}
            onClick={() => onSelect(city)}
            className={`
              group relative overflow-hidden rounded-2xl aspect-[4/3]
              transition-all duration-300 ease-out border-2
              ${selectedCity?.id === city.id
                ? 'border-amber-500/80 dark:border-amber-400/80 shadow-xl shadow-amber-500/20 dark:shadow-amber-400/20 ring-2 ring-amber-500/30 dark:ring-amber-400/30'
                : 'border-zinc-300/50 dark:border-zinc-700/50 hover:border-zinc-400/70 dark:hover:border-zinc-500/70 hover:shadow-lg'
              }
            `}
          >
            <img
              src={city.image}
              alt={city.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('opacity-0')
              }}
            />
            <div className={`absolute inset-0 bg-gradient-to-br ${city.gradient} opacity-90 opacity-0`} aria-hidden />
            <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent`} />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/30" />
            <div className="absolute inset-0 flex flex-col justify-end p-4 text-left">
              <span className="block text-base font-semibold text-white drop-shadow-lg truncate">
                {city.name}
              </span>
              <span className="block text-xs text-white/90 truncate">{city.country}</span>
              <span className="block text-xs text-white/80 mt-0.5">
                {formatLocalDate(city.timezone, now)} {formatLocalTime(city.timezone, now)}
              </span>
            </div>
            {selectedCity?.id === city.id && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </motion.button>
        ))}
      </motion.div>
      </div>
    </>
  )
}
