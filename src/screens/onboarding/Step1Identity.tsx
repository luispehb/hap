import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { OnboardingLayout } from './OnboardingLayout'
import { Button } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { onboardingStore } from '../../lib/onboardingStore'

export function Step1Identity() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pre-fill name from Google if available
  useEffect(() => {
    const fullName: string = user?.user_metadata?.full_name ?? ''
    if (fullName) setName(fullName.split(' ')[0])
  }, [user])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPhotoUrl(URL.createObjectURL(file))
  }

  function handleContinue() {
    onboardingStore.set({ display_name: name.trim(), origin_city: city.trim() })
    navigate('/onboarding/2')
  }

  return (
    <OnboardingLayout step={1}>
      <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-1">
        Step 1 of 4
      </p>
      <h1 className="text-[26px] font-extrabold text-ink tracking-tight leading-tight mb-1">
        What's your name?
      </h1>
      <p className="text-muted text-sm mb-8">Just your first name. No pressure.</p>

      {/* Photo upload */}
      <div className="mx-auto mb-6" onClick={() => fileInputRef.current?.click()}>
        {photoUrl ? (
          <div className="relative w-24 h-24 rounded-[20px] overflow-hidden cursor-pointer group">
            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <Camera size={20} className="text-white" />
            </div>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-[20px] bg-sand border-2 border-dashed border-[#E8E4DC] flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-sand/80 transition">
            <Camera size={20} className="text-muted" />
            <span className="text-[10px] text-muted font-medium">Add photo</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      {/* Input fields */}
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-sky transition"
        />
        <input
          type="text"
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="Where are you from?"
          className="bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-sky transition"
        />
      </div>

      <div className="mt-auto pt-8">
        <Button
          variant="primary"
          fullWidth
          disabled={name.trim().length === 0}
          onClick={handleContinue}
        >
          Continue →
        </Button>
      </div>
    </OnboardingLayout>
  )
}
