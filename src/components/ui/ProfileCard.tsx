import { TrustBadge } from './TrustBadge'
import { AffinityBar } from './AffinityBar'
import { IntentBlock } from './IntentBlock'
import { Chip } from './Chip'
import { getProfilePhoto, getBannerPhoto } from '../../lib/photos'

interface Profile {
  display_name: string
  home_city: string
  current_city: string
  trip_end_date: string | null
  is_local: boolean
  bio_question: string
  interests: string[]
  trust_score: number
  is_verified: boolean
}

interface ActivePlan {
  emoji: string
  title: string
  time: string
}

interface ProfileCardProps {
  profile: Profile
  viewerInterests: string[]
  activePlan?: ActivePlan | null
  onPass: () => void
  onConnect: () => void
  onJoinPlan: () => void
}

function computeAffinity(profileInterests: string[], viewerInterests: string[]): number {
  if (viewerInterests.length === 0) return 0
  const matches = profileInterests.filter(i => viewerInterests.includes(i)).length
  return Math.round((matches / viewerInterests.length) * 100)
}

function getDaysLabel(tripEndDate: string | null, isLocal: boolean): string {
  if (isLocal) return 'Local'
  if (!tripEndDate) return ''
  const end = new Date(tripEndDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  const days = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return ''
  if (days === 0) return 'Last day'
  if (days === 1) return '1 more day'
  return `${days} more days`
}

export function ProfileCard({
  profile,
  viewerInterests,
  activePlan,
  onPass,
  onConnect,
  onJoinPlan,
}: ProfileCardProps) {
  const affinity = computeAffinity(profile.interests, viewerInterests)
  const daysLabel = getDaysLabel(profile.trip_end_date, profile.is_local)

  return (
    <div onClick={onConnect} className="rounded-[20px] overflow-visible active:scale-[0.99] transition-transform duration-150 cursor-pointer" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }}>

      {/* BANNER + AVATAR BUBBLE */}
      <div className="relative">

        {/* Banner — 120px */}
        <div className="h-[120px] w-full overflow-hidden rounded-t-[20px] relative">
          <img
            src={getBannerPhoto(profile.display_name, profile.home_city)}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          {/* Fallback gradient behind image */}
          <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(135deg, #B8D4E8, #7EB3D4)' }} />
          <div
            className="absolute inset-0 rounded-t-[20px]"
            style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.3) 100%)' }}
          />
        </div>

        {/* Avatar bubble — overlaps banner */}
        <div className="absolute -bottom-5 left-4 z-10">
          <div className="w-[60px] h-[60px] rounded-2xl overflow-hidden" style={{ border: '3px solid white' }}>
            <img
              src={getProfilePhoto(profile.display_name, profile.home_city)}
              alt={profile.display_name}
              className="w-full h-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>
          {/* Verified dot on avatar */}
          {profile.is_verified && (
            <div className="absolute z-20" style={{ bottom: '-2px', left: '42px' }}>
              <div className="w-4 h-4 rounded-full bg-green-400 border-2 border-white flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Trust badge — top right of banner */}
        <div className="absolute top-3 right-3 z-10">
          <TrustBadge score={profile.trust_score} />
        </div>

      </div>

      {/* CARD BODY — top padding for avatar overlap */}
      <div className="bg-white px-4 pt-8 pb-3 rounded-b-[20px] border border-t-0 border-[#E8E4DC]">

        {/* Name + meta */}
        <div className="mb-2">
          <p className="text-ink font-extrabold text-base tracking-tight">{profile.display_name}</p>
          <p className="text-muted text-xs mt-0.5">
            {profile.home_city}{daysLabel ? ` · ${daysLabel}` : ''}
          </p>
        </div>

        {/* Affinity bar */}
        <AffinityBar percentage={affinity} />

        {/* Intent block */}
        {activePlan && (
          <div className="mt-2">
            <IntentBlock
              emoji={activePlan.emoji}
              text={activePlan.title}
              time={activePlan.time}
            />
          </div>
        )}

        {/* Interest chips — max 4 visible */}
        <div className="flex gap-1.5 flex-wrap mt-2 mb-3">
          {profile.interests.slice(0, 4).map(interest => (
            <Chip
              key={interest}
              label={interest}
              match={viewerInterests.includes(interest)}
            />
          ))}
          {profile.interests.length > 4 && (
            <span className="text-[11px] text-muted self-center">+{profile.interests.length - 4} more</span>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={e => { e.stopPropagation(); onPass() }}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-[#E8E4DC] text-muted bg-white active:bg-sand transition cursor-pointer"
          >
            Pass
          </button>
          <button
            onClick={e => { e.stopPropagation(); activePlan ? onJoinPlan() : onConnect() }}
            className="flex-[2] py-2.5 rounded-xl text-xs font-bold bg-ink text-white active:opacity-80 transition cursor-pointer"
          >
            {activePlan ? 'Join plan' : 'Connect'}
          </button>
        </div>

      </div>
    </div>
  )
}
