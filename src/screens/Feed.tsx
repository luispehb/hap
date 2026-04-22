import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useProfiles } from '../hooks/useProfiles'
import { usePlans, getActivityEmoji } from '../hooks/usePlans'
import { ProfileCard } from '../components/ui/ProfileCard'
import { BottomNav } from '../components/ui/BottomNav'
import { Chip } from '../components/ui/Chip'
import { formatPlanTime, computeAffinity } from '../lib/utils'
import { SlidersHorizontal, Plus } from 'lucide-react'
import { supabaseReady } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const FILTERS = ['Best match', 'Today', 'Traveler', 'Local']

function getActivityGradient(type: string): string {
  const gradients: Record<string, string> = {
    food: 'linear-gradient(135deg, #F5D0A9, #E8A87C)',
    culture: 'linear-gradient(135deg, #B8D4E8, #7EB3D4)',
    outdoor: 'linear-gradient(135deg, #C8E0B8, #8DC87A)',
    cowork: 'linear-gradient(135deg, #D4B8E0, #A87EC8)',
    nightlife: 'linear-gradient(135deg, #1A1A2E, #3D3D6B)',
    other: 'linear-gradient(135deg, #EAE6DF, #C8C0B0)',
  }
  return gradients[type] ?? gradients.other
}

export function Feed() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, user } = useAuth()
  const initialTab = (location.state as { tab?: 'people' | 'plans' } | null)?.tab ?? 'people'

  const [activeTab, setActiveTab] = useState<'people' | 'plans'>(initialTab)
  const [activeFilter, setActiveFilter] = useState('Best match')
  const [dismissed, setDismissed] = useState<string[]>([])
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShowInstallBanner(true), 30000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowInstallBanner(false)
    setDeferredPrompt(null)
  }

  const viewerCity = profile?.current_city ?? ''
  const viewerInterests = profile?.interests ?? []

  const { profiles, loading: profilesLoading, error } = useProfiles(
    viewerCity,
    viewerInterests
  )
  const { plans, loading: plansLoading } = usePlans(viewerCity)

  if (!user) return <Navigate to="/" replace />

  if (!profile) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center flex-col gap-4 px-6">
        <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
        <p className="text-muted text-sm text-center">Loading your profile...</p>
      </div>
    )
  }

  const visibleProfiles = profiles.filter(p => !dismissed.includes(p.id))

  const filteredProfiles = visibleProfiles.filter(p => {
    if (activeFilter === 'Traveler') return !p.is_local
    if (activeFilter === 'Local') return p.is_local
    return true
  })

  const hapPersonCount = profiles.filter(
    p => computeAffinity(p.interests, viewerInterests) >= 30
  ).length

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {!supabaseReady && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-amber-700 text-xs font-bold">⚠ Supabase not configured</p>
          <p className="text-amber-600 text-[10px] mt-1">
            Add your real credentials to <code className="bg-amber-100 px-1 rounded">.env</code>:
            VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.
          </p>
        </div>
      )}
      {supabaseReady && error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-xs font-bold">Supabase error: {error}</p>
          <p className="text-red-400 text-[10px] mt-1">Check RLS policies</p>
        </div>
      )}

      {/* Install banner */}
      {showInstallBanner && (
        <div className="mx-4 mt-4 bg-ink rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-xs">Add Hap to your home screen</p>
            <p className="text-white/40 text-[10px] mt-0.5">Works like a native app</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInstallBanner(false)}
              className="text-white/40 text-xs px-2 py-1 cursor-pointer"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              className="bg-sky text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer active:opacity-80 transition"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-10 pb-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[10px] font-bold text-sky uppercase tracking-widest mb-0.5">
              You're in
            </p>
            <h1 className="text-[26px] font-extrabold text-ink tracking-tight leading-none">
              {viewerCity}
            </h1>
            <p className="text-muted text-xs mt-1">
              {profiles.length} travelers here today
            </p>
          </div>
          <button className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DC] flex items-center justify-center mt-1 active:bg-sand transition cursor-pointer">
            <SlidersHorizontal size={14} className="text-muted" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-3">
        <div className="flex bg-sand rounded-xl p-1 gap-1">
          {(['people', 'plans'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-[10px] text-xs font-bold capitalize transition cursor-pointer ${
                activeTab === tab ? 'bg-white text-ink shadow-sm' : 'text-muted'
              }`}
            >
              {tab === 'people'
                ? 'People'
                : `Plans${plans.length > 0 ? ` (${plans.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {/* Filter chips — People tab only */}
      {activeTab === 'people' && (
        <div className="flex gap-2 px-4 mt-3 overflow-x-auto pb-0.5">
          {FILTERS.map(f => (
            <Chip
              key={f}
              label={f}
              active={activeFilter === f}
              onClick={() => setActiveFilter(f)}
            />
          ))}
        </div>
      )}

      {/* Social proof banner */}
      {activeTab === 'people' && hapPersonCount > 0 && (
        <div className="mx-4 mt-3 bg-white border border-[#E8E4DC] rounded-xl px-3 py-2 text-center">
          <p className="text-[10px] text-muted">
            <span className="text-ink font-bold">{hapPersonCount} people</span>
            {' '}with similar interests in {viewerCity}
          </p>
        </div>
      )}

      {/* Feed content */}
      <div className="flex-1 px-3 mt-3 pb-24 overflow-y-auto">

        {/* ── People tab ── */}
        {activeTab === 'people' && (
          <>
            {profilesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-2xl mb-2">✦</p>
                <p className="text-ink font-bold text-sm">No one here yet</p>
                <p className="text-muted text-xs mt-1">Be the first to create a plan</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredProfiles.map(profile => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    viewerInterests={viewerInterests}
                    activePlan={null}
                    onPass={() => setDismissed(d => [...d, profile.id])}
                    onConnect={() => navigate(`/profile/${profile.id}`)}
                    onJoinPlan={() => navigate(`/profile/${profile.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Plans tab ── */}
        {activeTab === 'plans' && (
          <>
            {plansLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-2xl mb-2">📍</p>
                <p className="text-ink font-bold text-sm">No active plans yet</p>
                <p className="text-muted text-xs mt-1">Create the first one</p>
                <button
                  onClick={() => navigate('/create-plan')}
                  className="mt-4 bg-ink text-white text-xs font-bold px-5 py-2 rounded-xl active:opacity-80 transition cursor-pointer"
                >
                  + New plan
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {plans.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => navigate(`/plan/${plan.id}`)}
                    className="bg-white border border-[#E8E4DC] rounded-[20px] overflow-hidden text-left cursor-pointer active:opacity-90 transition w-full"
                  >
                    {/* Plan strip */}
                    <div
                      className="h-[100px] relative flex items-center justify-center"
                      style={{ background: getActivityGradient(plan.activity_type) }}
                    >
                      <span className="text-4xl relative z-10 mb-8">
                        {getActivityEmoji(plan.activity_type)}
                      </span>
                      <div
                        className="absolute inset-0 z-20"
                        style={{
                          background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 z-30">
                        <p className="text-white font-extrabold text-sm tracking-tight leading-tight">
                          {plan.title}
                        </p>
                        <p className="text-white/60 text-[10px] mt-0.5">
                          {getActivityEmoji(plan.activity_type)} {plan.activity_type} · {plan.city}
                        </p>
                      </div>
                    </div>

                    {/* Plan body */}
                    <div className="px-3 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
                          {formatPlanTime(plan.scheduled_at)}
                        </p>
                        {plan.is_hap_day && (
                          <span className="text-[9px] font-bold text-sky bg-[#EBF4FF] px-2 py-0.5 rounded-full">
                            ✦ HAP DAY
                          </span>
                        )}
                      </div>
                      {plan.location_name && (
                        <p className="text-xs text-muted mb-2.5">📍 {plan.location_name}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted">Max {plan.max_participants} people</p>
                        <span className="bg-sky text-white text-xs font-bold px-4 py-2 rounded-xl">
                          View plan →
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB — create plan */}
      <button
        onClick={() => navigate('/create-plan')}
        className="fixed bottom-20 right-4 w-12 h-12 bg-ink rounded-2xl shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition z-40"
      >
        <Plus size={20} className="text-white" strokeWidth={2.5} />
      </button>

      <BottomNav active="explore" />
    </div>
  )
}