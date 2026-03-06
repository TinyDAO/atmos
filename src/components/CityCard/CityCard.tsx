import { motion } from 'framer-motion'

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl p-8 md:p-12"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-baseline gap-3 mb-2"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
            {name}
          </h1>
          <span className="text-xl text-white/90">{country}</span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white/90 text-lg max-w-2xl mb-4"
        >
          {description}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm"
        >
          <span className="text-sm text-white/80">Local time</span>
          <span className="text-lg font-mono font-semibold text-white">{localTime}</span>
        </motion.div>
      </div>
    </motion.div>
  )
}
