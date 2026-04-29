/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabaseReady, supabaseRestHeaders, supabaseRestUrl } from '../lib/supabase'
export type { Profile } from '../contexts/AuthContext'
import type { Profile } from '../contexts/AuthContext'

function computeAffinity(profileInterests: string[], viewerInterests: string[]): number {
  if (!Array.isArray(profileInterests) || !viewerInterests.length) return 0
  const matches = profileInterests.filter(i => viewerInterests.includes(i)).length
  return Math.round((matches / viewerInterests.length) * 100)
}

function getTodayDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    async function fetchProfiles() {
      try {
        if (!supabaseReady || !supabaseRestHeaders) {
          throw new Error('Supabase is not configured')
        }

        const params = new URLSearchParams({
          select: '*',
          current_city: `eq.${currentCity}`,
          or: `(is_local.eq.true,trip_end_date.is.null,trip_end_date.gte.${getTodayDateString()})`,
          order: 'trust_score.desc',
        })

        if (excludeUserId) {
          params.set('user_id', `neq.${excludeUserId}`)
        }

        const response = await fetch(`${supabaseRestUrl}/profiles?${params.toString()}`, {
          headers: supabaseRestHeaders,
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Profiles request failed (${response.status})`)
        }

        const data = await response.json() as Profile[]

        if (cancelled) return

        const sorted = (data || []).sort((a, b) =>
          computeAffinity(b.interests, viewerInterests) - computeAffinity(a.interests, viewerInterests)
        )

        setProfiles(sorted)
      } catch (err) {
        if (cancelled) return
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load profiles')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProfiles()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [currentCity, excludeUserId, viewerInterests])

  return { profiles, loading, error }
}
