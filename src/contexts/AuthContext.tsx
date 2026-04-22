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
  const cached = getCache()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(cached)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!cached)

  const fetchingForRef = useRef<string | null>(null)
  const retryCountRef = useRef<number>(0)
  const mountedRef = useRef(true)

  const updateProfile = useCallback((p: Profile | null) => {
    setProfile(p)
    saveCache(p)
  }, [])

  const fetchProfile = useCallback(async (userId: string, isRetry = false) => {
    if (!isRetry && fetchingForRef.current === userId) return
    fetchingForRef.current = userId
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (!mountedRef.current) return

      if (data) {
        retryCountRef.current = 0
        updateProfile(data as Profile)
        fetchingForRef.current = null
        setLoading(false)
      } else if (error) {
        console.error('fetchProfile DB error:', error)
        fetchingForRef.current = null
        setLoading(false)
      } else {
        fetchingForRef.current = null
        if (retryCountRef.current < 4) {
          retryCountRef.current++
          const delay = retryCountRef.current * 3000
          console.log(`Profile not found, retry ${retryCountRef.current}/4 in ${delay}ms`)
          setTimeout(() => {
            if (mountedRef.current) fetchProfile(userId, true)
          }, delay)
        } else {
          retryCountRef.current = 0
          setLoading(false)
        }
      }
    } catch (err) {
      console.error('fetchProfile error:', err)
      if (mountedRef.current) {
        fetchingForRef.current = null
        setLoading(false)
      }
    }
  }, [updateProfile])

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id)
  }, [user, fetchProfile])

  useEffect(() => {
    mountedRef.current = true

    const failsafe = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('Auth init: 60s failsafe triggered')
        fetchingForRef.current = null
        // Solo desbloquear si no hay cache — si hay cache el usuario ya ve la app
        if (!getCache()) setLoading(false)
      }
    }, 60000)

    async function initialize() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mountedRef.current) return
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Auth init error:', err)
        if (mountedRef.current) setLoading(false)
      } finally {
        clearTimeout(failsafe)
      }
    }

    initialize()

    const lastEventRef = { current: '' }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return

        if (event === 'SIGNED_IN') {
          if (lastEventRef.current === 'SIGNED_IN') return
          lastEventRef.current = 'SIGNED_IN'
          if (session?.user) {
            setSession(session)
            setUser(session.user)
            await new Promise(r => setTimeout(r, 500))
            if (mountedRef.current) await fetchProfile(session.user.id)
          }
        } else if (event === 'SIGNED_OUT') {
          lastEventRef.current = 'SIGNED_OUT'
          setSession(null)
          setUser(null)
          updateProfile(null)
          retryCountRef.current = 0
          setLoading(false)
        }
      }
    )

    return () => {
      mountedRef.current = false
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
