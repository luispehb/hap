/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabaseReady, supabaseRestHeaders, supabaseRestUrl } from '../lib/supabase'
import type { Profile } from './useProfiles'

export function useProfile(profileId: string) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId) {
      setProfile(null)
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()

    async function load() {
      try {
        setLoading(true)
        setError(null)

        if (!supabaseReady || !supabaseRestHeaders) {
          throw new Error('Supabase is not configured')
        }

        const params = new URLSearchParams({
          select: '*',
          id: `eq.${profileId}`,
          limit: '1',
        })

        const response = await fetch(`${supabaseRestUrl}/profiles?${params.toString()}`, {
          headers: supabaseRestHeaders,
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Profile request failed (${response.status})`)
        }

        const data = await response.json() as Profile[]
        setProfile(data[0] ?? null)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setProfile(null)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    load()

    return () => controller.abort()
  }, [profileId])

  return { profile, loading, error }
}
