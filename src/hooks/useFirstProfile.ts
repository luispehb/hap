import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from './useProfiles'

export function useFirstProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('membership_status', 'active')
        .limit(1)
        .single()

      if (error) setError(error.message)
      else setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  return { profile, loading, error }
}
