import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OnboardingLayout } from './OnboardingLayout'
import { Button } from '../../components/ui'
import { onboardingStore } from '../../lib/onboardingStore'

const MAX = 280
const MIN_TO_CONTINUE = 50

export function Step3Question() {
  const navigate = useNavigate()
  const [answer, setAnswer] = useState('')

  const count = answer.length
  const counterClass = count > 200 ? 'text-sky' : 'text-muted'

  return (
    <OnboardingLayout step={3}>
      <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-1">
        Step 3 of 4
      </p>
      <h1 className="text-[26px] font-extrabold text-ink tracking-tight leading-tight mb-1">
        One question.
      </h1>
      <p className="text-muted text-sm">No right answer. Just yours.</p>

      {/* Question card */}
      <div className="bg-white border border-[#E8E4DC] rounded-2xl p-5 my-6 flex flex-col">
        <p className="italic text-ink font-bold text-base leading-relaxed">
          "When was the last time something — a book, a trip, a conversation — genuinely changed the way you see something?"
        </p>

        <div className="h-px bg-sand my-4" />

        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          maxLength={MAX}
          rows={5}
          placeholder="Take your time..."
          className="resize-none bg-transparent border-none outline-none text-sm text-ink placeholder:text-muted leading-relaxed w-full"
        />

        <p className={`text-[10px] text-right mt-1 ${counterClass}`}>
          {count} / {MAX}
        </p>
      </div>

      <p className="text-[10px] text-muted text-center leading-relaxed">
        This appears at the top of your profile.
        <br />
        It's the most important thing here.
      </p>

      <div className="mt-auto pt-6">
        <Button
          variant="primary"
          fullWidth
          disabled={count < MIN_TO_CONTINUE}
          onClick={() => {
            onboardingStore.set({ bio_question: answer })
            navigate('/onboarding/4')
          }}
        >
          Continue →
        </Button>
      </div>
    </OnboardingLayout>
  )
}
