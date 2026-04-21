import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from './useProfiles'

export function useProfile(profileId: string) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId) return
    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (error) setError(error.message)
      else setProfile(data)
      setLoading(false)
    }
    load()
  }, [profileId])

  return { profile, loading, error }
}
