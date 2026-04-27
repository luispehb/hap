import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { BottomNav } from '../components/ui/BottomNav'
import { Avatar } from '../components/ui/Avatar'
import { getPlanPhoto } from '../lib/photos'
import { getActivityEmoji } from '../hooks/usePlans'
import { formatPlanTime } from '../lib/utils'
import type { Plan } from '../hooks/usePlans'

interface JournalPlan extends Plan {
  participants?: { profile: { display_name: string; home_city: string } | null }[]
}

export function Journal() {
  const navigate = useNavigate()
  const { profile: ownProfile, loading: authLoading } = useAuth()
  const [plans, setPlans] = useState<JournalPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!ownProfile?.id) {
      setError('We could not find your profile.')
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const { data: participantData, error: participantError } = await supabase
          .from('plan_participants')
          .select('plan_id')
          .eq('user_id', ownProfile!.id)

        if (participantError) throw participantError

        const joinedPlanIds = new Set((participantData ?? []).map(p => p.plan_id))

        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        const visiblePlans = ((data ?? []) as JournalPlan[]).filter(plan =>
          plan.creator_id === ownProfile!.id || joinedPlanIds.has(plan.id)
        )

        setPlans(visiblePlans)

        if (visiblePlans.length > 0) {
          const { data: participantRows, error: participantsError } = await supabase
            .from('plan_participants')
            .select('plan_id, profile:profiles(display_name, home_city)')
            .in('plan_id', visiblePlans.map(plan => plan.id))

          if (!participantsError && participantRows) {
            const participantsByPlan = new Map<string, JournalPlan['participants']>()
            const rows = participantRows as unknown as {
              plan_id: string
              profile: { display_name: string; home_city: string } | { display_name: string; home_city: string }[] | null
            }[]

            for (const row of rows) {
              const profile = Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile
              const participants = participantsByPlan.get(row.plan_id) ?? []
              participants.push({ profile })
              participantsByPlan.set(row.plan_id, participants)
            }
            setPlans(visiblePlans.map(plan => ({
              ...plan,
              participants: participantsByPlan.get(plan.id) ?? [],
            })))
          }
        }
      } catch (err) {
        console.error('Journal load error:', err)
        setPlans([])
        setError(err instanceof Error ? err.message : 'Failed to load your journal.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authLoading, ownProfile?.id])

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <p className="text-sky text-xs font-bold uppercase tracking-widest mb-1">hap.</p>
        <h1 className="text-[26px] font-extrabold text-ink tracking-tight leading-tight">
          Your Journal
        </h1>
        <p className="text-muted text-xs mt-0.5">Private · only you can see this</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <p className="text-ink font-bold text-sm">Journal unavailable</p>
            <p className="text-muted text-xs max-w-[260px]">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 bg-ink text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer active:opacity-80 transition"
            >
              Try again
            </button>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sky text-5xl font-extrabold">✦</p>
            <p className="text-ink font-bold text-sm">Your journey starts here</p>
            <p className="text-muted text-xs">Plans you complete will appear here</p>
            <button
              onClick={() => navigate('/create-plan')}
              className="mt-3 bg-ink text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer active:opacity-80 transition"
            >
              Create your first plan
            </button>
          </div>
        ) : (
          plans.map(plan => {
            const participants = (plan.participants ?? [])
              .map(p => p.profile)
              .filter(Boolean) as { display_name: string; home_city: string }[]

            return (
              <button
                key={plan.id}
                onClick={() => navigate(`/plan/${plan.id}`)}
                className="w-full bg-white border border-[#E8E4DC] rounded-2xl overflow-hidden mb-3 text-left cursor-pointer active:opacity-90 transition"
              >
                {/* Photo strip */}
                <div className="h-[80px] relative overflow-hidden">
                  <img
                    src={getPlanPhoto(plan.activity_type, plan.title)}
                    alt={plan.title}
                    className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                  <div className="absolute inset-0 -z-10 bg-sand" />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }}
                  />
                  <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                    <span className="text-base">{getActivityEmoji(plan.activity_type)}</span>
                    <p className="text-white font-extrabold text-xs tracking-tight truncate">
                      {plan.title}
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div className="px-3 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-muted text-xs">
                      {plan.city} · {formatPlanTime(plan.scheduled_at)}
                    </p>
                    {plan.status === 'open' && (
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Open
                      </span>
                    )}
                  </div>

                  {participants.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {participants.slice(0, 4).map((p, i) => (
                          <div key={i} className="ring-2 ring-white rounded-[8px]">
                            <Avatar name={p.display_name} city={p.home_city} size="sm" />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted">
                        {participants.length} {participants.length === 1 ? 'person' : 'people'} met
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">Solo plan</p>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
