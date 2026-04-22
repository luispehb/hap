import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface Plan {
  id: string
  creator_id: string
  title: string
  activity_type: string
  city: string
  location_name: string
  scheduled_at: string
  max_participants: number
  description: string
  status: string
  is_hap_day: boolean
}

const ACTIVITY_EMOJIS: Record<string, string> = {
  food: '🍽️',
  culture: '🏛️',
  outdoor: '🏔️',
  cowork: '💻',
  nightlife: '🌙',
  other: '✦',
}

export function getActivityEmoji(type: string): string {
  return ACTIVITY_EMOJIS[type] || '✦'
}

export function usePlans(city: string) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPlans() {
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('city', city)
        .eq('status', 'open')
        .gt('scheduled_at', now)
        .order('scheduled_at', { ascending: true })

      setPlans(data || [])
      setLoading(false)
    }
    fetchPlans()
  }, [city])

  return { plans, loading }
}
