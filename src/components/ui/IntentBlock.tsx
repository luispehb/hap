interface IntentBlockProps {
  emoji: string
  text: string
  time: string
}

export function IntentBlock({ emoji, text, time }: IntentBlockProps) {
  return (
    <div className="bg-[#111111] rounded-xl p-2.5 flex gap-2 items-center">
      <span className="text-sm flex-shrink-0">{emoji}</span>
      <div className="min-w-0">
        <p className="text-sky text-xs font-bold leading-snug truncate">{text}</p>
        <p className="text-[#555555] text-[10px] mt-0.5">{time}</p>
      </div>
    </div>
  )
}
