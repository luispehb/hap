import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { LoadingScreen } from '../components/LoadingScreen'

export function Splash() {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')

  useEffect(() => {
    if (loading) return
    if (user && profile) navigate('/feed', { replace: true })
    else if (user && !profile) navigate('/onboarding', { replace: true })
  }, [user, profile, loading, navigate])

  if (loading) return <LoadingScreen />

  async function handleGoogleSignIn() {
    setOtpError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding` },
    })
    if (error) setOtpError(error.message)
  }

  async function handleSendOTP() {
    if (!email.includes('@')) return
    setOtpLoading(true)
    setOtpError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (error) {
      setOtpError(error.message)
    } else {
      setOtpSent(true)
    }
    setOtpLoading(false)
  }

  async function handleVerifyOTP() {
    if (otp.length !== 8) return
    setOtpLoading(true)
    setOtpError('')
    const { error } = await supabase.auth.verifyOtp({
      email,
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
    <div className="bg-ink min-h-screen flex flex-col items-center justify-center gap-6 px-8 w-full">
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
      <div className="flex flex-col gap-3 w-full mt-4">
        {/* Google */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-white text-ink font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 text-sm active:opacity-80 transition cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        {/* OTP flow */}
        {!otpSent ? (
          <div className="flex flex-col gap-2 w-full">
            <input
              type="email"
              placeholder="Or enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-white/40 transition"
            />
            <button
              onClick={handleSendOTP}
              disabled={!email.includes('@') || otpLoading}
              className="w-full bg-sky text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40 active:opacity-80 transition cursor-pointer"
            >
              {otpLoading ? 'Sending...' : 'Send code →'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            <div className="text-center mb-1">
              <p className="text-white font-bold text-sm">Check your email</p>
              <p className="text-white/40 text-xs mt-1">We sent an 8-digit code to {email}</p>
            </div>

            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter 8-digit code"
              value={otp}
              onChange={e => {
                const val = e.target.value.slice(0, 8)
                setOtp(val)
                if (val.length === 8) {
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
              disabled={otp.length !== 8 || otpLoading}
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
