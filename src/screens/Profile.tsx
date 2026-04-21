import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { Chip } from '../components/ui/Chip'
import { Button } from '../components/ui/Button'
import { BottomNav } from '../components/ui/BottomNav'
import { getProfilePhoto } from '../lib/photos'

const ALL_INTERESTS = [
  'architecture', 'gastronomy', 'nature', 'music', 'literature',
  'photography', 'philosophy', 'sport', 'art', 'technology', 'languages', 'cinema',
]

const SOCIAL_EMOJIS: Record<string, string> = {
  instagram: '📸',
  linkedin: '💼',
  whatsapp: '💬',
  telegram: '✈️',
  website: '🌐',
  substack: '📝',
  spotify: '🎵',
}

function getDaysLabel(tripEndDate: string | null, isLocal: boolean): string {
  if (isLocal) return 'Local'
  if (!tripEndDate) return 'Traveler'
  const end = new Date(tripEndDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  const days = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Last day'
  if (days === 1) return '1 more day'
  return `${days} more days`
}

function formatTripDates(start: string | null, end: string | null): string {
  if (!start && !end) return ''
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  if (end) return `Until ${fmt(end)}`
  return `Since ${fmt(start!)}`
}

export function Profile() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { profile: ownProfile, signOut } = useAuth()
  const isOwnProfile = !id

  const fetchedProfile = useProfile(id ?? '')

  const profile = isOwnProfile ? ownProfile : fetchedProfile.profile
  const loading = isOwnProfile ? false : fetchedProfile.loading

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const daysLabel = getDaysLabel(profile.trip_end_date, profile.is_local)
  const tripDates = formatTripDates(profile.trip_start_date, profile.trip_end_date)
  const socialLinks = (profile as unknown as { social_links?: Record<string, string> }).social_links ?? {}
  const activeSocialPlatforms = Object.entries(socialLinks).filter(([, v]) => v)

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* Photo section */}
      <div className="h-[200px] relative overflow-hidden flex-shrink-0">
        <img
          src={getProfilePhoto(profile.display_name, profile.origin_city)}
          alt={profile.display_name}
          className="w-full h-full object-cover"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        {/* Fallback gradient */}
        <div
          className="absolute inset-0 -z-10"
          style={{ background: 'linear-gradient(135deg, #B8D4E8, #7EB3D4)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}
        />

        {/* Back button for other profiles */}
        {!isOwnProfile && (
          <button
            onClick={() => navigate(-1)}
            className="absolute top-12 left-4 w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 transition z-10"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
        )}

        {/* Verified badge top right */}
        {profile.is_verified && (
          <div className="absolute top-12 right-4 z-10 bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-3 py-1.5">
            <p className="text-white text-[10px] font-bold">✓ Verified</p>
          </div>
        )}

        {/* Name overlay bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 z-10">
          <p className="text-white font-extrabold text-xl tracking-tight">
            {profile.display_name}
          </p>
          <p className="text-white/60 text-xs mt-0.5">
            {profile.origin_city} · {profile.is_local ? 'Local' : daysLabel}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 py-4 flex flex-col gap-4">

        {/* Trust score card */}
        <div className="bg-ink rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p
              className="font-extrabold leading-none"
              style={{ color: '#4A90D9', fontSize: 38, letterSpacing: '-2px' }}
            >
              {profile.trust_score}
            </p>
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">
              Trust Score
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-[10px]">Email · phone ✓</p>
            <p className="text-white/50 text-[10px] mt-0.5">0 plans completed</p>
            <p className="text-white/50 text-[10px] mt-0.5">Rating — · 0 no-shows</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Plans', value: '0' },
            { label: 'Rating', value: '—' },
            { label: 'Countries', value: '1' },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-white border border-[#E8E4DC] rounded-2xl p-3 text-center"
            >
              <p className="text-ink text-xl font-extrabold tracking-tight">{stat.value}</p>
              <p className="text-muted text-[9px] font-bold uppercase tracking-wider mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Journal link */}
        {isOwnProfile && (
          <button
            onClick={() => navigate('/journal')}
            className="w-full bg-white border border-[#E8E4DC] rounded-2xl p-4 flex items-center justify-between active:bg-sand transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📖</span>
              <div className="text-left">
                <p className="text-ink font-bold text-sm">Hap Journal</p>
                <p className="text-muted text-xs">Your travel connections</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted" />
          </button>
        )}

        {/* Trip card */}
        <div className="bg-[#FFF5EC] border border-[#F0D8C0] rounded-2xl p-4">
          {profile.is_local ? (
            <div>
              <p className="text-[#C05A20] font-extrabold text-base">{profile.current_city}</p>
              <p className="text-[#D09060] text-[10px] mt-1">Local · resident</p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-[#C05A20] font-extrabold text-base">{profile.current_city}</p>
                {tripDates && (
                  <p className="text-[#D09060] text-[10px]">{tripDates}</p>
                )}
              </div>
              <p className="text-[#D09060] text-[10px] mt-1">
                Traveler from {profile.origin_city} · {daysLabel}
              </p>
            </div>
          )}
        </div>

        {/* Admission answer */}
        {profile.bio_question && (
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
              In their own words
            </p>
            <div className="bg-white border border-[#E8E4DC] rounded-2xl p-4">
              <p className="text-sky text-3xl font-extrabold leading-none mb-1">"</p>
              <p className="text-ink text-sm leading-relaxed italic">
                {profile.bio_question}
              </p>
            </div>
          </div>
        )}

        {/* Interests */}
        <div>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
            Interests
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_INTERESTS.map(i => (
              <Chip
                key={i}
                label={i}
                active={profile.interests.includes(i)}
              />
            ))}
          </div>
        </div>

        {/* Social links */}
        {activeSocialPlatforms.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
              Connect outside Hap
            </p>
            <div className="flex flex-wrap gap-2">
              {activeSocialPlatforms.map(([platform]) => (
                <div
                  key={platform}
                  className="bg-white border border-[#E8E4DC] rounded-xl px-3 py-2 flex items-center gap-1.5"
                >
                  <span>{SOCIAL_EMOJIS[platform] ?? '🔗'}</span>
                  <span className="text-xs font-bold text-ink capitalize">{platform}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isOwnProfile
        ? (
          <>
            <button
              onClick={() => signOut()}
              className="fixed top-12 right-4 z-10 bg-white/80 border border-[#E8E4DC] rounded-xl px-3 py-1.5 text-xs font-bold text-muted active:bg-sand transition cursor-pointer"
            >
              Sign out
            </button>
            <BottomNav active="profile" />
          </>
        )
        : (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream border-t border-[#EAE6DF] px-4 pt-3 pb-8">
            <div className="flex gap-2">
              <Button variant="outline" size="lg" onClick={() => navigate(-1)}>Pass</Button>
              <div className="flex-1">
                <Button variant="primary" size="lg" fullWidth onClick={() => alert('Connect flow — Phase 6')}>
                  Connect
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  )
}
