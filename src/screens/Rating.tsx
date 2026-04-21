import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, X } from 'lucide-react'
import { usePlanDetail } from '../hooks/usePlanDetail'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Profile } from '../hooks/useProfiles'

const TAGS = ['Great conversation', 'Punctual', 'Open minded', 'Fun', 'Inspiring', 'Good vibes']

const SOCIAL_EMOJIS: Record<string, string> = {
  instagram: '📸',
  linkedin: '💼',
  whatsapp: '💬',
  telegram: '✈️',
  website: '🌐',
  substack: '📝',
  spotify: '🎵',
}

interface RatingState {
  stars: number
  tags: string[]
  connectChoice: 'yes' | 'no' | null
}

interface ConnectionRevealProps {
  profile: Profile
  onContinue: () => void
}

function ConnectionReveal({ profile, onContinue }: ConnectionRevealProps) {
  const socialLinks = (profile as unknown as { social_links?: Record<string, string> }).social_links ?? {}
  const activeSocials = Object.entries(socialLinks).filter(([, v]) => v)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-cream rounded-3xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-3">
          <p className="text-3xl">✨</p>
          <p className="text-ink font-extrabold text-xl text-center tracking-tight">
            You both said yes
          </p>
          <p className="text-muted text-sm text-center">Good things happen.</p>
        </div>

        <div className="mx-4 mb-4 bg-white border border-[#E8E4DC] rounded-2xl p-4 flex items-center gap-3">
          <Avatar name={profile.display_name} city={profile.origin_city} size="md" />
          <div>
            <p className="text-ink font-bold text-sm">{profile.display_name}</p>
            <p className="text-muted text-xs">{profile.origin_city}</p>
          </div>
        </div>

        {activeSocials.length > 0 && (
          <div className="mx-4 mb-4">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 px-1">
              Connect with them
            </p>
            <div className="flex flex-wrap gap-2">
              {activeSocials.map(([platform, handle]) => (
                <a
                  key={platform}
                  href={`https://${platform}.com/${handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-sand rounded-xl px-3 py-2 flex items-center gap-1.5 cursor-pointer active:opacity-70 transition"
                >
                  <span>{SOCIAL_EMOJIS[platform] ?? '🔗'}</span>
                  <span className="text-xs font-bold text-ink capitalize">{platform}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 pb-8">
          <Button variant="primary" size="lg" fullWidth onClick={onContinue}>
            Continue exploring
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ParticipantCardProps {
  profile: Profile
  rating: RatingState
  onChange: (update: Partial<RatingState>) => void
}

function ParticipantCard({ profile, rating, onChange }: ParticipantCardProps) {
  function toggleTag(tag: string) {
    const next = rating.tags.includes(tag)
      ? rating.tags.filter(t => t !== tag)
      : [...rating.tags, tag]
    onChange({ tags: next })
  }

  return (
    <div className="bg-white border border-[#E8E4DC] rounded-2xl p-4 mb-3">
      {/* Profile row */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={profile.display_name} city={profile.origin_city} size="md" />
        <div>
          <p className="text-ink font-bold text-sm">{profile.display_name}</p>
          <p className="text-muted text-xs">{profile.origin_city}</p>
        </div>
      </div>

      {/* Stars */}
      <div className="flex gap-2 justify-center mb-3">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange({ stars: n })}
            className="text-2xl cursor-pointer transition active:scale-110"
          >
            {n <= rating.stars ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      {/* Tags */}
      {rating.stars > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full cursor-pointer transition ${
                rating.tags.includes(tag)
                  ? 'bg-ink text-white'
                  : 'bg-sand text-muted'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Double opt-in */}
      {rating.stars >= 4 && (
        <div className="mt-4 pt-4 border-t border-[#E8E4DC]">
          <p className="text-ink font-bold text-sm mb-1">Connect outside Hap?</p>
          <p className="text-muted text-[10px] mb-3">Only shown if they say yes too</p>
          <div className="flex gap-2">
            <button
              onClick={() => onChange({ connectChoice: 'yes' })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                rating.connectChoice === 'yes'
                  ? 'bg-sky text-white'
                  : 'bg-[#EBF4FF] text-sky'
              }`}
            >
              Yes, connect
            </button>
            <button
              onClick={() => onChange({ connectChoice: 'no' })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                rating.connectChoice === 'no'
                  ? 'bg-ink text-white'
                  : 'bg-sand text-muted'
              }`}
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Rating() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const { plan, participants } = usePlanDetail(planId ?? '')
  const { profile: raterProfile } = useAuth()

  const [ratings, setRatings] = useState<Record<string, RatingState>>({})
  const [submitting, setSubmitting] = useState(false)
  const [revealProfile, setRevealProfile] = useState<Profile | null>(null)

  function updateRating(profileId: string, update: Partial<RatingState>) {
    setRatings(prev => {
      const existing = prev[profileId] ?? { stars: 0, tags: [], connectChoice: null }
      return { ...prev, [profileId]: { ...existing, ...update } }
    })
  }

  const profiles = participants
    .map(p => p.profile)
    .filter((p): p is Profile => p !== null)
    .filter(p => p.id !== raterProfile?.id)

  const hasAnyRating = profiles.some(p => (ratings[p.id]?.stars ?? 0) > 0)

  async function handleSubmit() {
    if (!hasAnyRating || submitting) return
    setSubmitting(true)

    for (const profile of profiles) {
      const r = ratings[profile.id]
      if (!r || r.stars === 0) continue
      await supabase.from('ratings').insert({
        plan_id: planId,
        rater_id: raterProfile?.id ?? null,
        rated_id: profile.id,
        score: r.stars,
        tags: r.tags,
        wants_connection: r.connectChoice === 'yes',
      })
    }

    setSubmitting(false)

    // Simulate double opt-in match for demo: show reveal if any "yes"
    const yesProfile = profiles.find(p => ratings[p.id]?.connectChoice === 'yes')
    if (yesProfile) {
      setRevealProfile(yesProfile)
    } else {
      navigate('/feed', { state: { toast: 'Thanks for rating ✓ Your Trust Score has been updated' } })
    }
  }

  if (revealProfile) {
    return (
      <ConnectionReveal
        profile={revealProfile}
        onContinue={() => navigate('/feed')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl bg-white border border-[#E8E4DC] flex items-center justify-center cursor-pointer active:bg-sand transition"
          >
            <ChevronLeft size={16} className="text-ink" />
          </button>
          <button
            onClick={() => navigate('/feed')}
            className="w-8 h-8 rounded-xl bg-white border border-[#E8E4DC] flex items-center justify-center cursor-pointer active:bg-sand transition"
          >
            <X size={16} className="text-muted" />
          </button>
        </div>
        <h1 className="text-xl font-extrabold text-ink tracking-tight">
          Rate your experience
        </h1>
        {plan && (
          <p className="text-muted text-sm mt-0.5">{plan.title}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {profiles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">👥</p>
            <p className="text-ink font-bold text-sm">No participants to rate yet</p>
            <p className="text-muted text-xs mt-1">Ratings appear after the plan is confirmed</p>
          </div>
        ) : (
          profiles.map(profile => (
            <ParticipantCard
              key={profile.id}
              profile={profile}
              rating={ratings[profile.id] ?? { stars: 0, tags: [], connectChoice: null }}
              onChange={update => updateRating(profile.id, update)}
            />
          ))
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream border-t border-[#E8E4DC] px-4 py-4">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSubmit}
          disabled={!hasAnyRating || submitting}
        >
          {submitting ? 'Submitting…' : 'Submit rating'}
        </Button>
      </div>
    </div>
  )
}
