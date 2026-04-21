import { TrustBadge } from './TrustBadge'
import { AffinityBar } from './AffinityBar'
import { IntentBlock } from './IntentBlock'
import { Chip } from './Chip'
import { Button } from './Button'
import { getProfilePhoto } from '../../lib/photos'

interface Profile {
  display_name: string
  origin_city: string
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

const CITY_COLORS: Record<string, string> = {
  AE: '#B8D4E8',
  FJ: '#C8E0B8',
  KO: '#F0D4B8',
  PT: '#D4B8E0',
  UZ: '#B8E0D4',
}

function getCityColor(city: string): string {
  const code = city.trim().toUpperCase().charCodeAt(0)
  if (code >= 65 && code <= 69) return CITY_COLORS.AE
  if (code >= 70 && code <= 74) return CITY_COLORS.FJ
  if (code >= 75 && code <= 79) return CITY_COLORS.KO
  if (code >= 80 && code <= 84) return CITY_COLORS.PT
  return CITY_COLORS.UZ
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
  if (days <= 0) return 'Last day'
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
  const bgColor = getCityColor(profile.origin_city)
  const affinity = computeAffinity(profile.interests, viewerInterests)
  const daysLabel = getDaysLabel(profile.trip_end_date, profile.is_local)

  return (
    <div className="bg-white border border-[#E8E4DC] rounded-card overflow-hidden">
      {/* Photo strip */}
      <div className="h-[140px] relative overflow-hidden rounded-t-[20px]">
        <img
          src={getProfilePhoto(profile.display_name, profile.origin_city)}
          alt={profile.display_name}
          className="w-full h-full object-cover"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        {/* Fallback colour behind img */}
        <div className="absolute inset-0 -z-10" style={{ backgroundColor: bgColor }} />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }}
        />

        {/* Trust badge — top right */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <TrustBadge score={profile.trust_score} />
        </div>

        {/* Name + meta — bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 z-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                {profile.display_name}
                {profile.is_verified && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                )}
              </p>
              <p className="text-white/60 text-[10px] mt-0.5">
                {profile.origin_city}
                {daysLabel ? ` · ${daysLabel}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="px-3 py-3 flex flex-col gap-2.5">
        {/* Affinity bar */}
        <AffinityBar percentage={affinity} />

        {/* Active plan intent block */}
        {activePlan && (
          <IntentBlock
            emoji={activePlan.emoji}
            text={activePlan.title}
            time={activePlan.time}
          />
        )}

        {/* Interest chips */}
        <div className="flex flex-wrap gap-1.5">
          {profile.interests.map(interest => (
            <Chip
              key={interest}
              label={interest}
              match={viewerInterests.includes(interest)}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-0.5">
          <Button variant="outline" size="sm" onClick={onPass}>
            Pass
          </Button>
          <div className="flex-1">
            {activePlan ? (
              <Button variant="cta" size="sm" fullWidth onClick={onJoinPlan}>
                Join plan
              </Button>
            ) : (
              <Button variant="primary" size="sm" fullWidth onClick={onConnect}>
                Connect
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
