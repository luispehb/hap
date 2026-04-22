import { useState, useEffect } from 'react'
import { supabaseReady, supabaseRestHeaders, supabaseRestUrl } from '../lib/supabase'

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
    if (!city) {
      setPlans([])
      setLoading(false)
      return
    }

    const controller = new AbortController()

    async function fetchPlans() {
      try {
        setLoading(true)

        if (!supabaseReady || !supabaseRestHeaders) {
          throw new Error('Supabase is not configured')
        }

        const now = new Date().toISOString()
        const params = new URLSearchParams({
          select: '*',
          city: `eq.${city}`,
          status: 'eq.open',
          scheduled_at: `gt.${now}`,
          order: 'scheduled_at.asc',
        })

        const response = await fetch(`${supabaseRestUrl}/plans?${params.toString()}`, {
          headers: supabaseRestHeaders,
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Plans request failed (${response.status})`)
        }

        const data = await response.json() as Plan[]
        setPlans(data || [])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setPlans([])
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()

    return () => controller.abort()
  }, [city])

  return { plans, loading }
}
