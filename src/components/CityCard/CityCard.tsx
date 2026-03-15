import { motion } from 'framer-motion'
import { useTranslation } from '../../hooks/useTranslation'

interface CityCardProps {
  name: string
  country: string
  description: string
  localTime: string
  gradient: string
}

export function CityCard({
  name,
  country,
  description,
  localTime,
  gradient,
}: CityCardProps) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden rounded-2xl p-7 md:p-10 shadow-2xl shadow-black/10 dark:shadow-black/40"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-baseline gap-3 mb-1.5"
        >
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-white tracking-tight">
            {name}
          </h1>
          <span className="text-lg text-white/70 font-light">{country}</span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-white/75 text-[15px] max-w-2xl mb-5 font-light leading-relaxed"
        >
          {description}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/10"
        >
          <span className="text-xs text-white/60 uppercase tracking-widest font-medium">{t('cityCard.local')}</span>
          <span className="text-base font-mono font-medium text-white tabular-nums">{localTime}</span>
        </motion.div>
      </div>
    </motion.div>
  )
}
