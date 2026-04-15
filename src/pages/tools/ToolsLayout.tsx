import { Link, Outlet } from 'react-router-dom'

export default function ToolsLayout() {
  return (
    <div className="min-h-screen bg-[#0c0f14] text-zinc-100">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 120% 80% at 10% 0%, rgba(251, 191, 36, 0.12), transparent 50%),
            radial-gradient(ellipse 80% 60% at 90% 100%, rgba(56, 189, 248, 0.08), transparent 45%),
            linear-gradient(180deg, #0c0f14 0%, #111827 100%)
          `,
        }}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.04%22/%3E%3C/svg%3E')] opacity-50" aria-hidden />

      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-md bg-[#0c0f14]/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <Link
              to="/"
              className="text-[13px] font-medium text-amber-400/90 hover:text-amber-300 transition-colors tracking-wide"
            >
              ← Atmos
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="font-display text-lg font-semibold text-white tracking-tight">工具</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <Outlet />
      </main>
    </div>
  )
}
