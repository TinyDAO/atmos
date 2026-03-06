import { c2f } from '../../utils/temp'

interface TempDisplayProps {
  /** Temperature in Celsius */
  value: number
  /** Optional prefix, e.g. "气温 " or "当前 " */
  prefix?: string
  /** Optional suffix, e.g. " (航空气象)" */
  suffix?: string
  className?: string
}

/** Show °C by default, °F in tooltip on hover */
export function TempDisplay({ value, prefix = '', suffix = '', className }: TempDisplayProps) {
  const c = Math.round(value)
  const f = c2f(value)
  return (
    <span className={`relative group inline ${className ?? ''}`}>
      {prefix}{c}°C{suffix}
      <span
        className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded-md
          bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium
          opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none
          whitespace-nowrap z-[100] shadow-lg"
      >
        {f}°F
      </span>
    </span>
  )
}
