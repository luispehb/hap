import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface Profile {
  id: string
  display_name: string
  origin_city: string
  current_city: string
  trip_start_date: string | null
  trip_end_date: string | null
  is_local: boolean
  bio_question: string
  interests: string[]
  trust_score: number
  is_verified: boolean
  membership_status: string
}

function computeAffinity(profileInterests: string[], viewerInterests: string[]): number {
  if (!viewerInterests.length) return 0
  const matches = profileInterests.filter(i => viewerInterests.includes(i)).length
  return Math.round((matches / viewerInterests.length) * 100)
}

export function useProfiles(currentCity: string, viewerInterests: string[]) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfiles() {
      console.log('Fetching profiles for city:', currentCity)
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('current_city', currentCity)
        .eq('membership_status', 'active')
        .order('trust_score', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        const sorted = (data || []).sort((a, b) => {
          const affinityA = computeAffinity(a.interests, viewerInterests)
          const affinityB = computeAffinity(b.interests, viewerInterests)
          return affinityB - affinityA
        })
        setProfiles(sorted)
      }
      setLoading(false)
    }
    fetchProfiles()
  }, [currentCity])

  return { profiles, loading, error }
}
