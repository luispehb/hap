import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface InviterInfo {
  display_name: string
}

export function Invite() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'valid' | 'expired'>('loading')
  const [inviter, setInviter] = useState<InviterInfo | null>(null)

  useEffect(() => {
    if (!code) { setStatus('expired'); return }

    supabase
      .from('invitations')
      .select('id, inviter_id, used')
      .eq('code', code)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data || data.used) {
          setStatus('expired')
          return
        }
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', data.inviter_id)
          .maybeSingle()

        setInviter(profileData ?? { display_name: 'Someone' })
        sessionStorage.setItem('hapInviteCode', code)
        setStatus('valid')
      })
  }, [code])

  const handleJoin = () => {
    navigate('/')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-4xl mb-4">🔗</p>
          <p className="text-ink font-extrabold text-xl tracking-tight mb-2">This invite has expired</p>
          <p className="text-muted text-sm">The link may have already been used or is no longer valid.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-[320px]">
        <p className="text-5xl mb-6">✨</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
          You're invited
        </p>
        <h1 className="text-ink font-extrabold text-2xl tracking-tight leading-tight mb-2">
          {inviter?.display_name} invited you to Hap
        </h1>
        <p className="text-muted text-sm leading-relaxed mb-10">
          Good things happen.
        </p>
        <button
          onClick={handleJoin}
          className="w-full bg-ink text-white font-bold py-3.5 rounded-xl text-sm active:opacity-80 transition cursor-pointer"
        >
          Join Hap →
        </button>
      </div>
    </div>
  )
}
