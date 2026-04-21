import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, MessageCircle } from 'lucide-react'
import { usePlanDetail } from '../hooks/usePlanDetail'
import { Avatar } from '../components/ui/Avatar'
import { TrustBadge } from '../components/ui/TrustBadge'
import { Button } from '../components/ui/Button'
import { formatPlanTime } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { getPlanPhoto } from '../lib/photos'
import { useAuth } from '../contexts/AuthContext'

const ACTIVITY_GRADIENTS: Record<string, string> = {
  food: 'linear-gradient(135deg, #F5D0A9, #E8A87C)',
  culture: 'linear-gradient(135deg, #B8D4E8, #7EB3D4)',
  outdoor: 'linear-gradient(135deg, #C8E0B8, #8DC87A)',
  cowork: 'linear-gradient(135deg, #D4B8E0, #A87EC8)',
  nightlife: 'linear-gradient(135deg, #1A1A2E, #3D3D6B)',
  other: 'linear-gradient(135deg, #EAE6DF, #C8C0B0)',
}

const ACTIVITY_EMOJIS: Record<string, string> = {
  food: '🍽️',
  culture: '🏛️',
  outdoor: '🏔️',
  cowork: '💻',
  nightlife: '🌙',
  other: '✦',
}

interface ToastProps { message: string; visible: boolean }
function Toast({ message, visible }: ToastProps) {
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-sm font-bold px-5 py-3 rounded-xl shadow-lg transition-all duration-300 pointer-events-none whitespace-nowrap ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {message}
    </div>
  )
}

export function PlanDetail() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { plan, participants, loading, error } = usePlanDetail(planId ?? '')

  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)
  const [toast, setToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  function showToast(msg: string) {
    setToastMsg(msg)
    setToast(true)
    setTimeout(() => setToast(false), 2500)
  }

  async function handleJoin() {
    if (joining || joined || !plan || !profile) return
    setJoining(true)

    await supabase.from('plan_participants').insert({
      plan_id: plan.id,
      user_id: profile.id,
      status: 'pending',
    })

    setJoining(false)
    setJoined(true)
    showToast('Request sent ✓ The creator will confirm you')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-3 px-8">
        <p className="text-ink font-bold">Plan not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    )
  }

  const gradient = ACTIVITY_GRADIENTS[plan.activity_type] ?? ACTIVITY_GRADIENTS.other
  const emoji = ACTIVITY_EMOJIS[plan.activity_type] ?? '✦'
  const confirmedCount = participants.length
  const spotsLeft = plan.max_participants - confirmedCount
  const openSpots = Math.max(0, spotsLeft)

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* Hero */}
      <div className="h-[220px] relative overflow-hidden flex-shrink-0">
        {/* Real photo */}
        <img
          src={getPlanPhoto(plan.activity_type, plan.title)}
          alt={plan.title}
          className="w-full h-full object-cover"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />

        {/* Fallback gradient behind img */}
        <div className="absolute inset-0 -z-10" style={{ background: gradient }} />

        {/* Strong gradient overlay for text legibility */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }}
        />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 cursor-pointer active:opacity-70 transition z-10"
        >
          <ChevronLeft size={18} className="text-white" />
        </button>

        {/* Hap Day badge */}
        {plan.is_hap_day && (
          <div className="absolute top-12 right-4 z-10">
            <span className="text-[9px] font-bold text-sky bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
              ✦ HAP DAY
            </span>
          </div>
        )}

        {/* Text overlay bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-1 mb-2">
            <span className="text-xs">{emoji}</span>
            <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">
              {plan.activity_type}
            </span>
          </div>
          <h1 className="text-white font-extrabold text-xl tracking-tight leading-tight">
            {plan.title}
          </h1>
          <p className="text-white/60 text-xs mt-1">{plan.city}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto pb-40 px-4 py-4 flex flex-col gap-4">

        {/* Info row */}
        <div className="bg-white border border-[#E8E4DC] rounded-2xl p-4">
          <div className="grid grid-cols-3 divide-x divide-[#E8E4DC]">
            {[
              { icon: '📅', value: formatPlanTime(plan.scheduled_at), label: 'When' },
              { icon: '📍', value: plan.location_name || plan.city, label: 'Where' },
              { icon: '👥', value: `${confirmedCount}/${plan.max_participants}`, label: 'Spots' },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center text-center px-2">
                <span className="text-ink font-bold text-sm leading-snug">{item.value}</span>
                <span className="text-muted text-[9px] font-bold uppercase tracking-wider mt-0.5">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Creator */}
        {plan.creator && (
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
              Proposed by
            </p>
            <div className="bg-white border border-[#E8E4DC] rounded-2xl p-3 flex items-center gap-3">
              <Avatar name={plan.creator.display_name} city={plan.creator.origin_city} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-ink truncate">
                    {plan.creator.display_name}
                  </span>
                  {plan.creator.is_verified && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-muted">{plan.creator.origin_city}</p>
              </div>
              <TrustBadge score={plan.creator.trust_score} />
            </div>
          </div>
        )}

        {/* Description */}
        {plan.description && (
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
              About this plan
            </p>
            <div className="bg-white border border-[#E8E4DC] rounded-2xl p-4">
              <p className="text-ink text-sm leading-relaxed">{plan.description}</p>
            </div>
          </div>
        )}

        {/* Participants */}
        <div>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
            Who's going
          </p>
          <div className="bg-white border border-[#E8E4DC] rounded-2xl p-4">
            <div className="flex items-center gap-2 flex-wrap">
              {participants.map(p => (
                p.profile && (
                  <Avatar
                    key={p.id}
                    name={p.profile.display_name}
                    city={p.profile.origin_city}
                    size="sm"
                  />
                )
              ))}
              {Array.from({ length: openSpots }).map((_, i) => (
                <div
                  key={`open-${i}`}
                  className="w-8 h-8 rounded-xl border-2 border-dashed border-[#E8E4DC] flex items-center justify-center"
                >
                  <div className="w-2 h-2 rounded-full bg-[#E8E4DC]" />
                </div>
              ))}
              {openSpots > 0 && (
                <span className="text-muted text-xs ml-1">
                  {openSpots} spot{openSpots !== 1 ? 's' : ''} left
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Hap Day badge */}
        {plan.is_hap_day && (
          <div className="bg-[#EBF4FF] border border-sky rounded-xl p-3 text-center">
            <p className="text-sky text-xs font-bold">
              ✦ Hap Day — plans expire in 6h · +5 Trust Score bonus
            </p>
          </div>
        )}
      </div>

      {/* Sticky bottom actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream border-t border-[#E8E4DC] px-4 py-4 flex flex-col gap-2">
        {joined ? (
          <Button variant="outline" size="lg" fullWidth disabled>
            Request sent ✓
          </Button>
        ) : (
          <Button
            variant="cta"
            size="lg"
            fullWidth
            onClick={handleJoin}
            disabled={joining || openSpots <= 0}
          >
            {openSpots <= 0 ? 'Plan is full' : joining ? 'Sending…' : 'Join this plan'}
          </Button>
        )}
        {(joined || confirmedCount > 0) && (
          <button
            onClick={() => navigate(`/chat/${planId}`)}
            className="w-full py-3 bg-white border border-[#E8E4DC] rounded-2xl text-ink font-bold text-sm flex items-center justify-center gap-2 active:bg-sand transition cursor-pointer"
          >
            <MessageCircle size={16} className="text-sky" />
            Open group chat
          </button>
        )}
      </div>

      <Toast message={toastMsg} visible={toast} />
    </div>
  )
}
