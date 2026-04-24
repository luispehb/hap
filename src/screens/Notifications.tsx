import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { getProfilePhoto } from '../lib/photos'

interface ConnectionRequest {
  id: string
  user_a_id: string
  user_b_id: string
  created_at: string
}

interface PlanInvite {
  id: string
  plan_id: string
  plan_title: string
  plan_city: string
  scheduled_at: string
  activity_type: string
}

interface ProfileRow {
  id: string
  display_name: string
  origin_city: string
  current_city: string
  is_local: boolean
  trust_score: number
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function Notifications() {
  const navigate = useNavigate()
  const { profile: ownProfile } = useAuth()

  const [requests, setRequests] = useState<ConnectionRequest[]>([])
  const [requestProfiles, setRequestProfiles] = useState<Record<string, ProfileRow>>({})
  const [planInvites, setPlanInvites] = useState<PlanInvite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ownProfile?.id) return
    async function load() {
      const { data: connData } = await supabase
        .from('connections')
        .select('id, user_a_id, user_b_id, created_at')
        .eq('user_b_id', ownProfile!.id)
        .eq('user_a_wants_connect', true)
        .eq('user_b_wants_connect', false)
        .order('created_at', { ascending: false })

      const reqs = connData ?? []
      setRequests(reqs)

      if (reqs.length > 0) {
        const ids = reqs.map((r: ConnectionRequest) => r.user_a_id)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, origin_city, current_city, is_local, trust_score')
          .in('id', ids)
        if (profileData) {
          const map: Record<string, ProfileRow> = {}
          for (const p of profileData) map[p.id] = p
          setRequestProfiles(map)
        }
      }

      const { data: planData } = await supabase
        .from('plans')
        .select('id, title, city, scheduled_at, activity_type')
        .eq('city', ownProfile!.current_city)
        .gt('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5)

      if (planData) {
        const { data: joined } = await supabase
          .from('plan_participants')
          .select('plan_id')
          .eq('user_id', ownProfile!.id)

        const joinedIds = new Set((joined ?? []).map((j: { plan_id: string }) => j.plan_id))

        setPlanInvites(
          planData
            .filter((p: { id: string }) => !joinedIds.has(p.id))
            .map((p: { id: string; title: string; city: string; scheduled_at: string; activity_type: string }) => ({
              id: p.id,
              plan_id: p.id,
              plan_title: p.title,
              plan_city: p.city,
              scheduled_at: p.scheduled_at,
              activity_type: p.activity_type,
            }))
        )
      }

      setLoading(false)
    }
    load()
  }, [ownProfile?.id])

  const handleAccept = async (conn: ConnectionRequest) => {
    await supabase.from('connections').update({ user_b_wants_connect: true }).eq('id', conn.id)
    setRequests(prev => prev.filter(r => r.id !== conn.id))
  }

  const handleDecline = async (conn: ConnectionRequest) => {
    await supabase.from('connections').delete().eq('id', conn.id)
    setRequests(prev => prev.filter(r => r.id !== conn.id))
  }

  const totalCount = requests.length + planInvites.length
  const isEmpty = totalCount === 0

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-cream border-b border-[#E8E4DC] px-4 pt-14 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 bg-sand rounded-xl flex items-center justify-center cursor-pointer active:opacity-70"
        >
          <ChevronLeft size={18} className="text-ink" />
        </button>
        <div className="flex-1">
          <p className="text-ink font-extrabold text-lg tracking-tight">Notifications</p>
        </div>
        {totalCount > 0 && (
          <span className="bg-sky text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
            {totalCount}
          </span>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-6 pb-24">
        {requests.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
              Connection requests
            </p>
            <div className="flex flex-col gap-3">
              {requests.map(req => {
                const other = requestProfiles[req.user_a_id]
                if (!other) return null
                return (
                  <div key={req.id} className="bg-white border border-[#E8E4DC] rounded-2xl p-4">
                    <div
                      className="flex items-center gap-3 mb-3 cursor-pointer"
                      onClick={() => navigate(`/profile/${other.id}`)}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={getProfilePhoto(other.display_name, other.origin_city)}
                          alt={other.display_name}
                          className="w-full h-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-bold text-sm">{other.display_name}</p>
                        <p className="text-muted text-xs">
                          {other.origin_city} · {other.is_local ? 'Local' : other.current_city}
                        </p>
                        <p className="text-muted text-[10px] mt-0.5">{timeAgo(req.created_at)}</p>
                      </div>
                      <div className="bg-[#F0FFD0] px-2 py-1 rounded-lg">
                        <p className="text-[#3a6010] text-[10px] font-bold">{other.trust_score}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="md" fullWidth onClick={() => handleDecline(req)}>
                        Decline
                      </Button>
                      <Button variant="cta" size="md" fullWidth onClick={() => handleAccept(req)}>
                        Accept
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {planInvites.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
              Plans in {ownProfile?.current_city}
            </p>
            <div className="flex flex-col gap-3">
              {planInvites.map(plan => {
                const date = new Date(plan.scheduled_at)
                const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                return (
                  <button
                    key={plan.id}
                    onClick={() => navigate(`/plan/${plan.plan_id}`)}
                    className="bg-white border border-[#E8E4DC] rounded-2xl p-4 text-left w-full active:bg-sand transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-bold text-sm leading-tight">{plan.plan_title}</p>
                        <p className="text-muted text-xs mt-1">{dateStr} · {timeStr}</p>
                      </div>
                      <span className="text-[10px] font-bold text-sky bg-[#EBF4FF] px-2.5 py-1 rounded-full ml-3 whitespace-nowrap">
                        View →
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
       </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-4xl">✦</p>
            <p className="text-ink font-bold text-sm">You're all caught up</p>
            <p className="text-muted text-xs text-center">Connection requests and plans will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
