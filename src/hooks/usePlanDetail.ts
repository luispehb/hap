import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from './useProfiles'

export interface PlanWithCreator {
  id: string
  creator_id: string
  title: string
  activity_type: string
  city: string
  location_name: string | null
  scheduled_at: string
  max_participants: number
  description: string | null
  status: string
  is_hap_day: boolean
  creator: Profile | null
}

export interface PlanParticipant {
  id: string
  plan_id: string
  user_id: string
  status: string
  profile: Profile | null
}

export function usePlanDetail(planId: string) {
  const [plan, setPlan] = useState<PlanWithCreator | null>(null)
  const [participants, setParticipants] = useState<PlanParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!planId) return
    async function load() {
      setLoading(true)

      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('*, creator:profiles(*)')
        .eq('id', planId)
        .single()

      if (planError) {
        setError(planError.message)
        setLoading(false)
        return
      }
      setPlan(planData as PlanWithCreator)

      const { data: participantData } = await supabase
        .from('plan_participants')
        .select('*, profile:profiles(*)')
        .eq('plan_id', planId)
        .eq('status', 'confirmed')

      setParticipants((participantData ?? []) as PlanParticipant[])
      setLoading(false)
    }
    load()
  }, [planId])

  return { plan, participants, loading, error }
}
