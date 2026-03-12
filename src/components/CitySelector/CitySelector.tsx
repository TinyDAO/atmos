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
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stickyButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
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

  useEffect(() => {
    if (!sticky || !selectedCity) return
    const btn = stickyButtonRefs.current.get(selectedCity.id)
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [sticky, selectedCity?.id])

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
            <div className="max-w-[90rem] mx-auto flex items-center gap-2 overflow-x-auto pb-1 scroll-smooth">
              {sortedCities.map((city) => (
                <button
                  key={city.id}
                  ref={(el) => {
                    if (el) stickyButtonRefs.current.set(city.id, el)
                    else stickyButtonRefs.current.delete(city.id)
                  }}
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
      <div ref={wrapperRef} className="w-full max-w-[90rem] mx-auto">
        {/* Mobile: custom city picker with bottom sheet */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="md:hidden"
        >
          <button
            type="button"
            onClick={() => setMobilePickerOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl
              bg-zinc-100 dark:bg-zinc-800/80 border-2 border-zinc-200 dark:border-zinc-700
              hover:border-amber-500/50 dark:hover:border-amber-500/50
              active:scale-[0.99] transition-all duration-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              {selectedCity && (
                <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden ring-2 ring-amber-500/30">
                  <img
                    src={selectedCity.image}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                  <div className={`hidden w-full h-full bg-gradient-to-br ${selectedCity.gradient}`} />
                </div>
              )}
              <div className="text-left min-w-0">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {selectedCity?.name ?? 'Select city'}
                </span>
                {selectedCity && (
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {selectedCity.country} · {formatLocalTime(selectedCity.timezone, now)}
                  </span>
                )}
              </div>
            </div>
            <svg className="w-5 h-5 shrink-0 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <AnimatePresence>
            {mobilePickerOpen && (
              <motion.div
                key="picker-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={() => setMobilePickerOpen(false)}
                aria-hidden
              />
            )}
            {mobilePickerOpen && (
              <motion.div
                key="picker-sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col
                  bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl
                  border-t border-zinc-200 dark:border-zinc-800"
              >
                <div className="shrink-0 pt-3 pb-2 px-4">
                  <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mx-auto" />
                  <h3 className="text-center text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-3">
                    Select city
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain pb-6 px-4">
                  <div className="grid grid-cols-2 gap-3">
                    {sortedCities.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => {
                          onSelect(city)
                          setMobilePickerOpen(false)
                        }}
                        className={`
                          relative overflow-hidden rounded-xl aspect-[4/3] text-left
                          transition-all duration-200 active:scale-[0.98]
                          ${selectedCity?.id === city.id
                            ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900'
                            : ''
                          }
                        `}
                      >
                        <img
                          src={city.image}
                          alt={city.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('opacity-0')
                          }}
                        />
                        <div className={`absolute inset-0 bg-gradient-to-br ${city.gradient} opacity-90 opacity-0`} aria-hidden />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute inset-0 flex flex-col justify-end p-3">
                          <span className="block text-sm font-semibold text-white drop-shadow-lg truncate">
                            {city.name}
                          </span>
                          <span className="block text-xs text-white/90 truncate">{city.country}</span>
                        </div>
                        {selectedCity?.id === city.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Desktop: grid of city cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="hidden md:grid grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2"
        >
        {sortedCities.map((city, i) => (
          <motion.button
            key={city.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * Math.min(i, 8) }}
            onClick={() => onSelect(city)}
            className={`
              group relative overflow-hidden rounded-xl aspect-[3/2]
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
            <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent`} />
            <div className="absolute inset-0 flex flex-col justify-center p-3 text-left">
              <span className="block text-sm font-semibold text-white drop-shadow-md truncate">
                {city.name}
              </span>
              <span className="block text-xs text-white/90 truncate">{city.country}</span>
              <span className="block text-xs text-white/80 mt-0.5 truncate">
                {formatLocalDate(city.timezone, now)} {formatLocalTime(city.timezone, now)}
              </span>
            </div>
            {selectedCity?.id === city.id && (
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
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
