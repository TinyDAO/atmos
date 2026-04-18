/**
 * 扫描工具页右侧「快速跳转」侧栏（us-scan / china-scan 共用布局与交互）。
 * 主内容区在 `visible` 为 true 时需预留右侧空间，见 {@link SCAN_QUICK_JUMP_LAYOUT_PADDING}。
 */
export const SCAN_QUICK_JUMP_LAYOUT_PADDING = 'lg:pr-[15rem] xl:pr-[16.5rem]'

export type ScanQuickJumpAccent = 'sky' | 'amber'

export interface ScanQuickJumpItem {
  id: string
  name: string
}

export interface ScanQuickJumpAsideProps {
  visible: boolean
  ariaLabel: string
  title: string
  description: string
  items: readonly ScanQuickJumpItem[]
  activeId: string | null
  onSelect: (id: string) => void
  /** 每个按钮的 DOM id，用于滚动高亮项进侧栏可视区 */
  getNavButtonId: (cityId: string) => string
  accent: ScanQuickJumpAccent
}

export function ScanQuickJumpAside({
  visible,
  ariaLabel,
  title,
  description,
  items,
  activeId,
  onSelect,
  getNavButtonId,
  accent,
}: ScanQuickJumpAsideProps) {
  if (!visible) return null

  const ringPanel = accent === 'sky' ? 'ring-sky-500/10' : 'ring-amber-500/10'
  const headerGradient = accent === 'sky' ? 'from-sky-500/8' : 'from-amber-500/8'
  const scrollbar =
    accent === 'sky'
      ? '[scrollbar-color:rgba(56,189,248,0.35)_transparent]'
      : '[scrollbar-color:rgba(251,191,36,0.35)_transparent]'
  const focusRing = accent === 'sky' ? 'focus-visible:ring-sky-400/50' : 'focus-visible:ring-amber-400/50'
  const activeBtn =
    accent === 'sky'
      ? 'border-sky-400/50 bg-sky-500/[0.22] shadow-[inset_0_0_0_1px_rgba(56,189,248,0.18)] ring-1 ring-sky-400/35'
      : 'border-amber-400/50 bg-amber-500/[0.22] shadow-[inset_0_0_0_1px_rgba(251,191,36,0.18)] ring-1 ring-amber-400/35'
  const idleBtn =
    accent === 'sky'
      ? 'border-white/[0.06] bg-white/[0.03] hover:border-sky-500/35 hover:bg-sky-500/12'
      : 'border-white/[0.06] bg-white/[0.03] hover:border-amber-500/35 hover:bg-amber-500/12'
  const badgeActive =
    accent === 'sky'
      ? 'bg-sky-400/35 text-white ring-sky-300/45'
      : 'bg-amber-400/35 text-white ring-amber-300/45'
  const badgeIdle =
    accent === 'sky'
      ? 'bg-zinc-800/90 text-sky-300 ring-white/10 group-hover:bg-sky-500/20 group-hover:text-sky-100 group-hover:ring-sky-400/30'
      : 'bg-zinc-800/90 text-amber-300 ring-white/10 group-hover:bg-amber-500/20 group-hover:text-amber-100 group-hover:ring-amber-400/30'

  return (
    <aside
      className={`hidden lg:flex lg:flex-col fixed right-4 top-[max(5.5rem,18vh)] z-30 w-[13rem] xl:w-[14.5rem] max-h-[min(78vh,720px)] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#080a0e]/95 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.65)] ring-1 ${ringPanel} backdrop-blur-xl`}
      aria-label={ariaLabel}
    >
      <div
        className={`shrink-0 border-b border-white/[0.08] bg-gradient-to-b ${headerGradient} to-transparent px-3.5 py-3.5`}
      >
        <p className="text-base font-semibold tracking-tight text-zinc-50">{title}</p>
        <p className="mt-1.5 text-[13px] leading-snug text-zinc-400">{description}</p>
      </div>
      <nav
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-3 pt-2.5 [scrollbar-width:thin] ${scrollbar}`}
      >
        <ul className="flex flex-col gap-1">
          {items.map((item, i) => {
            const isActive = item.id === activeId
            return (
              <li key={item.id}>
                <button
                  type="button"
                  id={getNavButtonId(item.id)}
                  onClick={() => onSelect(item.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`group w-full rounded-xl border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 ${focusRing} focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a0e] active:scale-[0.99] ${
                    isActive ? activeBtn : idleBtn
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold tabular-nums ring-1 transition-colors ${
                        isActive ? badgeActive : badgeIdle
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-[14px] font-semibold leading-snug ${
                        isActive ? 'text-white' : 'text-zinc-100 group-hover:text-white'
                      }`}
                    >
                      {item.name}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
