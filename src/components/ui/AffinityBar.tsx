interface AffinityBarProps {
  percentage: number
}

export function AffinityBar({ percentage }: AffinityBarProps) {
  const clamped = Math.min(100, Math.max(0, percentage))

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted flex-shrink-0">
        Affinity
      </span>
      <div className="flex-1 h-1 bg-sand rounded-full overflow-hidden">
        <div
          className="h-full bg-sky rounded-full transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-sky text-xs font-extrabold flex-shrink-0">{clamped}%</span>
    </div>
  )
}
