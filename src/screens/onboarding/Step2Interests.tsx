import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OnboardingLayout } from './OnboardingLayout'
import { Button } from '../../components/ui'
import { onboardingStore } from '../../lib/onboardingStore'

const INTERESTS = [
  { key: 'architecture', emoji: '🏛️', label: 'Architecture' },
  { key: 'gastronomy', emoji: '🍽️', label: 'Gastronomy' },
  { key: 'nature', emoji: '🏔️', label: 'Nature' },
  { key: 'music', emoji: '🎵', label: 'Music' },
  { key: 'literature', emoji: '📚', label: 'Literature' },
  { key: 'photography', emoji: '📸', label: 'Photography' },
  { key: 'philosophy', emoji: '💡', label: 'Philosophy' },
  { key: 'sport', emoji: '🏃', label: 'Sport' },
  { key: 'art', emoji: '🎨', label: 'Art' },
  { key: 'technology', emoji: '💻', label: 'Technology' },
  { key: 'languages', emoji: '🗣️', label: 'Languages' },
  { key: 'cinema', emoji: '🎬', label: 'Cinema' },
]

export function Step2Interests() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>([])

  function toggle(key: string) {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const count = selected.length
  const isReady = count >= 3

  return (
    <OnboardingLayout step={2}>
      <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-1">
        Step 2 of 4
      </p>
      <h1 className="text-[26px] font-extrabold text-ink tracking-tight leading-tight mb-1">
        What moves you?
      </h1>
      <p className="text-muted text-sm mb-6">Pick 3 to 6. This shapes who you meet.</p>

      {/* Interest grid */}
      <div className="grid grid-cols-3 gap-3">
        {INTERESTS.map(({ key, emoji, label }) => {
          const isSelected = selected.includes(key)
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`rounded-2xl p-3 flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                isSelected ? 'bg-ink text-white' : 'bg-sand text-muted'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide leading-tight">
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Counter */}
      <p className={`text-xs text-center mt-4 ${isReady ? 'text-sky' : 'text-muted'}`}>
        {isReady ? `${count} selected · looking good` : 'Select at least 3'}
      </p>

      <div className="mt-auto pt-6">
        <Button
          variant="primary"
          fullWidth
          disabled={!isReady}
          onClick={() => {
            onboardingStore.set({ interests: selected })
            navigate('/onboarding/3')
          }}
        >
          Continue →
        </Button>
      </div>
    </OnboardingLayout>
  )
}
