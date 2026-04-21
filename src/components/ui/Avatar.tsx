interface AvatarProps {
  name: string
  city: string
  size?: 'sm' | 'md' | 'lg'
}

const CITY_COLORS: Record<string, { bg: string; text: string }> = {
  AE: { bg: '#B8D4E8', text: '#2E5A78' },
  FJ: { bg: '#C8E0B8', text: '#3A6028' },
  KO: { bg: '#F0D4B8', text: '#7A5428' },
  PT: { bg: '#D4B8E0', text: '#5A3870' },
  UZ: { bg: '#B8E0D4', text: '#2A5848' },
}

function getColorForCity(city: string): { bg: string; text: string } {
  const first = city.trim().toUpperCase().charCodeAt(0)
  if (first >= 65 && first <= 69) return CITY_COLORS.AE
  if (first >= 70 && first <= 74) return CITY_COLORS.FJ
  if (first >= 75 && first <= 79) return CITY_COLORS.KO
  if (first >= 80 && first <= 84) return CITY_COLORS.PT
  return CITY_COLORS.UZ
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const SIZE_MAP = {
  sm: { px: 32, radius: 8, font: 11 },
  md: { px: 44, radius: 11, font: 14 },
  lg: { px: 56, radius: 14, font: 18 },
}

export function Avatar({ name, city, size = 'md' }: AvatarProps) {
  const { bg, text } = getColorForCity(city)
  const { px, radius, font } = SIZE_MAP[size]
  const initials = getInitials(name)

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      style={{ borderRadius: radius, display: 'block', flexShrink: 0 }}
    >
      <rect width={px} height={px} rx={radius} fill={bg} />
      <text
        x={px / 2}
        y={px / 2 + font * 0.37}
        textAnchor="middle"
        fontSize={font}
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={text}
      >
        {initials}
      </text>
    </svg>
  )
}
