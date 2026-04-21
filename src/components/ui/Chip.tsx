interface ChipProps {
  label: string
  active?: boolean
  match?: boolean
  onClick?: () => void
}

export function Chip({ label, active = false, match = false, onClick }: ChipProps) {
  let classes = 'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-chip cursor-pointer transition-all '

  if (match) {
    classes += 'bg-[#EBF4FF] text-sky'
  } else if (active) {
    classes += 'bg-ink text-white'
  } else {
    classes += 'bg-sand text-muted'
  }

  return (
    <span className={classes} onClick={onClick}>
      {label}
    </span>
  )
}
