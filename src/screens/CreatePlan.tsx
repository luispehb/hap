import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const ACTIVITIES = [
  { key: 'food', emoji: '🍽️', label: 'Food' },
  { key: 'culture', emoji: '🏛️', label: 'Culture' },
  { key: 'outdoor', emoji: '🏔️', label: 'Outdoor' },
  { key: 'cowork', emoji: '💻', label: 'Cowork' },
  { key: 'nightlife', emoji: '🌙', label: 'Nightlife' },
  { key: 'other', emoji: '✦', label: 'Other' },
]

const TIME_CHIPS = ['This morning', 'This afternoon', 'This evening', 'Tomorrow']

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getChipDatetime(chip: string): string {
  const now = new Date()
  const d = new Date(now)
  if (chip === 'This morning') { d.setHours(9, 0, 0, 0) }
  else if (chip === 'This afternoon') { d.setHours(15, 0, 0, 0) }
  else if (chip === 'This evening') { d.setHours(20, 0, 0, 0) }
  else { d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0) }
  return toDatetimeLocal(d)
}

function defaultDatetime(): string {
  const d = new Date()
  d.setHours(15, 0, 0, 0)
  return toDatetimeLocal(d)
}

interface ToastProps { message: string; visible: boolean }
function Toast({ message, visible }: ToastProps) {
  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-sm font-bold px-5 py-3 rounded-xl shadow-lg transition-all duration-300 pointer-events-none whitespace-nowrap ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {message}
    </div>
  )
}

export function CreatePlan() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [activityType, setActivityType] = useState('')
  const [title, setTitle] = useState('')
  const [locationName, setLocationName] = useState('')
  const [selectedChip, setSelectedChip] = useState('')
  const [datetime, setDatetime] = useState(defaultDatetime())
  const [maxParticipants, setMaxParticipants] = useState(4)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [toast, setToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const canSubmit = Boolean(activityType && title.trim() && datetime)

  function selectChip(chip: string) {
    setSelectedChip(chip)
    setDatetime(getChipDatetime(chip))
  }

  function showToast(msg: string) {
    setToastMsg(msg)
    setToast(true)
    setTimeout(() => setToast(false), 2500)
  }

  async function handleSubmit() {
    if (!activityType || !title.trim() || !datetime) return

    setLoading(true)
    setErrorMsg('')

    const scheduledAt = new Date(datetime).toISOString()

    const { error } = await supabase
      .from('plans')
      .insert({
        title: title.trim(),
        activity_type: activityType,
        city: profile?.current_city ?? '',
        creator_id: profile?.id ?? null,
        location_name: locationName.trim() || null,
        scheduled_at: scheduledAt,
        max_participants: maxParticipants,
        description: description.trim() || null,
        status: 'open',
        is_hap_day: new Date(scheduledAt).getDay() === 4,
      })
      .select()
      .single()

    setLoading(false)

    if (error) {
      console.error('Insert error:', error)
      setErrorMsg('Could not publish plan: ' + error.message)
      return
    }

    showToast('Plan published ✓ Good things happen.')
    navigate('/feed', { state: { tab: 'plans' } })
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl bg-white border border-[#E8E4DC] flex items-center justify-center cursor-pointer active:bg-sand transition"
          >
            <ChevronLeft size={16} className="text-ink" />
          </button>
        </div>
        <h1 className="text-[26px] font-extrabold text-ink tracking-tight leading-tight">
          New{' '}
          <span className="bg-ink text-white px-2 py-0.5 rounded-lg inline">
            plan.
          </span>
        </h1>
        <p className="text-muted text-sm mt-1">
          {profile?.current_city ?? ''} — what do you want to do?
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 mt-4 flex flex-col gap-5">

        {/* Activity type */}
        <div>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2.5">
            Type
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITIES.map(a => (
              <button
                key={a.key}
                onClick={() => setActivityType(a.key)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition cursor-pointer ${
                  activityType === a.key
                    ? 'bg-ink border-ink text-white'
                    : 'bg-sand border-transparent text-muted'
                }`}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-[10px] font-bold uppercase">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2.5">
            What's the plan?
          </p>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Mercado de Coyoacán morning walk"
            maxLength={80}
            className="w-full bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-sky focus:outline-none transition"
          />
        </div>

        {/* Location */}
        <div>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2.5">
            Where?
          </p>
          <input
            type="text"
            value={locationName}
            onChange={e => setLocationName(e.target.value)}
            placeholder="Neighborhood or specific place"
            maxLength={100}
            className="w-full bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-sky focus:outline-none transition"
          />
        </div>

        {/* When */}
        <div>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2.5">
            When?
          </p>
          <div className="flex gap-2 flex-wrap mb-3">
            {TIME_CHIPS.map(chip => (
              <Chip
                key={chip}
                label={chip}
                active={selectedChip === chip}
                onClick={() => selectChip(chip)}
              />
            ))}
          </div>
          <input
            type="datetime-local"
            value={datetime}
            onChange={e => { setDatetime(e.target.value); setSelectedChip('') }}
            className="w-full bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 text-sm text-ink focus:border-sky focus:outline-none transition"
          />
        </div>

        {/* Group size */}
        <div>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2.5">
            How many people? <span className="font-normal normal-case tracking-normal">(including you)</span>
          </p>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6, 7, 8].map(n => (
              <button
                key={n}
                onClick={() => setMaxParticipants(n)}
                className={`w-10 h-10 rounded-xl font-bold text-sm transition cursor-pointer ${
                  maxParticipants === n
                    ? 'bg-ink text-white'
                    : 'bg-sand text-muted'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2.5">
            Description <span className="font-normal normal-case tracking-normal text-muted/70">(optional)</span>
          </p>
          <div className="relative">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's the vibe? Any details?"
              rows={3}
              maxLength={200}
              className="w-full bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-sky focus:outline-none transition resize-none"
            />
            <p className="text-[10px] text-muted text-right mt-1">
              {description.length}/200
            </p>
          </div>
        </div>
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream border-t border-[#EAE6DF] px-4 pt-3 pb-8">
        {errorMsg && (
          <p className="text-red-500 text-xs font-bold text-center mb-2">{errorMsg}</p>
        )}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
        >
          {loading ? 'Publishing…' : 'Publish plan →'}
        </Button>
      </div>

      <Toast message={toastMsg} visible={toast} />
    </div>
  )
}
