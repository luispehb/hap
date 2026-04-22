import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
export type { Profile } from '../contexts/AuthContext'
import type { Profile } from '../contexts/AuthContext'

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
    if (!currentCity) { setLoading(false); return }

    async function fetchProfiles() {
      setError(null)
      if (profiles.length === 0) setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('current_city', currentCity)
        .order('trust_score', { ascending: false })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const sorted = (data || []).sort((a, b) => {
        const affinityA = computeAffinity(a.interests, viewerInterests)
        const affinityB = computeAffinity(b.interests, viewerInterests)
        return affinityB - affinityA
      })
      setProfiles(sorted)
      setLoading(false)
    }

    fetchProfiles()
  }, [currentCity])

  // Re-sort when interests change without re-fetching
  useEffect(() => {
    if (profiles.length === 0) return
    const sorted = [...profiles].sort((a, b) => {
      const affinityA = computeAffinity(a.interests, viewerInterests)
      const affinityB = computeAffinity(b.interests, viewerInterests)
      return affinityB - affinityA
    })
    setProfiles(sorted)
  }, [viewerInterests.join(',')])

  return { profiles, loading, error }
}
