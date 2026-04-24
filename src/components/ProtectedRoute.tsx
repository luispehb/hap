import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoadingScreen } from './LoadingScreen'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading, error, retryAuth } = useAuth()

  if (loading && profile) return <>{children}</>
  if (loading) return <LoadingScreen message={error ?? 'Taking longer than usual...'} onRetry={retryAuth} />
  if (!user) return <Navigate to="/" replace />
  if (user && !profile) return <LoadingScreen message={error ?? 'Loading your profile...'} onRetry={retryAuth} />

  return <>{children}</>
}
