/** Atmos 主站城市详情（与 HomePage `?city=` 一致；相对路径便于本地与线上同源） */
export function atmosCityDetailHref(cityId: string): string {
  return `/?city=${encodeURIComponent(cityId)}`
}
