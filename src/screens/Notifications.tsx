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
  connected_at?: string
  created_at?: string
}

interface PlanInvite {
  id: string
  plan_id: string
  plan_title: string
  plan_city: string
  scheduled_at: string
  activity_type: string
}

interface DirectChatNotification {
  profile_id: string
  display_name: string
  home_city: string
  last_message: string
  last_at: string
  unread_count: number
}

interface GroupChatNotification {
  plan_id: string
  plan_title: string
  plan_city: string
  last_message: string
  last_at: string
  unread_count: number
}

interface ProfileRow {
  id: string
  display_name: string
  home_city: string
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
  const { profile: ownProfile, loading: authLoading } = useAuth()

  const [requests, setRequests] = useState<ConnectionRequest[]>([])
  const [requestProfiles, setRequestProfiles] = useState<Record<string, ProfileRow>>({})
  const [planInvites, setPlanInvites] = useState<PlanInvite[]>([])
  const [directChats, setDirectChats] = useState<DirectChatNotification[]>([])
  const [groupChats, setGroupChats] = useState<GroupChatNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!ownProfile?.id) {
      setTimeout(() => {
        setError('We could not find your profile.')
        setLoading(false)
      }, 0)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const { data: connData, error: connError } = await supabase
          .from('connections')
          .select('*')
          .eq('user_b_id', ownProfile!.id)
          .eq('user_a_wants_connect', true)
          .eq('user_b_wants_connect', false)

        if (connError) throw connError

        const reqs = ((connData ?? []) as ConnectionRequest[]).sort((a, b) => {
          const aTime = new Date(a.connected_at ?? a.created_at ?? 0).getTime()
          const bTime = new Date(b.connected_at ?? b.created_at ?? 0).getTime()
          return bTime - aTime
        })
        setRequests(reqs)

        if (reqs.length > 0) {
          const ids = reqs.map((r: ConnectionRequest) => r.user_a_id)
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name, home_city, current_city, is_local, trust_score')
            .in('id', ids)

          if (profileError) throw profileError

          const map: Record<string, ProfileRow> = {}
          for (const p of profileData ?? []) map[p.id] = p
          setRequestProfiles(map)
        } else {
          setRequestProfiles({})
        }

        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('id, title, city, scheduled_at, activity_type')
          .eq('city', ownProfile!.current_city)
          .gt('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(5)

        if (planError) throw planError

        const { data: joined, error: joinedError } = await supabase
          .from('plan_participants')
          .select('plan_id')
          .eq('user_id', ownProfile!.id)

        if (joinedError) throw joinedError

        const joinedIds = new Set((joined ?? []).map((j: { plan_id: string }) => j.plan_id))

        setPlanInvites(
          ((planData ?? []) as { id: string; title: string; city: string; scheduled_at: string; activity_type: string }[])
            .filter(p => !joinedIds.has(p.id))
            .map(p => ({
              id: p.id,
              plan_id: p.id,
              plan_title: p.title,
              plan_city: p.city,
              scheduled_at: p.scheduled_at,
              activity_type: p.activity_type,
            }))
        )

        const { data: directData, error: directError } = await supabase
          .from('direct_messages')
          .select('id, sender_id, content, created_at')
          .eq('receiver_id', ownProfile!.id)
          .is('read_at', null)
          .order('created_at', { ascending: false })

        if (directError) throw directError

        const unreadDirectRows = (directData ?? []) as { sender_id: string; content: string; created_at: string }[]
        if (unreadDirectRows.length > 0) {
          const senderIds = [...new Set(unreadDirectRows.map(row => row.sender_id))]
          const { data: senders, error: sendersError } = await supabase
            .from('profiles')
            .select('id, display_name, home_city')
            .in('id', senderIds)

          if (sendersError) throw sendersError

          const sendersById = Object.fromEntries((senders ?? []).map(sender => [sender.id, sender]))
          setDirectChats(senderIds.map(senderId => {
            const rows = unreadDirectRows.filter(row => row.sender_id === senderId)
            const latest = rows[0]
            const sender = sendersById[senderId]
            return {
              profile_id: senderId,
              display_name: sender?.display_name ?? 'Someone',
              home_city: sender?.home_city ?? '',
              last_message: latest.content,
              last_at: latest.created_at,
              unread_count: rows.length,
            }
          }))
        } else {
          setDirectChats([])
        }

        if (joinedIds.size > 0) {
          const { data: groupData, error: groupError } = await supabase
            .from('messages')
            .select('id, plan_id, content, sent_at')
            .in('plan_id', [...joinedIds])
            .neq('sender_id', ownProfile!.id)
            .is('read_at', null)
            .order('sent_at', { ascending: false })

          if (groupError) throw groupError

          const unreadGroupRows = (groupData ?? []) as { plan_id: string; content: string; sent_at: string }[]
          if (unreadGroupRows.length > 0) {
            const unreadPlanIds = [...new Set(unreadGroupRows.map(row => row.plan_id))]
            const { data: unreadPlans, error: unreadPlansError } = await supabase
              .from('plans')
              .select('id, title, city')
              .in('id', unreadPlanIds)

            if (unreadPlansError) throw unreadPlansError

            const plansById = Object.fromEntries((unreadPlans ?? []).map(plan => [plan.id, plan]))
            setGroupChats(unreadPlanIds.map(planId => {
              const rows = unreadGroupRows.filter(row => row.plan_id === planId)
              const latest = rows[0]
              const plan = plansById[planId]
              return {
                plan_id: planId,
                plan_title: plan?.title ?? 'Group chat',
                plan_city: plan?.city ?? '',
                last_message: latest.content,
                last_at: latest.sent_at,
                unread_count: rows.length,
              }
            }))
          } else {
            setGroupChats([])
          }
        } else {
          setGroupChats([])
        }
      } catch (err) {
        console.error('Notifications load error:', err)
        setRequests([])
        setRequestProfiles({})
        setPlanInvites([])
        setDirectChats([])
        setGroupChats([])
        setError(err instanceof Error ? err.message : 'Failed to load notifications.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authLoading, ownProfile?.current_city, ownProfile?.id])

  const handleAccept = async (conn: ConnectionRequest) => {
    await supabase.from('connections').update({ user_b_wants_connect: true }).eq('id', conn.id)
    setRequests(prev => prev.filter(r => r.id !== conn.id))
  }

  const handleDecline = async (conn: ConnectionRequest) => {
    await supabase.from('connections').delete().eq('id', conn.id)
    setRequests(prev => prev.filter(r => r.id !== conn.id))
  }

  const unreadChatCount = directChats.reduce((sum, chat) => sum + chat.unread_count, 0) + groupChats.reduce((sum, chat) => sum + chat.unread_count, 0)
  const totalCount = requests.length + planInvites.length + unreadChatCount
  const isEmpty = totalCount === 0

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="bg-cream border-b border-[#E8E4DC] px-4 pt-14 pb-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 bg-sand rounded-xl flex items-center justify-center cursor-pointer active:opacity-70"
          >
            <ChevronLeft size={18} className="text-ink" />
          </button>
          <p className="text-ink font-extrabold text-lg tracking-tight">Notifications</p>
        </div>
        <div className="px-4 py-20 text-center">
          <p className="text-ink font-bold text-sm">Notifications unavailable</p>
          <p className="text-muted text-xs mt-2">{error}</p>
        </div>
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
        {(directChats.length > 0 || groupChats.length > 0) && (
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
              Unread chats
            </p>
            <div className="flex flex-col gap-3">
              {directChats.map(chat => (
                <button
                  key={chat.profile_id}
                  onClick={() => navigate(`/direct/${chat.profile_id}`)}
                  className="bg-white border border-[#E8E4DC] rounded-2xl p-4 text-left w-full active:bg-sand transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={getProfilePhoto(chat.display_name, chat.home_city)}
                        alt={chat.display_name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-ink font-bold text-sm truncate">{chat.display_name}</p>
                        <span className="bg-sky text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {chat.unread_count}
                        </span>
                      </div>
                      <p className="text-muted text-xs truncate mt-0.5">{chat.last_message}</p>
                      <p className="text-muted text-[10px] mt-0.5">{timeAgo(chat.last_at)}</p>
                    </div>
                  </div>
                </button>
              ))}

              {groupChats.map(chat => (
                <button
                  key={chat.plan_id}
                  onClick={() => navigate(`/chat/${chat.plan_id}`)}
                  className="bg-white border border-[#E8E4DC] rounded-2xl p-4 text-left w-full active:bg-sand transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-ink font-bold text-sm truncate">{chat.plan_title}</p>
                        <span className="bg-sky text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {chat.unread_count}
                        </span>
                      </div>
                      <p className="text-muted text-xs truncate mt-0.5">{chat.last_message}</p>
                      <p className="text-muted text-[10px] mt-0.5">
                        {chat.plan_city} · {timeAgo(chat.last_at)}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-sky bg-[#EBF4FF] px-2.5 py-1 rounded-full whitespace-nowrap">
                      Group
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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
                          src={getProfilePhoto(other.display_name, other.home_city)}
                          alt={other.display_name}
                          className="w-full h-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-bold text-sm">{other.display_name}</p>
                        <p className="text-muted text-xs">
                          {other.home_city} · {other.is_local ? 'Local' : other.current_city}
                        </p>
                        <p className="text-muted text-[10px] mt-0.5">
                          {timeAgo(req.connected_at ?? req.created_at ?? new Date().toISOString())}
                        </p>
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
