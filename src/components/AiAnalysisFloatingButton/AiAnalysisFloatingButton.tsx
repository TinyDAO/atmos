import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'
import { useTranslation } from '../../hooks/useTranslation'
import { usePoints } from '../../hooks/usePoints'
import { AiAnalysisPanel } from '../AiAnalysisPanel'

interface AiAnalysisFloatingButtonProps {
  metar: string | null
  taf: string | null
  icao: string
  lang: 'en' | 'zh'
  aviationLoading: boolean
  aviationError: string | null
}

export function AiAnalysisFloatingButton({
  metar,
  taf,
  icao,
  lang,
  aviationLoading,
  aviationError,
}: AiAnalysisFloatingButtonProps) {
  const { t } = useTranslation()
  const { address, isConnected } = useAccount()
  const { points } = usePoints(isConnected ? address : undefined)
  const [showPanel, setShowPanel] = useState(false)

  const ready = !aviationLoading && !aviationError && !!metar && !!icao
  const canUse = isConnected && !!address && (points ?? 0) >= 1
  const disabled = !canUse

  if (!ready) return null

  return (
    <>
      <motion.button
        type="button"
        onClick={() => {
          if (disabled) {
            toast.error(!isConnected ? t('aiPanel.loginRequired') : t('aiPanel.insufficientPoints').replace('{{points}}', String(points ?? 0)))
            return
          }
          setShowPanel(true)
        }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        title={
          disabled
            ? !isConnected
              ? t('aiPanel.loginRequired')
              : t('aiPanel.insufficientPoints').replace('{{points}}', String(points ?? 0))
            : t('aviation.aiAnalysis')
        }
        className={`fixed bottom-28 right-6 z-50 flex items-center gap-2 px-3 py-2 md:gap-2.5 md:px-3.5 md:py-2.5 rounded-xl shadow-lg
          transition-all duration-200
          ${
            disabled
              ? 'bg-zinc-300/80 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400 cursor-pointer'
              : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
          }`}
      >
        <svg className="w-5 h-5 md:w-6 md:h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <div className="flex flex-col min-w-0 text-left">
          <span className="font-medium text-xs md:text-[13px] whitespace-nowrap">{t('aviation.aiAnalysis')}</span>
          <span className="hidden md:block text-[11px] opacity-80">{icao}</span>
        </div>
      </motion.button>

      <AnimatePresence>
        {showPanel && metar && (
          <AiAnalysisPanel
            metar={metar}
            taf={taf}
            icao={icao}
            lang={lang}
            onClose={() => setShowPanel(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
