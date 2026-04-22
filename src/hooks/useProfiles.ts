import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
export type { Profile } from '../contexts/AuthContext'
import type { Profile } from '../contexts/AuthContext'

function computeAffinity(profileInterests: string[], viewerInterests: string[]): number {
  if (!Array.isArray(profileInterests) || !viewerInterests.length) return 0
  const matches = profileInterests.filter(i => viewerInterests.includes(i)).length
  return Math.round((matches / viewerInterests.length) * 100)
}

export function useProfiles(currentCity: string, viewerInterests: string[], excludeUserId?: string) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentCity) {
      setProfiles([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    async function fetchProfiles() {
      try {
        let query = supabase
          .from('profiles')
          .select('*')
          .eq('current_city', currentCity)
          .order('trust_score', { ascending: false })

        if (excludeUserId) {
          query = query.neq('user_id', excludeUserId)
        }

        const { data, error: err } = await query

        if (cancelled) return
        if (err) {
          setError(err.message)
          return
        }

        const sorted = ((data as Profile[]) || []).sort((a, b) =>
          computeAffinity(b.interests, viewerInterests) - computeAffinity(a.interests, viewerInterests)
        )

        setProfiles(sorted)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load profiles')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProfiles()

    return () => { cancelled = true }
  }, [currentCity, excludeUserId, viewerInterests])

  return { profiles, loading, error }
}
