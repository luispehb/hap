import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { OnboardingLayout } from './OnboardingLayout'
import { Button } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { onboardingStore } from '../../lib/onboardingStore'
import { supabase } from '../../lib/supabase'

type Mode = 'visiting' | 'local'

const CITY_SUGGESTIONS = [
  'Ciudad de México', 'Lisboa', 'Bogotá', 'Barcelona',
  'Buenos Aires', 'Berlin', 'Tokyo', 'New York', 'London', 'Paris',
]

export function Step4Location() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [mode, setMode] = useState<Mode>('visiting')
  const [cityInput, setCityInput] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [arrival, setArrival] = useState('')
  const [departure, seeparture] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const filtered = cityInput.length > 0
    ? CITY_SUGGESTIONS.filter(c =>
        c.toLowerCase().includes(cityInput.toLowerCase())
      )
    : []

  function selectCity(city: string) {
    setSelectedCity(city)
    setCityInput(city)
    setShowDropdown(false)
  }

  const canContinue = selectedCity.length > 0

  async function handleEnter() {
    if (!user || !selectedCity) return
    setLoading(true)
    setErrorMsg('')
    const stored = onboardingStore.get()
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: stored.display_name || user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Traveler',
          origin_city: stored.origin_city || '',
          current_city: selectedCity,
          is_local: mode === 'local',
          trip_start_date: mode === 'local' ? null : (arrival || null),
          trip_end_date: mode === 'local' ? null : (departure || null),
          interests: stored.interests ?? [],
          bio_question: stored.bio_question ?? '',
          trust_score: 50,
          is_verified: false,
          membership_status: 'trial',
        }, { onConflict: 'user_id' })

      if (error) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      if (stored.bio_question) {
        supabase.from('admissions').insert({
          user_id: user.id,
          answer_1: stored.bio_question,
          status: 'pending',
        }).then(({ error: admErr }) => {
          if (admErr) console.error('Admissions insert error:', admErr)
        })
      }

      onboardingStore.clear()
      navigate('/feed', { replace: true })
      refreshProfile()

    } catch (err) {
      console.error('Unexpected error:', err)
      setErrorMsg('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <OnboardingLayout step={4}>
      <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-1">
        Step 4 of 4
      </p>
      <h1 className="text-[26px] font-extrabold text-ink tracking-tight leading-tight mb-1">
        Where are you now?
      </h1>
      <p className="text-muted text-sm mb-6">This activates your feed.</p>

      <div className="flex bg-sand rounded-xl p-1 mb-6">
        {(['visiting', 'local'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              mode === m ? 'bg-white text-ink shadow-sm' : 'text-muted'
            }`}
          >
            {m === 'visiting' ? "I'm visiting" : 'I live here'}
          </button>
        ))}
      </div>

      <div className="relative">
        <div className="relative">
          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={cityInput}
            onChange={e => { setCityInput(e.target.value); setSelectedCity(''); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Search city..."
            className="w-full bg-white border border-[#E8E4DC] rounded-xl pl-9 pr-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-sky transition"
          />
        </div>
        {showDropdown && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-[#E8E4DC] rounded-xl mt-1 overflow-hidden z-10 shadow-sm">
            {filtered.map(city => (
              <button
                key={city}
                onMouseDown={() => selectCity(city)}
                className="w-full text-left px-4 py-3 text-sm text-ink cursor-pointer hover:bg-sand transition"
              >
                {city}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === 'visiting' && (
        <div className="flex gap-3 mt-3">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted pl-1">Arrival</label>
            <input type="date" value={arrival} onChange={e => setArrival(e.target.value)} className="bg-white border border-[#E8E4DC] rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-sky transition" />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted pl-1">Departure</label>
            <input type="date" value={departure} onChange={e => setDeparture(e.target.value)} className="bg-white border border-[#E8E4DC] rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-sky transition" />
          </div>
        </div>
      )}

      {errorMsg && <p className="text-red-500 text-xs font-bold text-center mt-4">{errorMsg}</p>}

      <div className="mt-auto pt-8">
        <Button variant="cta" fullWidth disabled={!canContinue || loading} onClick={handleEnter}>
          {loading ? 'Saving…' : 'Enter Hap →'}
        </Button>
      </div>
    </OnboardingLayout>
  )
}
