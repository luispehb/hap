import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { LoadingScreen } from '../components/LoadingScreen'

export function Splash() {
  const navigate = useNavigate()
  const { user, profile, loading, error, retryAuth } = useAuth()

  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')

  const normalizedEmail = email.trim().toLowerCase()
  const canSendOTP = normalizedEmail.includes('@') && !otpLoading

  useEffect(() => {
    if (loading) return
    if (user && profile) navigate('/feed', { replace: true })
    else if (user && !profile) navigate('/onboarding', { replace: true })
  }, [user, profile, loading, navigate])

  // Tiene sesión pero el perfil aún no llegó de Supabase → esperar
  if (loading && user) return (
    <div className="min-h-screen bg-cream flex items-center justify-center flex-col gap-4 px-8">
      <span className="text-[40px] font-extrabold text-ink tracking-[-2px]">
        hap<span className="inline-block w-2.5 h-2.5 rounded-full bg-sky ml-1 mb-1.5" />
      </span>
      <div className="w-5 h-5 border-2 border-sky border-t-transparent rounded-full animate-spin" />
      <p className="text-muted text-sm text-center">Loading your profile...</p>
    </div>
  )

  if (loading) return <LoadingScreen message={error ?? 'Taking longer than usual...'} onRetry={retryAuth} />

  async function handleSendOTP() {
    if (!canSendOTP) return
    setOtpLoading(true)
    setOtpError('')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      })
      if (error) {
        setOtpError(error.message)
      } else {
        setEmail(normalizedEmail)
        setOtpSent(true)
      }
    } catch (err) {
      console.error('OTP send error:', err)
      setOtpError('We could not send the code. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleVerifyOTP() {
    if (otp.length !== 6) return
    setOtpLoading(true)
    setOtpError('')
    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: otp,
      type: 'email',
    })
    if (error) {
      setOtpError('Invalid code. Please try again.')
    }
    // Auth context handles redirect on success
    setOtpLoading(false)
  }

  return (
    <div className="bg-ink min-h-screen flex flex-col items-center justify-center gap-6 px-8 w-full pt-safe">
      {/* Logo */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-white/30 text-xs font-bold uppercase tracking-widest">
          Welcome to
        </span>
        <div className="flex items-end">
          <span className="text-[52px] font-extrabold text-white tracking-[-3px] leading-none">
            hap
          </span>
          <span className="inline-block w-3 h-3 rounded-full bg-sky ml-1 mb-3 flex-shrink-0" />
        </div>
        <p className="text-white/40 text-sm font-medium text-center">
          Good things happen.
        </p>
      </div>

      {/* Auth options */}
      <div className="flex flex-col gap-3 w-full mt-4 pb-safe">
        {/* OTP flow */}
        {!otpSent ? (
          <div className="flex flex-col gap-2 w-full">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-white/40 transition"
            />
            <button
              onClick={handleSendOTP}
              disabled={!canSendOTP}
              className="w-full bg-sky text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40 active:opacity-80 transition cursor-pointer"
            >
              {otpLoading ? 'Sending...' : 'Send code →'}
            </button>
            {otpError && (
              <p className="text-red-400 text-xs text-center">{otpError}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            <div className="text-center mb-1">
              <p className="text-white font-bold text-sm">Check your email</p>
              <p className="text-white/40 text-xs mt-1">We sent a 6-digit code to {email}</p>
            </div>

            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={e => {
                const val = e.target.value.slice(0, 6)
                setOtp(val)
                if (val.length === 6) {
                  setTimeout(() => handleVerifyOTP(), 100)
                }
              }}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white text-center text-2xl font-bold tracking-[0.5em] placeholder:text-white/35 placeholder:text-sm placeholder:tracking-normal focus:outline-none focus:border-white/40"
              autoFocus
            />

            {otpError && (
              <p className="text-red-400 text-xs text-center">{otpError}</p>
            )}

            <button
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6 || otpLoading}
              className="w-full bg-sky text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40 active:opacity-80 transition cursor-pointer"
            >
              {otpLoading ? 'Verifying...' : 'Enter Hap →'}
            </button>

            <button
              onClick={() => { setOtpSent(false); setOtp(''); setOtpError('') }}
              className="text-white/30 text-xs text-center py-1 cursor-pointer"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
