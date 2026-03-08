import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TempConverterDrawerProps {
  open: boolean
  onClose: () => void
}

export function TempConverterDrawer({ open, onClose }: TempConverterDrawerProps) {
  const [celsius, setCelsius] = useState<number | null>(null)
  const c = celsius
  const f = c != null ? (c * 9) / 5 + 32 : null
  const k = c != null ? c + 273.15 : null

  const updateFromC = (s: string) => {
    const v = parseFloat(s)
    setCelsius(!isNaN(v) ? v : null)
  }
  const updateFromF = (s: string) => {
    const v = parseFloat(s)
    setCelsius(!isNaN(v) ? ((v - 32) * 5) / 9 : null)
  }
  const updateFromK = (s: string) => {
    const v = parseFloat(s)
    setCelsius(!isNaN(v) ? v - 273.15 : null)
  }

  const fmt = (v: number, decimals: number) =>
    (Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals)).toString()

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
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm
              bg-zinc-100 dark:bg-zinc-900 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Temperature Converter</span>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Celsius °C</label>
                <input
                  type="number"
                  value={c != null ? fmt(c, 2) : ''}
                  onChange={(e) => updateFromC(e.target.value)}
                  placeholder="25"
                  step="0.1"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Fahrenheit °F</label>
                <input
                  type="number"
                  value={f != null ? fmt(f, 2) : ''}
                  onChange={(e) => updateFromF(e.target.value)}
                  placeholder="77"
                  step="0.1"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Kelvin K</label>
                <input
                  type="number"
                  value={k != null ? fmt(k, 2) : ''}
                  onChange={(e) => updateFromK(e.target.value)}
                  placeholder="298.15"
                  step="0.01"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
