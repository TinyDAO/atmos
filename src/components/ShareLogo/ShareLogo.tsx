import { useId } from 'react'

/**
 * Inline SVG logo for share cards. html2canvas does not reliably capture
 * external SVG images (especially with gradients), so we use inline SVG.
 */
export function ShareLogo({ className }: { className?: string }) {
  const id = 'logo-' + useId().replace(/:/g, '')
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      width={24}
      height={24}
    >
      <defs>
        <linearGradient id={id} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="#18181b" />
      <path d="M16 6v11" stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="20" r="3.5" fill={`url(#${id})`} />
    </svg>
  )
}
