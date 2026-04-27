import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { OnboardingLayout } from './OnboardingLayout'
import { Button } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { onboardingStore } from '../../lib/onboardingStore'
import { supabase } from '../../lib/supabase'

export function Step1Identity() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [city, setCity] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fullName: string = user?.user_metadata?.full_name ?? ''
    if (fullName) {
      const parts = fullName.trim().split(' ')
      setFirstName(parts[0] ?? '')
      setLastName(parts.slice(1).join(' ') ?? '')
    }
  }, [user])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPhotoUrl(URL.createObjectURL(file))
    }
  }

  async function handleContinue() {
    if (!firstName.trim() || !lastName.trim()) return
    setUploading(true)

    const display_name = `${firstName.trim()} ${lastName.trim().charAt(0).toUpperCase()}.`

    let photo_url: string | undefined
    if (photoFile && user) {
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(`${user.id}/avatar.jpg`, photoFile, { upsert: true, contentType: photoFile.type })

      if (!error && data) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path)
        photo_url = urlData.publicUrl
      }
    }

    onboardingStore.set({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      display_name,
      home_city: city.trim(),
      ...(photo_url ? { photo_url } : {}),
    })

    setUploading(false)
    navigate('/onboarding/2')
  }

  const canContinue = firstName.trim().length > 0 && lastName.trim().length > 0

  return (
    <OnboardingLayout step={1}>
      <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-1">
        Step 1 of 4
      </p>
      <h1 className="text-[26px] font-extrabold text-ink tracking-tight leading-tight mb-1">
        What's your name?
      </h1>
      <p className="text-muted text-sm mb-8">
        First and last name. Stays private — only you see the full version.
      </p>

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
        <div className="flex gap-3">
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First name"
            className="flex-1 bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-sky transition"
          />
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Last name"
            className="flex-1 bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-sky transition"
          />
        </div>
        <input
          type="text"
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="Where are you from?"
          className="bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-sky transition"
        />
      </div>

      {firstName.trim() && lastName.trim() && (
        <p className="text-muted text-xs text-center mt-3">
          You'll appear as{' '}
          <span className="text-ink font-bold">
            {firstName.trim()} {lastName.trim().charAt(0).toUpperCase()}.
          </span>
        </p>
      )}

      <div className="mt-auto pt-8">
        <Button
          variant="primary"
          fullWidth
          disabled={!canContinue || uploading}
          onClick={handleContinue}
        >
          {uploading ? 'Saving…' : 'Continue →'}
        </Button>
      </div>
    </OnboardingLayout>
  )
}
