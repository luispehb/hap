/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Profile {
  id: string
  user_id: string
  display_name: string
  avatar_url?: string
  banner_url?: string
  home_city: string
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
  error: string | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  retryAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  error: null,
  signOut: async () => {},
  refreshProfile: async () => {},
  retryAuth: async () => {},
})

const CACHE_KEY = 'hap-profile-v1'
const SESSION_TIMEOUT_MS = 7000
const PROFILE_TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs)
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout))
  })
}

const getCache = (): Profile | null => {
  try {
    const c = localStorage.getItem(CACHE_KEY)
    return c ? JSON.parse(c) : null
  } catch {
    return null
  }
}

const saveCache = (p: Profile | null) => {
  try {
    if (p) localStorage.setItem(CACHE_KEY, JSON.stringify(p))
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    // Ignore cache write failures so auth does not get blocked by storage issues.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cached = getCache()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(cached)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchingForRef = useRef<string | null>(null)
  const retryCountRef = useRef<number>(0)
  const mountedRef = useRef(true)
  const lastEventRef = useRef('')

  const updateProfile = useCallback((p: Profile | null) => {
    setProfile(p)
    saveCache(p)
  }, [])

  const fetchProfile = useCallback(async function runFetchProfile(userId: string, isRetry = false) {
    if (!isRetry && fetchingForRef.current === userId) return
    fetchingForRef.current = userId
    setError(null)
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), PROFILE_TIMEOUT_MS)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .abortSignal(controller.signal)
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
        setError(error.message)
        setLoading(false)
      } else {
        fetchingForRef.current = null
        retryCountRef.current = 0
        updateProfile(null)
        setLoading(false)
      }
    } catch (err) {
      console.error('fetchProfile error:', err)
      if (mountedRef.current) {
        fetchingForRef.current = null
        setError(err instanceof Error ? err.message : 'Failed to load your profile')
        setLoading(false)
      }
    } finally {
      window.clearTimeout(timeout)
    }
  }, [updateProfile])

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id)
  }, [user, fetchProfile])

  const initialize = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_TIMEOUT_MS,
        'Restoring your session timed out.'
      )
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
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to restore your session')
        setLoading(false)
      }
    }
  }, [fetchProfile])

  const retryAuth = useCallback(async () => {
    fetchingForRef.current = null
    retryCountRef.current = 0
    await initialize()
  }, [initialize])

  useEffect(() => {
    mountedRef.current = true

    const failsafe = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('Auth init: failsafe triggered')
        fetchingForRef.current = null
        setError('Loading your profile is taking longer than usual.')
        setLoading(false)
      }
    }, 10000)

    initialize().finally(() => clearTimeout(failsafe))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          const eventKey = `${event}:${session?.user?.id ?? 'none'}`
          if (lastEventRef.current === eventKey) return
          lastEventRef.current = eventKey
          if (session?.user) {
            setLoading(true)
            setError(null)
            setSession(session)
            setUser(session.user)
            window.setTimeout(() => {
              if (mountedRef.current) void fetchProfile(session.user.id)
            }, 0)
          } else if (event === 'INITIAL_SESSION') {
            setSession(null)
            setUser(null)
            setLoading(false)
          }
        } else if (event === 'SIGNED_OUT') {
          lastEventRef.current = 'SIGNED_OUT'
          setSession(null)
          setUser(null)
          updateProfile(null)
          retryCountRef.current = 0
          setError(null)
          setLoading(false)
        }
      }
    )

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, initialize, updateProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, error, signOut, refreshProfile, retryAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
