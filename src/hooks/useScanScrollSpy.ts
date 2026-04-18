import { useEffect, useState } from 'react'

/**
 * 视口顶部附近（与卡片 `scroll-mt-24` 对齐）：卡片顶边越过该线即视为「当前」城市。
 */
const VIEWPORT_ACTIVATION_TOP_PX = 104

/**
 * 根据主列表卡片在视口中的位置，返回当前应对应高亮的城市 `id`（与 `document.getElementById(\`${prefix}-${id}\`)` 一致）。
 */
export function useScanScrollSpy(
  cityIds: readonly string[],
  domIdPrefix: string
): string | null {
  const [activeCityId, setActiveCityId] = useState<string | null>(() => cityIds[0] ?? null)

  useEffect(() => {
    if (cityIds.length === 0) {
      setActiveCityId(null)
      return
    }

    const compute = () => {
      let active = cityIds[0]
      for (let i = 0; i < cityIds.length; i++) {
        const id = cityIds[i]
        const el = document.getElementById(`${domIdPrefix}-${id}`)
        if (!el) continue
        if (el.getBoundingClientRect().top <= VIEWPORT_ACTIVATION_TOP_PX) active = id
      }
      setActiveCityId((prev) => (prev === active ? prev : active))
    }

    compute()
    window.addEventListener('scroll', compute, { passive: true })
    window.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('scroll', compute)
      window.removeEventListener('resize', compute)
    }
  }, [cityIds, domIdPrefix])

  return activeCityId
}
