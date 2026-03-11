import { useState, useRef } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'

interface TempConverterDrawerProps {
  open: boolean
  onClose: () => void
}

export function TempConverterDrawer({ open, onClose }: TempConverterDrawerProps) {
  const [celsius, setCelsius] = useState<number | null>(null)
  const constraintsRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()
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
        <div
          ref={constraintsRef}
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          aria-hidden
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            drag
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={constraintsRef}
            dragElastic={0}
            dragMomentum={false}
            className="absolute left-1/2 top-1/2 w-80 pointer-events-auto
              rounded-2xl overflow-hidden
              bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl
              border border-zinc-200/80 dark:border-zinc-700/80
              shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.05),0_12px_24px_rgba(0,0,0,0.1)]
              dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.3),0_12px_24px_rgba(0,0,0,0.4)]
              flex flex-col"
            style={{ cursor: 'grab' }}
            whileDrag={{ cursor: 'grabbing', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing select-none
                bg-gradient-to-r from-sky-50/80 to-cyan-50/50 dark:from-sky-950/40 dark:to-cyan-950/20
                border-b border-zinc-200/60 dark:border-zinc-700/60"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Temperature
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300
                  hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 cursor-pointer transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Celsius</label>
                <input
                  type="number"
                  value={c != null ? fmt(c, 2) : ''}
                  onChange={(e) => updateFromC(e.target.value)}
                  placeholder="25"
                  step="0.1"
                  className="w-full px-3 py-2.5 rounded-xl text-sm
                    bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-600/80
                    text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                    focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400/50 dark:focus:ring-sky-400/20
                    transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Fahrenheit</label>
                <input
                  type="number"
                  value={f != null ? fmt(f, 2) : ''}
                  onChange={(e) => updateFromF(e.target.value)}
                  placeholder="77"
                  step="0.1"
                  className="w-full px-3 py-2.5 rounded-xl text-sm
                    bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-600/80
                    text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                    focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400/50 dark:focus:ring-sky-400/20
                    transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Kelvin</label>
                <input
                  type="number"
                  value={k != null ? fmt(k, 2) : ''}
                  onChange={(e) => updateFromK(e.target.value)}
                  placeholder="298.15"
                  step="0.01"
                  className="w-full px-3 py-2.5 rounded-xl text-sm
                    bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-600/80
                    text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                    focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400/50 dark:focus:ring-sky-400/20
                    transition-colors"
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
