import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useProfiles } from '../hooks/useProfiles'
import { usePlans, getActivityEmoji } from '../hooks/usePlans'
import { ProfileCard } from '../components/ui/ProfileCard'
import { BottomNav } from '../components/ui/BottomNav'
import { Chip } from '../components/ui/Chip'
import { formatPlanTime, computeAffinity } from '../lib/utils'
import { SlidersHorizontal, Plus, Bell } from 'lucide-react'
import { supabaseReady, supabase } from '../lib/supabase'
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
  const { profile, user, loading: authLoading } = useAuth()
  const initialTab = (location.state as { tab?: 'people' | 'plans' } | null)?.tab ?? 'people'

  const [activeTab, setActiveTab] = useState<'people' | 'plans'>(initialTab)
  const [activeFilter, setActiveFilter] = useState('Best match')
  const [dismissed, setDismissed] = useState<string[]>([])
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [notifCount, setNotifCount] = useState(0)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)

  const viewerCity = profile?.current_city ?? ''
  const viewerInterests = profile?.interests ?? []

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!profile?.id) return

    async function loadNotificationCount() {
      const { count: connectionCount } = await supabase
        .from('connections')
        .select('id', { count: 'exact', head: true })
        .eq('user_b_id', profile!.id)
        .eq('user_a_wants_connect', true)
        .eq('user_b_wants_connect', false)

      const { data: planData } = await supabase
        .from('plans')
        .select('id')
        .eq('city', profile!.current_city)
        .gt('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5)

      const { data: joined } = await supabase
        .from('plan_participants')
        .select('plan_id')
        .eq('user_id', profile!.id)

      const joinedIds = new Set((joined ?? []).map(j => j.plan_id))
      const planCount = (planData ?? []).filter(p => !joinedIds.has(p.id)).length

      setNotifCount((connectionCount || 0) + planCount)
    }

    loadNotificationCount().catch(err => {
      console.error('Notification count error:', err)
      setNotifCount(0)
    })
  }, [profile?.current_city, profile?.id])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowInstallBanner(false)
    setDeferredPrompt(null)
  }

  const { profiles, loading: profilesLoading, error } = useProfiles(viewerCity, viewerInterests, user?.id)
  const { plans, loading: plansLoading } = usePlans(viewerCity)

  if (!profile) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center flex-col gap-4 px-6">
        <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
        <p className="text-muted text-sm text-center">Loading your profile...</p>
      </div>
    )
  }

  if (!user && !authLoading) return <Navigate to="/" replace />

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
    <div className="h-app bg-cream flex flex-col overflow-hidden">
      {supabaseReady && error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-xs font-bold">Error: {error}</p>
        </div>
      )}

      {showInstallBanner && (
        <div className="mx-4 mt-4 bg-ink rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-xs">Add Hap to your home screen</p>
            <p className="text-white/40 text-[10px] mt-0.5">Works like a native app</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInstallBanner(false)} className="text-white/40 text-xs px-2 py-1 cursor-pointer">Later</button>
            <button onClick={handleInstall} className="bg-sky text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer active:opacity-80 transition">Install</button>
          </div>
        </div>
      )}

      <div className="px-4 pt-10 pb-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[10px] font-bold text-sky uppercase tracking-widest mb-0.5">You're in</p>
            <h1 className="text-[26px] font-extrabold text-ink tracking-tight leading-none">{viewerCity}</h1>
            <p className="text-muted text-xs mt-1">{profiles.length} travelers here today</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => navigate('/notifications')}
              className="relative w-9 h-9 rounded-xl bg-white border border-[#E8E4DC] flex items-center justify-center active:bg-sand transition cursor-pointer"
            >
              <Bell size={14} className="text-muted" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-sky rounded-full flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">{notifCount}</span>
                </span>
              )}
            </button>
            <button className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DC] flex items-center justify-center active:bg-sand transition cursor-pointer">
              <SlidersHorizontal size={14} className="text-muted" />
            </button>
          </div>
        </div>
      </div>

      {(() => {
        const p = profile as typeof profile & { mindset_welcome_note?: string | null; mindset_compatibility_score?: number | null }
        return p?.mindset_welcome_note &&
          !welcomeDismissed &&
          !localStorage.getItem(`hap_welcome_dismissed_${p.id}`) &&
          (new Date().getTime() - new Date(p.created_at).getTime()) < 48 * 60 * 60 * 1000 ? (
          <div className="mx-4 mb-3 bg-white border border-[#E8E4DC] rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-sky uppercase tracking-widest mb-1">✦ Welcome to Hap</p>
                <p className="text-ink text-sm leading-relaxed">{p.mindset_welcome_note}</p>
                {p.mindset_compatibility_score != null && (
                  <span className="inline-block mt-2 bg-[#EBF4FF] text-sky text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {p.mindset_compatibility_score}% Hap match
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  localStorage.setItem(`hap_welcome_dismissed_${p.id}`, '1')
                  setWelcomeDismissed(true)
                }}
                className="text-muted text-xs cursor-pointer active:opacity-60 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          </div>
        ) : null
      })()}

      <div className="px-4 mt-3">
        <div className="flex bg-sand rounded-xl p-1 gap-1">
          {(['people', 'plans'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-[10px] text-xs font-bold capitalize transition cursor-pointer ${activeTab === tab ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}>
              {tab === 'people' ? 'People' : `Plans${plans.length > 0 ? ` (${plans.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'people' && (
        <div className="flex gap-2 px-4 mt-3 overflow-x-auto pb-0.5">
          {FILTERS.map(f => (
            <Chip key={f} label={f} active={activeFilter === f} onClick={() => setActiveFilter(f)} />
          ))}
        </div>
      )}

      {activeTab === 'people' && hapPersonCount > 0 && (
        <div className="mx-4 mt-3 bg-white border border-[#E8E4DC] rounded-xl px-3 py-2 text-center">
          <p className="text-[10px] text-muted">
            <span className="text-ink font-bold">{hapPersonCount} people</span>{' '}with similar interests in {viewerCity}
          </p>
        </div>
      )}

      <div className="flex-1 min-h-0 px-3 mt-3 pb-24 overflow-y-auto">
        {activeTab === 'people' && (
          <>
            {profilesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 bg-sand rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-2xl">✦</span>
                </div>
                <p className="text-ink font-extrabold text-base tracking-tight mb-1">No travelers here yet</p>
                <p className="text-muted text-sm leading-relaxed">Be the first to create a plan and bring people together.</p>
                <button
                  onClick={() => navigate('/create-plan')}
                  className="mt-5 bg-ink text-white text-xs font-bold px-6 py-3 rounded-xl active:opacity-80 transition cursor-pointer"
                >
                  + Create a plan
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredProfiles.map(p => (
                  <ProfileCard key={p.id} profile={p} viewerInterests={viewerInterests}
                    activePlan={null}
                    onPass={() => setDismissed(d => [...d, p.id])}
                    onConnect={() => navigate(`/profile/${p.id}`)}
                    onJoinPlan={() => navigate(`/profile/${p.id}`)} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'plans' && (
          <>
            {plansLoading ? (
              <div className="flex items-center justify-centepy-12">
                <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
              </div>
            ) : plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 bg-sand rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-2xl">📍</span>
                </div>
                <p className="text-ink font-extrabold text-base tracking-tight mb-1">No plans yet</p>
                <p className="text-muted text-sm leading-relaxed">Plans are how things actually happen. Create one and see who joins.</p>
                <button
                  onClick={() => navigate('/create-plan')}
                  className="mt-5 bg-sky text-white text-xs font-bold px-6 py-3 rounded-xl active:opacity-80 transition cursor-pointer"
                >
                  + New plan
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {plans.map(plan => (
                  <button key={plan.id} onClick={() => navigate(`/plan/${plan.id}`)}
                    className="bg-white border border-[#E8E4DC] rounded-[20px] overflow-hidden text-left cuor-pointer active:opacity-90 active:scale-[0.99] transition transition-transform duration-150 w-full">
                    <div className="h-[110px] relative flex items-center justify-center"
                      style={{ background: getActivityGradient(plan.activity_type) }}>
                      <span className="text-4xl relative z-10 mb-8">{getActivityEmoji(plan.activity_type)}</span>
                      <div className="absolute inset-0 z-20" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }} />
                      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 z-30">
                        <p className="text-white font-extrabold text-sm tracking-tight leading-tight">{plan.title}</p>
                        <p className="text-white/60 text-[10px] mt-0.5">{getActivityEmoji(plan.activity_type)} {plan.activity_type} · {plan.city}</p>
                      </div>
                    </div>
                    <div className="px-3 py-3">
                      <div className="flex itms-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{formatPlanTime(plan.scheduled_at)}</p>
                        {plan.is_hap_day && <span className="text-[9px] font-bold text-sky bg-[#EBF4FF] px-2 py-0.5 rounded-full">✦ HAP DAY</span>}
                      </div>
                      {plan.location_name && <p className="text-xs text-muted mb-2.5">📍 {plan.location_name}</p>}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted">Max {plan.max_participants} people</p>
                        <span className="bg-ink text-white text-xs font-bold px-4 py-2 rounded-xl">View plan →</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <button onClick={() => navigate('/create-plan')}
        className="fixed bottom-24 right-4 w-12 h-12 bg-ink rounded-2xl shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition z-40">
        <Plus size={20} className="text-white" strokeWidth={2.5} />
      </button>

      <BottomNav active="explore" />
    </div>
  )
}
