import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isConfigured =
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey.startsWith('eyJ')

const authOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'hap-auth-v1',
    storage: window.localStorage,
  },
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, authOptions)
  : createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.placeholder', authOptions)

export const supabaseReady = Boolean(isConfigured)
export const supabaseRestUrl = isConfigured ? `${supabaseUrl}/rest/v1` : ''
export const supabaseRestHeaders = isConfigured
  ? {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    }
  : null
