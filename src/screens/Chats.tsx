import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getActivityEmoji } from '../hooks/usePlans'
import { formatPlanTime } from '../lib/utils'
import { BottomNav } from '../components/ui/BottomNav'

interface PlanRow {
  id: string
  title: string
  activity_type: string
  city: string
  scheduled_at: string
  status: string
}

export function Chats() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    async function load() {
      const { data: participations } = await supabase
        .from('plan_participants')
        .select('plan_id')
        .eq('user_id', profile!.id)

      if (!participations || participations.length === 0) {
        setLoading(false)
        return
      }

      const planIds = participations.map((p: { plan_id: string }) => p.plan_id)

      const { data: planData } = await supabase
        .from('plans')
        .select('id, title, activity_type, city, scheduled_at, status')
        .in('id', planIds)
        .order('scheduled_at', { ascending: false })

      setPlans(planData ?? [])
      setLoading(false)
    }
    load()
  }, [profile?.id])

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="px-4 pt-12 pb-4 border-b border-[#E8E4DC]">
        <h1 className="text-[22px] font-extrabold text-ink tracking-tight">Chats</h1>
        <p className="text-muted text-xs mt-0.5">Your plan group chats</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-3xl">💬</p>
            <p className="text-ink font-bold text-sm">No chats yet</p>
            <p className="text-muted text-xs text-center">Join a plan to start chatting</p>
            <button
              onClick={() => navigate('/feed')}
              className="mt-2 bg-ink text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer active:opacity-80 transition"
            >
              Explore plans
            </button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[#E8E4DC]">
            {plans.map(plan => (
              <button
                key={plan.id}
                onClick={() => navigate(`/chat/${plan.id}`)}
                className="flex items-center gap-3 px-4 py-4 active:bg-sand transition cursor-pointer text-left w-full"
              >
                <div className="w-12 h-12 rounded-2xl bg-sand flex items-center justify-center flex-shrink-0 text-2xl">
                  {getActivityEmoji(plan.activity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-ink font-bold text-sm truncate">{plan.title}</p>
                  <p className="text-muted text-xs mt-0.5">{plan.city} · {formatPlanTime(plan.scheduled_at)}</p>
                </div>
                <MessageCircle size={16} className="text-muted flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="chats" />
    </div>
  )
}
