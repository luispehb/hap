import type { ReactNode } from 'react'

interface PhotoStripProps {
  height: 130 | 160 | 180
  bgColor: string
  initials: string
  children?: ReactNode
}

export function PhotoStrip({ height, bgColor, initials, children }: PhotoStripProps) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-t-card"
      style={{ height }}
    >
      {/* Placeholder background */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <svg width="100%" height="100%" viewBox="0 0 430 180" preserveAspectRatio="xMidYMid slice">
          {/* Subtle geometric pattern */}
          <defs>
            <pattern id={`grid-${initials}`} width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${initials})`} />
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dy=".35em"
            fontSize="48"
            fontWeight="800"
            fontFamily="Inter, system-ui, sans-serif"
            fill="rgba(255,255,255,0.18)"
          >
            {initials}
          </text>
        </svg>
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, transparent 55%)' }}
      />

      {/* Content overlay */}
      {children && (
        <div className="absolute inset-0">
          {children}
        </div>
      )}
    </div>
  )
}
