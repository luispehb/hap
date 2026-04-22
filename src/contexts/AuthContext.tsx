import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
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

const CACHE_KEY = 'hap-profile-v1'

const getCache = (): Profile | null => {
  try {
    const c = localStorage.getItem(CACHE_KEY)
    return c ? JSON.parse(c) : null
  } catch { return null }
}

const saveCache = (p: Profile | null) => {
  try {
    if (p) localStorage.setItem(CACHE_KEY, JSON.stringify(p))
    else localStorage.removeItem(CACHE_KEY)
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(getCache())
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!getCache())

  const fetchingForRef = useRef<string | null>(null)
  // Track how many times we've retried for a user with no profile found
  const retryCountRef = useRef<number>(0)

  const updateProfile = useCallback((p: Profile | null) => {
    setProfile(p)
    saveCache(p)
  }, [])

  const fetchProfile = useCallback(async (userId: string, isRetry = false) => {
    if (!isRetry && fetchingForRef.current === userId) {
      console.log('fetchProfile already in progress for:', userId)
      return
    }
    fetchingForRef.current = userId
    try {
      console.log('fetchProfile called for:', userId, isRetry ? '(retry)' : '')
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      console.log('fetchProfile result:', { hasData: !!data, error })

      if (data) {
        // Profile found — save it and mark loading done
        retryCountRef.current = 0
        updateProfile(data as Profile)
        fetchingForRef.current = null
        setLoading(false)
      } else if (error) {
        // Real DB error — don't redirect to onboarding, just unblock
        console.error('fetchProfile DB error:', error)
        fetchingForRef.current = null
        setLoading(false)
      } else {
        // data=null, no error — profile genuinely doesn't exist OR Supabase
        // cold-start returned empty. Retry up to 3 times with backoff before
        // concluding this is a new user and sending to onboarding.
        fetchingForRef.current = null
        if (retryCountRef.current < 3) {
          retryCountRef.current++
          const delay = retryCountRef.current * 2000 // 2s, 4s, 6s
          console.log(`Profile not found, retry ${retryCountRef.current}/3 in ${delay}ms`)
          setTimeout(() => fetchProfile(userId, true), delay)
          // Keep loading=true during retries so UI stays on spinner
        } else {
          // After 3 retries still nothing → genuinely new user → onboarding
          console.log('Profile not found after retries, sending to onboarding')
          retryCountRef.current = 0
          setLoading(false)
        }
      }
    } catch (err) {
      console.error('fetchProfile error:', err)
      fetchingForRef.current = null
      setLoading(false)
    }
  }, [updateProfile])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    let mounted = true

    // Absolute last resort: if Supabase never responds in 45s, unblock the UI.
    const failsafe = setTimeout(() => {
      if (mounted) {
        console.warn('Auth init: 45s failsafe triggered')
        fetchingForRef.current = null
        setLoading(false)
      }
    }, 45000)

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
      } finally {
        clearTimeout(failsafe)
      }
    }

    initialize()

    const lastEventRef = { current: '' }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        console.log('Auth state change:', event, !!session)

        if (event === 'SIGNED_IN') {
          if (lastEventRef.current === 'SIGNED_IN') {
            console.log('Ignoring duplicate SIGNED_IN')
            return
          }
          lastEventRef.current = 'SIGNED_IN'
          if (session?.user) {
            setLoading(true)
            setSession(session)
            setUser(session.user)
            await new Promise(r => setTimeout(r, 500))
            if (mounted) await fetchProfile(session.user.id)
          }
        } else if (event === 'SIGNED_OUT') {
          lastEventRef.current = 'SIGNED_OUT'
          setSession(null)
          setUser(null)
          updateProfile(null)
          retryCountRef.current = 0
          setLoading(false)
        } else if (event === 'INITIAL_SESSION') {
          lastEventRef.current = 'INITIAL_SESSION'
          // Already handled by initialize()
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, updateProfile])

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