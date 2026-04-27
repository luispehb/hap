import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, X, Plus, MapPin } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const CITY_SUGGESTIONS = [
  'Ciudad de México', 'Barcelona', 'Lisboa', 'Bogotá', 'Buenos Aires',
  'Berlin', 'Tokyo', 'New York', 'London', 'Paris', 'Amsterdam', 'Rome',
  'Madrid', 'São Paulo', 'Singapore', 'Dubai', 'Bangkok', 'Bali',
]

const ALL_INTERESTS = [
  'architecture', 'gastronomy', 'nature', 'music', 'literature',
  'photography', 'philosophy', 'sport', 'art', 'technology', 'languages', 'cinema',
]

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', placeholder: '@username' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/you' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '+1 234 567 8900' },
  { key: 'telegram', label: 'Telegram', placeholder: '@username' },
  { key: 'website', label: 'Website', placeholder: 'yoursite.com' },
  { key: 'substack', label: 'Substack', placeholder: 'yourname' },
  { key: 'spotify', label: 'Spotify', placeholder: 'spotify user ID' },
]

interface Trip {
  id: string
  city: string
  arrival: string
  departure: string
}

function CityInput({
  value,
  onChange,
  placeholder = 'Search city…',
}: {
  value: string
  onChange: (city: string) => void
  placeholder?: string
}) {
  const [input, setInput] = useState(value)
  const [open, setOpen] = useState(false)
  const filtered = input.length > 0
    ? CITY_SUGGESTIONS.filter(c => c.toLowerCase().includes(input.toLowerCase()))
    : []

  function select(city: string) {
    setInput(city)
    onChange(city)
    setOpen(false)
  }

  return (
    <div className="relative">
      <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      <input
        type="text"
        value={input}
        onChange={e => { setInput(e.target.value); onChange(''); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full bg-white border border-[#E8E4DC] rounded-xl pl-9 pr-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-sky transition"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-[#E8E4DC] rounded-xl mt-1 overflow-hidden z-20 shadow-sm">
          {filtered.map(city => (
            <button
              key={city}
              onMouseDown={() => select(city)}
              className="w-full text-left px-4 py-3 text-sm text-ink cursor-pointer hover:bg-sand transition"
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
      {children}
    </p>
  )
}

function inputClass() {
  return 'w-full bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-sky transition'
}

export function EditProfile() {
  const navigate = useNavigate()
  const { profile, user, refreshProfile } = useAuth()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [originCity, setOriginCity] = useState(profile?.home_city ?? '')
  const [isLocal, setIsLocal] = useState(profile?.is_local ?? false)
  const [localCity, setLocalCity] = useState(profile?.is_local ? (profile?.current_city ?? '') : '')
  const [bioQuestion, setBioQuestion] = useState(profile?.bio_question ?? '')
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? [])
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(
    (profile as unknown as { social_links?: Record<string, string> })?.social_links ?? {}
  )

  const [trips, setTrips] = useState<Trip[]>(() => {
    if (!isLocal && profile?.current_city) {
      return [{
        id: crypto.randomUUID(),
        city: profile.current_city,
        arrival: profile.trip_start_date ?? '',
        departure: profile.trip_end_date ?? '',
      }]
    }
    return []
  })

  const [showAddTrip, setShowAddTrip] = useState(false)
  const [newTrip, setNewTrip] = useState({ city: '', arrival: '', departure: '' })

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const addTrip = () => {
    if (!newTrip.city) return
    setTrips(prev => [...prev, { id: crypto.randomUUID(), ...newTrip }])
    setNewTrip({ city: '', arrival: '', departure: '' })
    setShowAddTrip(false)
  }

  const removeTrip = (id: string) => setTrips(prev => prev.filter(t => t.id !== id))

  const toggleInterest = (i: string) =>
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])

  const updateSocial = (key: string, val: string) =>
    setSocialLinks(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    if (!user || !profile) return
    setSaving(true)
    setErrorMsg('')

    const firstTrip = trips[0] ?? null
    const updates: Record<string, unknown> = {
      display_name: displayName.trim() || profile.display_name,
      home_city: originCity,
      is_local: isLocal,
      current_city: isLocal ? localCity : (firstTrip?.city ?? profile.current_city),
      trip_start_date: isLocal ? null : (firstTrip?.arrival || null),
      trip_end_date: isLocal ? null : (firstTrip?.departure || null),
      bio_question: bioQuestion,
      interests,
      social_links: socialLinks,
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', profile.user_id)

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    await refreshProfile()
    navigate('/profile', { replace: true })
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4 bg-cream border-b border-[#E8E4DC]">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#E8E4DC] active:bg-sand transition cursor-pointer"
        >
          <ChevronLeft size={18} className="text-ink" />
        </button>
        <p className="text-sm font-extrabold text-ink tracking-tight">Edit Profile</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-ink text-white text-xs font-bold px-4 py-2 rounded-xl active:opacity-80 transition cursor-pointer disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-16">
        <div className="px-4 pt-6 flex flex-col gap-6">

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-xs font-bold">{errorMsg}</p>
            </div>
          )}

          {/* Basic info */}
          <div>
            <SectionLabel>Basic info</SectionLabel>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display name"
                className={inputClass()}
              />
              <CityInput value={originCity} onChange={setOriginCity} placeholder="Origin city" />
            </div>
          </div>

          {/* Where you live */}
          <div>
            <SectionLabel>Where you are now</SectionLabel>
            <div className="flex bg-sand rounded-xl p-1 mb-3">
              {([false, true] as const).map(local => (
                <button
                  key={String(local)}
                  onClick={() => setIsLocal(local)}
                  className={`flex-1 py-2 rounded-[10px] text-xs font-bold transition cursor-pointer ${
                    isLocal === local ? 'bg-white text-ink shadow-sm' : 'text-muted'
                  }`}
                >
                  {local ? 'I live here' : "I'm traveling"}
                </button>
              ))}
            </div>
            {isLocal && (
              <CityInput value={localCity} onChange={setLocalCity} placeholder="Your city" />
            )}
          </div>

          {/* Trips — only when traveling */}
          {!isLocal && (
            <div>
              <SectionLabel>Upcoming trips</SectionLabel>
              <div className="flex flex-col gap-2">
                {trips.map((trip, idx) => (
                  <div
                    key={trip.id}
                    className="bg-white border border-[#E8E4DC] rounded-2xl p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          {idx === 0 && (
                            <span className="text-[9px] font-bold text-sky bg-[#EBF4FF] px-1.5 py-0.5 rounded-full">CURRENT</span>
                          )}
                          <p className="text-ink font-bold text-sm">{trip.city}</p>
                        </div>
                        {(trip.arrival || trip.departure) && (
                          <p className="text-muted text-[10px]">
                            {trip.arrival && `Arrival ${trip.arrival}`}
                            {trip.arrival && trip.departure && ' · '}
                            {trip.departure && `Departure ${trip.departure}`}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeTrip(trip.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-sand transition cursor-pointer ml-2"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {showAddTrip ? (
                  <div className="bg-white border border-[#E8E4DC] rounded-2xl p-4 flex flex-col gap-2">
                    <CityInput value={newTrip.city} onChange={city => setNewTrip(p => ({ ...p, city }))} />
                    <div className="flex gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted pl-1">Arrival</p>
                        <input
                          type="date"
                          value={newTrip.arrival}
                          onChange={e => setNewTrip(p => ({ ...p, arrival: e.target.value }))}
                          className="bg-white border border-[#E8E4DC] rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-sky transition"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted pl-1">Departure</p>
                        <input
                          type="date"
                          value={newTrip.departure}
                          onChange={e => setNewTrip(p => ({ ...p, departure: e.target.value }))}
                          className="bg-white border border-[#E8E4DC] rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-sky transition"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => { setShowAddTrip(false); setNewTrip({ city: '', arrival: '', departure: '' }) }}
                        className="flex-1 py-2 rounded-xl text-xs font-bold border border-[#E8E4DC] text-muted bg-white active:bg-sand transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addTrip}
                        disabled={!newTrip.city}
                        className="flex-[2] py-2 rounded-xl text-xs font-bold bg-ink text-white active:opacity-80 transition cursor-pointer disabled:opacity-40"
                      >
                        Add trip
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddTrip(true)}
                    className="flex items-center gap-2 text-xs font-bold text-sky py-2 cursor-pointer active:opacity-70 transition"
                  >
                    <Plus size={14} />
                    Add trip
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Your answer */}
          <div>
            <SectionLabel>Your answer</SectionLabel>
            <div className="relative">
              <textarea
                value={bioQuestion}
                onChange={e => setBioQuestion(e.target.value.slice(0, 280))}
                placeholder="What brings you here? What are you looking for?"
                rows={4}
                className="w-full bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-sky transition resize-none"
              />
              <p className={`text-right text-[10px] mt-1 font-bold ${bioQuestion.length >= 260 ? 'text-sky' : 'text-muted'}`}>
                {bioQuestion.length}/280
              </p>
            </div>
          </div>

          {/* Interests */}
          <div>
            <SectionLabel>Interests</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map(i => {
                const active = interests.includes(i)
                return (
                  <button
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition cursor-pointer ${
                      active ? 'bg-ink text-white' : 'bg-sand text-muted'
                    }`}
                  >
                    {i}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Social links */}
          <div>
            <SectionLabel>Social links</SectionLabel>
            <p className="text-[10px] text-muted mb-3">Only revealed to mutual connections</p>
            <div className="flex flex-col gap-2">
              {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
                <div key={key} className="flex items-center gap-3">
                  <p className="text-xs font-bold text-muted w-20 flex-shrink-0">{label}</p>
                  <input
                    type="text"
                    value={socialLinks[key] ?? ''}
                    onChange={e => updateSocial(key, e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-white border border-[#E8E4DC] rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-sky transition"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
