import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface LoadingScreenProps {
  message?: string
  onRetry?: () => void
}

export function LoadingScreen({ message = 'Taking longer than usual...', onRetry }: LoadingScreenProps) {
  const [showRetry, setShowRetry] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 8000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center flex-col gap-3">
      <p className="text-[32px] font-extrabold text-ink tracking-[-2px]">
        hap
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky ml-1 mb-2" />
      </p>
      <div className="w-5 h-5 border-2 border-sky border-t-transparent rounded-full animate-spin" />
      {showRetry && (
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-muted text-xs">{message}</p>
          <div className="flex items-center gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="bg-sky text-white text-xs font-bold px-5 py-2.5 rounded-xl"
              >
                Retry
              </button>
            )}
            <button
              onClick={() => navigate('/', { replace: true })}
              className="bg-ink text-white text-xs font-bold px-5 py-2.5 rounded-xl"
            >
              Back to sign in
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
