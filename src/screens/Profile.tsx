import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { Chip } from '../components/ui/Chip'
import { Button } from '../components/ui/Button'
import { BottomNav } from '../components/ui/BottomNav'
import { getProfilePhoto, getBannerPhoto, hashString } from '../lib/photos'
import { TrustBadge } from '../components/ui/TrustBadge'
import { supabase } from '../lib/supabase'

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

function randomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
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

function getSocialUrl(platform: string, handle: string): string {
  const map: Record<string, string> = {
    instagram: `https://instagram.com/${handle}`,
    linkedin: `https://linkedin.com/in/${handle}`,
    whatsapp: `https://wa.me/${handle}`,
    telegram: `https://t.me/${handle}`,
    website: handle,
    substack: `https://${handle}.substack.com`,
    spotify: `https://open.spotify.com/user/${handle}`,
  }
  return map[platform] ?? handle
}

export function Profile() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { profile: ownProfile, signOut } = useAuth()
  const isOwnProfile = !id

  const fetchedProfile = useProfile(id ?? '')

  const profile = isOwnProfile ? ownProfile : fetchedProfile.profile
  const loading = isOwnProfile ? false : fetchedProfile.loading

  const [connection, setConnection] = useState<Record<string, unknown> | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [toast, setToast] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteCount, setInviteCount] = useState(0)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [generatingInvite, setGeneratingInvite] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  useEffect(() => {
    if (isOwnProfile || !ownProfile?.id || !id) return
    supabase
      .from('connections')
      .select('*')
      .or(`and(user_a_id.eq.${ownProfile.id},user_b_id.eq.${id}),and(user_a_id.eq.${id},user_b_id.eq.${ownProfile.id})`)
      .maybeSingle()
      .then(({ data }) => setConnection(data))
  }, [isOwnProfile, ownProfile?.id, id])

  useEffect(() => {
    if (!isOwnProfile || !ownProfile?.id) return
    supabase
      .from('connections')
      .select('id', { count: 'exact' })
      .eq('user_b_id', ownProfile.id)
      .eq('user_b_wants_connect', false)
      .eq('user_a_wants_connect', true)
      .then(({ count }) => setPendingCount(count || 0))
  }, [isOwnProfile, ownProfile?.id])

  useEffect(() => {
    if (!isOwnProfile || !ownProfile?.id) return
    supabase
      .from('invitations')
      .select('id', { count: 'exact' })
      .eq('inviter_id', ownProfile.id)
      .then(({ count }) => setInviteCount(count || 0))
  }, [isOwnProfile, ownProfile?.id])

  const handleConnect = async () => {
    if (!ownProfile?.id || !id) return
    setConnecting(true)
    const { data, error } = await supabase
      .from('connections')
      .insert({
        user_a_id: ownProfile.id,
        user_b_id: id,
        user_a_wants_connect: true,
        user_b_wants_connect: false,
      })
      .select()
      .single()
    if (!error) {
      setConnection(data)
      showToast('Connection request sent ✓')
    }
    setConnecting(false)
  }

  const handleAccept = async () => {
    if (!connection?.id) return
    await supabase
      .from('connections')
      .update({ user_b_wants_connect: true })
      .eq('id', connection.id)
    setConnection({ ...connection, user_b_wants_connect: true })
    showToast('Connected! 🎉')
  }

  const handleDecline = async () => {
    if (!connection?.id) return
    await supabase.from('connections').delete().eq('id', connection.id)
    setConnection(null)
  }

  const handleGenerateInvite = async () => {
    if (!ownProfile?.id || inviteCount >= 3 || generatingInvite) return
    setGeneratingInvite(true)
    const code = randomCode()
    const { error } = await supabase
      .from('invitations')
      .insert({ inviter_id: ownProfile.id, code })
    if (!error) {
      setInviteCode(code)
      setInviteCount(c => c + 1)
    }
    setGeneratingInvite(false)
  }

  const handleCopyLink = () => {
    if (!inviteCode) return
    navigator.clipboard.writeText(`https://hop-chi.vercel.app/invite/${inviteCode}`)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

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

  const carouselPhotos = [
    getProfilePhoto(profile.display_name, profile.origin_city),
    getBannerPhoto(profile.display_name, profile.origin_city),
    `https://picsum.photos/seed/${hashString(profile.id + 'c3')}/400/500`,
  ]

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {isOwnProfile ? (
        /* Own profile: banner + avatar bubble */
        <div className="relative flex-shrink-0">
          <div className="flex items-center justify-between px-4 pt-12 pb-2 absolute top-0 left-0 right-0 z-20">
            <button
              onClick={() => navigate('/profile/edit')}
              className="bg-white/80 backdrop-blur-sm border border-[#E8E4DC] rounded-xl px-3 py-1.5 text-xs font-bold text-ink active:bg-sand transition cursor-pointer"
            >
              Edit profile
            </button>
            <button
              onClick={() => signOut()}
              className="bg-white/80 backdrop-blur-sm border border-[#E8E4DC] rounded-xl px-3 py-1.5 text-xs font-bold text-muted active:bg-sand transition cursor-pointer"
            >
              Sign out
            </button>
          </div>
          <div className="h-[130px] overflow-hidden">
            <img
              src={getBannerPhoto(profile.display_name, profile.origin_city)}
              alt=""
              className="w-full h-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
            <div className="absolute inset-x-0 top-0 h-[130px] -z-10" style={{ background: 'linear-gradient(135deg, #B8D4E8, #7EB3D4)' }} />
          </div>
          <div className="absolute -bottom-8 left-4 z-10">
            <div className="w-20 h-20 rounded-2xl overflow-hidden" style={{ border: '3px solid white' }}>
              <img
                src={getProfilePhoto(profile.display_name, profile.origin_city)}
                alt={profile.display_name}
                className="w-full h-full object-cover"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            </div>
          </div>
          {profile.is_verified && (
            <div className="absolute top-3 right-3 z-10 bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-3 py-1.5">
              <p className="text-white text-[10px] font-bold">✓ Verified</p>
            </div>
          )}
        </div>
      ) : (
        /* Non-own profile: Raya-style photo carousel */
        <div className="relative h-[280px] overflow-hidden flex-shrink-0">
          <div
            className="flex h-full transition-transform duration-300"
            style={{ transform: `translateX(-${photoIndex * 100}%)` }}
          >
            {carouselPhotos.map((photo, i) => (
              <div key={i} className="w-full h-full flex-shrink-0">
                <img
                  src={photo}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              </div>
            ))}
          </div>
          {/* Tap zones */}
          <div className="absolute inset-0 flex z-10">
            <div className="flex-1 cursor-pointer" onClick={() => setPhotoIndex(i => Math.max(0, i - 1))} />
            <div className="flex-1 cursor-pointer" onClick={() => setPhotoIndex(i => Math.min(carouselPhotos.length - 1, i + 1))} />
          </div>
          {/* Dots */}
          <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-20">
            {carouselPhotos.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${i === photoIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-12 left-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 z-20 cursor-pointer active:opacity-70"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
          {/* Gradient overlay */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 z-10"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
          />
          {/* Name + trust badge overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white font-extrabold text-2xl tracking-tight leading-tight">
                  {profile.display_name}
                </p>
                <p className="text-white/70 text-xs mt-0.5">
                  {profile.origin_city} · {daysLabel}
                </p>
              </div>
              <TrustBadge score={profile.trust_score} />
            </div>
          </div>
        </div>
      )}

      {/* Own profile: name + meta below banner/avatar */}
      {isOwnProfile && (
        <div className="pt-12 px-4 pb-2">
          <p className="text-ink font-extrabold text-xl tracking-tight">{profile.display_name}</p>
          <p className="text-muted text-xs mt-0.5">{profile.origin_city} · {profile.is_local ? 'Local' : 'Traveler'}</p>
        </div>
      )}

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

        {/* Invite a friend — own profile only */}
        {isOwnProfile && (
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
              Invite a friend
            </p>
            <div className="bg-white border border-[#E8E4DC] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-ink text-sm font-bold">Invite link</p>
                <p className="text-[10px] text-muted font-bold">{inviteCount}/3 used</p>
              </div>
              {inviteCode ? (
                <div className="flex flex-col gap-2">
                  <div className="bg-sand rounded-xl px-3 py-2">
                    <p className="text-ink text-xs font-mono break-all">
                      https://hop-chi.vercel.app/invite/{inviteCode}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="w-full bg-ink text-white rounded-xl py-2.5 text-xs font-bold active:opacity-80 transition cursor-pointer"
                  >
                    {inviteCopied ? 'Copied ✓' : 'Copy link'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerateInvite}
                  disabled={inviteCount >= 3 || generatingInvite}
                  className="w-full bg-ink text-white rounded-xl py-2.5 text-xs font-bold disabled:opacity-40 active:opacity-80 transition cursor-pointer"
                >
                  {generatingInvite ? 'Generating…' : inviteCount >= 3 ? 'No invites left' : 'Generate invite link'}
                </button>
              )}
            </div>
          </div>
        )}

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

        {/* Journal + Connections links */}
        {isOwnProfile && (
          <>
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
            <button
              onClick={() => navigate('/connections')}
              className="w-full bg-white border border-[#E8E4DC] rounded-2xl p-4 flex items-center justify-between active:bg-sand transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🤝</span>
                <div className="text-left">
                  <p className="text-ink font-bold text-sm">Connections</p>
                  <p className="text-muted text-xs">People you've met on Hap</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <span className="bg-sky text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
                <ChevronRight size={16} className="text-muted" />
              </div>
            </button>
          </>
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

        {/* Social links — own profile always visible */}
        {isOwnProfile && (
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
              Connect outside Hap
            </p>
            {activeSocialPlatforms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeSocialPlatforms.map(([platform, handle]) => (
                  <button
                    key={platform}
                    onClick={() => handle && window.open(getSocialUrl(platform, handle), '_blank')}
                    className="bg-white border border-[#E8E4DC] rounded-xl px-3 py-2 flex items-center gap-1.5 active:bg-sand transition cursor-pointer"
                  >
                    <span>{SOCIAL_EMOJIS[platform] ?? '🔗'}</span>
                    <span className="text-xs font-bold text-ink capitalize">{platform}</span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => navigate('/profile/edit')}
                className="w-full bg-white border border-dashed border-[#E8E4DC] rounded-xl px-4 py-3 text-muted text-xs text-center active:bg-sand transition cursor-pointer"
              >
                + Add your social links
              </button>
            )}
          </div>
        )}

        {/* Connection state UI — shown for other profiles */}
        {!isOwnProfile && (() => {
          const isConnected = connection?.user_a_wants_connect && connection?.user_b_wants_connect
          const isViewerB = connection?.user_b_id === ownProfile?.id
          const isPendingForViewer = connection && !connection.user_b_wants_connect && isViewerB

          if (isConnected) {
            return (
              <>
                <div className="bg-[#F0FFF6] border border-green-200 rounded-2xl p-4">
                  <p className="text-green-700 font-bold text-center text-sm">✓ You're connected</p>
                  <p className="text-green-500 text-xs text-center mt-1">Good things happen.</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
                    Connect outside Hap
                  </p>
                  {activeSocialPlatforms.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {activeSocialPlatforms.map(([platform, handle]) => (
                        <button
                          key={platform}
                          onClick={() => window.open(getSocialUrl(platform, handle), '_blank')}
                          className="bg-white border border-[#E8E4DC] rounded-xl px-3 py-2.5 flex items-center gap-2 cursor-pointer active:bg-sand transition text-left"
                        >
                          <span>{SOCIAL_EMOJIS[platform] ?? '🔗'}</span>
                          <span className="text-xs font-bold text-ink capitalize">{platform}</span>
                          <span className="text-xs text-muted ml-1">{handle}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted text-xs text-center py-2">
                      {profile.display_name} hasn't added social links yet
                    </p>
                  )}
                </div>
              </>
            )
          }

          if (isPendingForViewer) {
            return (
              <div className="bg-white border border-[#E8E4DC] rounded-2xl p-4 mb-4">
                <p className="text-ink font-bold text-sm text-center mb-3">
                  {profile.display_name} wants to connect with you
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="lg" fullWidth onClick={handleDecline}>
                    Decline
                  </Button>
                  <Button variant="cta" size="lg" fullWidth onClick={handleAccept}>
                    Accept
                  </Button>
                </div>
              </div>
            )
          }

          return null
        })()}
      </div>

      {isOwnProfile
        ? (
          <BottomNav active="profile" />
        )
        : (
          <>
            {toast && (
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-ink text-white text-xs font-bold px-5 py-3 rounded-xl z-50 whitespace-nowrap shadow-lg">
                {toast}
              </div>
            )}
            {(() => {
              const isConnected = connection?.user_a_wants_connect && connection?.user_b_wants_connect
              const isViewerA = connection?.user_a_id === ownProfile?.id
              const isPendingSent = connection && !connection.user_b_wants_connect && isViewerA
              const isViewerB = connection?.user_b_id === ownProfile?.id
              const isPendingForViewer = connection && !connection.user_b_wants_connect && isViewerB

              if (isConnected) return null
              if (isPendingForViewer) return null

              return (
                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream border-t border-[#EAE6DF] px-4 pt-3 pb-8">
                  <div className="flex gap-2">
                    <Button variant="outline" size="lg" onClick={() => navigate(-1)}>Pass</Button>
                    <div className="flex-1">
                      {isPendingSent ? (
                        <Button variant="primary" size="lg" fullWidth disabled>
                          Request sent ✓
                        </Button>
                      ) : (
                        <Button variant="primary" size="lg" fullWidth onClick={handleConnect} disabled={connecting}>
                          {connecting ? 'Sending…' : 'Connect'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
          </>
        )
      }
    </div>
  )
}
