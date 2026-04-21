import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Profile {
  id: string
  user_id: string
  display_name: string
  avatar_url?: string
  origin_city: string
  current_city: string
  trip_start_date: string | null
  trip_end_date: string | null
  is_local: boolean
  bio_question: string
  interests: string[]
  social_links: Record<string, string>
  trust_score: number
  is_verified: boolean
  is_premium: boolean
  membership_status: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log('fetchProfile called for:', userId)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      )
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any
      console.log('fetchProfile result:', { data: !!data, error })
      if (data) {
        setProfile(data as Profile)
      }
    } catch (err) {
      console.error('fetchProfile error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    let mounted = true

    async function initialize() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Auth init error:', err)
        if (mounted) setLoading(false)
      }
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        console.log('Auth state change:', event, !!session)
        if (event === 'SIGNED_IN' && session?.user) {
          setSession(session)
          setUser(session.user)
          // Small delay to ensure session is fully set before querying
          await new Promise(resolve => setTimeout(resolve, 500))
          if (mounted) {
            await fetchProfile(session.user.id)
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setSession(session)
          setUser(session.user)
          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
        } else if (event === 'INITIAL_SESSION') {
          // Handled by getSession() in initialize()
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
