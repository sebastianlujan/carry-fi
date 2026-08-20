// Iconos inline del design system (stroke ink, 24px grid)
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const IconWallet = ({ w = 20 }: { w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" {...S}>
    <rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M16 14.5h1.5" />
  </svg>
)
export const IconChart = ({ w = 20 }: { w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" {...S}><path d="M4 17l5-5 4 3 7-8" /><path d="M16 7h4v4" /></svg>
)
export const IconDots = ({ w = 20 }: { w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <circle cx="6" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="18" cy="12" r="1.7" />
  </svg>
)
export const IconShield = ({ w = 22 }: { w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" {...S}>
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M12 8.5v3.5M12 15h.01" />
  </svg>
)
export const IconKey = ({ w = 22 }: { w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" {...S}>
    <circle cx="8.5" cy="8.5" r="4" /><path d="M11.5 11.5L20 20M16 16l2.5-2.5M18.5 18.5l2-2" />
  </svg>
)
export const IconCode = ({ w = 22 }: { w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" {...S}><path d="M9 7l-5 5 5 5M15 7l5 5-5 5" /></svg>
)
export const IconCopy = ({ w = 16 }: { w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" {...S}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6a2 2 0 012-2h9" />
  </svg>
)
export const IconLogout = ({ w = 18 }: { w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" {...S}><path d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3M15 8l4 4-4 4M19 12H9" /></svg>
)
export const Chevron = ({ w = 18 }: { w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" {...S}><path d="M9 6l6 6-6 6" /></svg>
)
export const IconTrend = ({ w = 14 }: { w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" {...S}><path d="M4 16l5-5 4 3 7-8" /></svg>
)
