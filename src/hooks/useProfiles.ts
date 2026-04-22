import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
export type { Profile } from '../contexts/AuthContext'
import type { Profile } from '../contexts/AuthContext'

function computeAffinity(profileInterests: string[], viewerInterests: string[]): number {
  if (!viewerInterests.length) return 0
  const matches = profileInterests.filter(i => viewerInterests.includes(i)).length
  return Math.round((matches / viewerInterests.length) * 100)
}

export function useProfiles(currentCity: string, viewerInterests: string[], excludeUserId?: string) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentCity) return
    let cancelled = false
    setLoading(true)
    setError(null)

    console.log('[useProfiles] querying city:', JSON.stringify(currentCity), 'excludeUserId:', excludeUserId)

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('current_city', currentCity)
      .order('trust_score', { ascending: false })

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId)
    }

    query.then(({ data, error: err }) => {
      if (cancelled) return
      console.log('[useProfiles] result:', data?.length ?? 0, 'profiles, error:', err?.message)
      if (err) { setError(err.message); setLoading(false); return }
      const sorted = (data as Profile[] || []).sort((a, b) =>
        computeAffinity(b.interests, viewerInterests) - computeAffinity(a.interests, viewerInterests)
      )
      setProfiles(sorted)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [currentCity, excludeUserId])

  return { profiles, loading, error }
}
