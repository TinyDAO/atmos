import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function ToolsIndexPage() {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-white tracking-tight">
          工具台
        </h1>
        <p className="mt-2 text-sm text-zinc-500 max-w-lg leading-relaxed">
          辅助脚本与数据的可视化入口。主页不展示此区域链接，请收藏或直接访问路径。
        </p>
      </motion.div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        <motion.li
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          <Link
            to="/tools/china-scan"
            className="group block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm transition-all hover:border-amber-500/40 hover:bg-amber-500/[0.06] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-white group-hover:text-amber-100 transition-colors">
                  中国城市扫描
                </h2>
                <p className="mt-2 text-[13px] text-zinc-500 leading-relaxed">
                  墨迹三天最高温 vs Polymarket 温度档位（YES≥2%）
                </p>
              </div>
              <span
                className="shrink-0 text-amber-400/80 group-hover:translate-x-0.5 transition-transform"
                aria-hidden
              >
                →
              </span>
            </div>
          </Link>
        </motion.li>
        <motion.li
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
        >
          <Link
            to="/tools/us-scan"
            className="group block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm transition-all hover:border-sky-500/35 hover:bg-sky-500/[0.05] focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-white group-hover:text-sky-100 transition-colors">
                  美国城市扫描
                </h2>
                <p className="mt-2 text-[13px] text-zinc-500 leading-relaxed">
                  NOAA 三天最高温 vs Polymarket 温度档位
                </p>
              </div>
              <span
                className="shrink-0 text-sky-400/70 group-hover:translate-x-0.5 transition-transform"
                aria-hidden
              >
                →
              </span>
            </div>
          </Link>
        </motion.li>
      </ul>
    </div>
  )
}
