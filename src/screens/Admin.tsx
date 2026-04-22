import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ADMIN_USER_ID = 'aeef7b13-4e49-4c3d-a8d8-372dc5566d22'

interface PendingProfile {
  id: string
  user_id: string
  display_name: string
  current_city: string
  created_at: string
  bio_question: string
  membership_status: string
}

export function Admin() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [profiles, setProfiles] = useState<PendingProfile[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = profile?.user_id === ADMIN_USER_ID

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return }
    supabase
      .from('profiles')
      .select('id, user_id, display_name, current_city, created_at, bio_question, membership_status')
      .in('membership_status', ['trial', 'pending'])
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setProfiles(data ?? [])
        setLoading(false)
      })
  }, [isAdmin])

  const handleApprove = async (profileId: string) => {
    await supabase.from('profiles').update({ membership_status: 'active' }).eq('id', profileId)
    setProfiles(prev => prev.filter(p => p.id !== profileId))
  }

  const handleReject = async (profileId: string) => {
    await supabase.from('profiles').update({ membership_status: 'suspended' }).eq('id', profileId)
    setProfiles(prev => prev.filter(p => p.id !== profileId))
  }

  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-ink font-bold">Access denied</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="px-4 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-muted text-xs font-bold mb-4 cursor-pointer active:opacity-70"
        >
          ← Back
        </button>
        <h1 className="text-ink text-xl font-extrabold tracking-tight">Admin Panel</h1>
        <p className="text-muted text-xs mt-1">Pending approvals</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-muted text-sm">No pending profiles — all clear ✓</p>
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-3 pb-8">
          {profiles.map(p => (
            <div key={p.id} className="bg-white border border-[#E8E4DC] rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-ink font-bold text-sm">{p.display_name}</p>
                  <p className="text-muted text-xs">{p.current_city}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    {p.membership_status}
                  </p>
                  <p className="text-[10px] text-muted mt-0.5">
                    {new Date(p.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              {p.bio_question && (
                <p className="text-ink text-xs leading-relaxed italic mb-3">
                  "{p.bio_question.length > 80 ? p.bio_question.slice(0, 80) + '…' : p.bio_question}"
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleReject(p.id)}
                  className="flex-1 bg-white border border-[#E8E4DC] rounded-xl py-2.5 text-xs font-bold text-muted active:bg-sand transition cursor-pointer"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(p.id)}
                  className="flex-1 bg-ink rounded-xl py-2.5 text-xs font-bold text-white active:opacity-80 transition cursor-pointer"
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
