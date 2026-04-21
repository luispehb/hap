interface TrustBadgeProps {
  score: number
}

export function TrustBadge({ score }: TrustBadgeProps) {
  const isHigh = score >= 80
  const isLow = score < 40

  const classes = isLow
    ? 'bg-orange-50 text-orange-700'
    : 'bg-[#F0FFD0] text-[#3a6010]'

  return (
    <span className={`${classes} font-extrabold text-xs px-2 py-1 rounded-lg flex items-center gap-1`}>
      {isHigh && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
      )}
      {score}
    </span>
  )
}
