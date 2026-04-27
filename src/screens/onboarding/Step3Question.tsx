import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OnboardingLayout } from './OnboardingLayout'
import { Button } from '../../components/ui'
import { onboardingStore } from '../../lib/onboardingStore'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const MAX = 280
const MIN_TO_CONTINUE = 50

const TRAVEL_STYLES = [
  'Mochilero',
  'Boutique',
  'Nómada digital',
  'Business traveler',
  'Explorer local',
]

const TRAVEL_FREQS = [
  'Viajo algunas veces al año',
  'Viajo cada mes',
  'Vivo viajando',
]

export function Step3Question() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [travelStyle, setTravelStyle] = useState('')
  const [travelFreq, setTravelFreq] = useState('')
  const [mindsetAnswer, setMindsetAnswer] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')

  const hasInvite = !!sessionStorage.getItem('hapInviteCode')
  const count = mindsetAnswer.length
  const counterClass = count > 200 ? 'text-sky' : 'text-muted'
  const canContinue = count >= MIN_TO_CONTINUE

  function handleContinue() {
    const trustScore = hasInvite ? 65 : (linkedinUrl.trim() ? 48 : 40)

    onboardingStore.set({
      bio_question: mindsetAnswer,
      mindset_answer: mindsetAnswer,
      travel_style: travelStyle,
      travel_frequency: travelFreq,
      linkedin_url: linkedinUrl.trim(),
      trust_score: trustScore,
    })

    navigate('/onboarding/4')
  }

  return (
    <OnboardingLayout step={3}>
      <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-1">
        Paso 3 de 4
      </p>
      <h1 className="text-[26px] font-extrabold text-ink tracking-tight leading-tight mb-5">
        Cuéntanos más.
      </h1>

      {/* Travel style */}
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
          Tu estilo de viaje
        </p>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_STYLES.map(style => (
            <button
              key={style}
              onClick={() => setTravelStyle(style)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                travelStyle === style ? 'bg-ink text-white' : 'bg-sand text-muted'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Travel frequency */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
          ¿Con qué frecuencia viajas?
        </p>
        <div className="flex flex-col gap-2">
          {TRAVEL_FREQS.map(freq => (
            <button
              key={freq}
              onClick={() => setTravelFreq(freq)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                travelFreq === freq ? 'bg-ink text-white' : 'bg-sand text-muted'
              }`}
            >
              {freq}
            </button>
          ))}
        </div>
      </div>

      {/* Mindset question */}
      <div className="bg-white border border-[#E8E4DC] rounded-2xl p-5 mb-5 flex flex-col">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
          Una pregunta antes de continuar
        </p>
        <p className="italic text-ink font-bold text-base leading-relaxed">
          "¿Cuándo fue la última vez que algo — un libro, un viaje, una conversación — te cambió genuinamente la forma de ver algo?"
        </p>

        <div className="h-px bg-sand my-4" />

        <textarea
          value={mindsetAnswer}
          onChange={e => setMindsetAnswer(e.target.value)}
          maxLength={MAX}
          rows={5}
          placeholder="Tómate tu tiempo. No hay respuesta correcta."
          className="resize-none bg-transparent border-none outline-none text-sm text-ink placeholder:text-muted leading-relaxed w-full"
        />

        <p className={`text-[10px] text-right mt-1 ${counterClass}`}>
          {count} / {MAX}
        </p>
      </div>

      {/* LinkedIn — solo si no tiene invite */}
      {!hasInvite && (
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
            Tu LinkedIn (opcional — nos ayuda a conocerte mejor)
          </p>
          <input
            type="text"
            value={linkedinUrl}
            onChange={e => setLinkedinUrl(e.target.value)}
            placeholder="linkedin.com/in/tu-perfil"
            className="w-full bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-sky transition"
          />
        </div>
      )}

      <div className="mt-auto pt-6">
        <Button
          variant="primary"
          fullWidth
          disabled={!canContinue}
          onClick={handleContinue}
        >
          Continuar →
        </Button>
      </div>
    </OnboardingLayout>
  )
}
