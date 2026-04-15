import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function UsCityScanPage() {
  return (
    <div>
      <nav className="mb-8">
        <Link
          to="/tools"
          className="text-[13px] font-medium text-amber-400/80 hover:text-amber-300 transition-colors"
        >
          ← 工具列表
        </Link>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-8 py-16 text-center backdrop-blur-sm"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">US cities</p>
        <h1 className="mt-3 font-display text-2xl md:text-3xl font-semibold text-white tracking-tight">
          美国城市扫描
        </h1>
        <p className="mt-4 text-sm text-zinc-500">建设中，敬请期待。</p>
      </motion.div>
    </div>
  )
}
