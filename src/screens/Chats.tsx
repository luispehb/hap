import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getActivityEmoji } from '../hooks/usePlans'
import { formatPlanTime } from '../lib/utils'
import { getProfilePhoto } from '../lib/photos'
import { BottomNav } from '../components/ui/BottomNav'

interface PlanRow {
  id: string
  title: string
  activity_type: string
  city: string
  scheduled_at: string
}

interface DirectThread {
  profileId: string
  display_name: string
  home_city: string
  lastMessage: string
  lastAt: string
}

export function Chats() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [directs, setDirects] = useState<DirectThread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    async function load() {
      // Group chats — plans where user participates
      const { data: participations } = await supabase
        .from('plan_participants')
        .select('plan_id')
        .eq('user_id', profile!.id)

      if (participations && participations.length > 0) {
        const planIds = participations.map((p: { plan_id: string }) => p.plan_id)
        const { data: planData } = await supabase
          .from('plans')
          .select('id, title, activity_type, city, scheduled_at')
          .in('id', planIds)
          .order('scheduled_at', { ascending: false })
        setPlans(planData ?? [])
      }

      // Direct chats — connections with messages
      const { data: connections } = await supabase
        .from('connections')
        .select('user_a_id, user_b_id')
        .or(`user_a_id.eq.${profile!.id},user_b_id.eq.${profile!.id}`)
        .eq('user_a_wants_connect', true)
        .eq('user_b_wants_connect', true)

      if (connections && connections.length > 0) {
        const otherIds = connections.map((c: { user_a_id: string; user_b_id: string }) =>
          c.user_a_id === profile!.id ? c.user_b_id : c.user_a_id
        )

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, home_city')
          .in('id', otherIds)

        // Get last message for each thread
        const threads: DirectThread[] = []
        for (const other of profileData ?? []) {
          const { data: msgs } = await supabase
            .from('direct_messages')
            .select('content, created_at')
            .or(
              `and(sender_id.eq.${profile!.id},receiver_id.eq.${other.id}),and(sender_id.eq.${other.id},receiver_id.eq.${profile!.id})`
            )
            .order('created_at', { ascending: false })
            .limit(1)

          threads.push({
            profileId: other.id,
            display_name: other.display_name,
            home_city: other.home_city,
            lastMessage: msgs?.[0]?.content ?? 'Start a conversation',
            lastAt: msgs?.[0]?.created_at ?? '',
          })
        }
        setDirects(threads)
      }

      setLoading(false)
    }
    load()
  }, [profile?.id])

  const isEmpty = plans.length === 0 && directs.length === 0

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="px-4 pt-12 pb-4 border-b border-[#E8E4DC]">
        <h1 className="text-[22px] font-extrabold text-ink tracking-tight">Chats</h1>
        <p className="text-muted text-xs mt-0.5">Groups and direct messages</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-sand rounded-2xl flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-ink font-extrabold text-base tracking-tight mb-1">No chats yet</p>
            <p className="text-muted text-sm leading-relaxed">Join a plan to get a group chat, or connect with someone to message them directly.</p>
            <button
              onClick={() => navigate('/feed')}
              className="mt-5 bg-ink text-white text-xs font-bold px-6 py-3 rounded-xl active:opacity-80 transition cursor-pointer"
            >
              Explore plans
            </button>
          </div>
        ) : (
          <>
            {/* Group chats */}
            {plans.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest px-4 pt-4 pb-2">
                  Group chats
                </p>
                <div className="flex flex-col divide-y divide-[#E8E4DC]">
                  {plans.map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => navigate(`/chat/${plan.id}`)}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-sand transition cursor-pointer text-left w-full"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-sand flex items-center justify-center flex-shrink-0 text-xl">
                        {getActivityEmoji(plan.activity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-bold text-sm truncate">{plan.title}</p>
                        <p className="text-muted text-xs mt-0.5">{plan.city} · {formatPlanTime(plan.scheduled_at)}</p>
                      </div>
                      <MessageCircle size={15} className="text-muted flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Direct chats */}
            {directs.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest px-4 pt-4 pb-2">
                  Direct messages
                </p>
                <div className="flex flex-col divide-y divide-[#E8E4DC]">
                  {directs.map(thread => (
                    <button
                      key={thread.profileId}
                      onClick={() => navigate(`/direct/${thread.profileId}`)}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-sand transition cursor-pointer text-left w-full"
                    >
                      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={getProfilePhoto(thread.display_name, thread.home_city)}
                          alt={thread.display_name}
                          className="w-full h-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-bold text-sm">{thread.display_name}</p>
                        <p className="text-muted text-xs mt-0.5 truncate">{thread.lastMessage}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav active="chats" />
    </div>
  )
}
