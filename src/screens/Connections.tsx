import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { BottomNav } from '../components/ui/BottomNav'
import { getProfilePhoto } from '../lib/photos'

interface Connection {
  id: string
  user_a_id: string
  user_b_id: string
  user_a_wants_connect: boolean
  user_b_wants_connect: boolean
}

interface ProfileRow {
  id: string
  display_name: string
  home_city: string
  current_city: string
  is_local: boolean
  social_links: Record<string, string>
  trust_score: number
}

const SOCIAL_EMOJIS: Record<string, string> = {
  instagram: '📸',
  linkedin: '💼',
  whatsapp: '💬',
  telegram: '✈️',
  website: '🌐',
  substack: '📝',
  spotify: '🎵',
}

function getSocialUrl(platform: string, handle: string): string {
  const map: Record<string, string> = {
    instagram: `https://instagram.com/${handle}`,
    linkedin: `https://linkedin.com/in/${handle}`,
    whatsapp: `https://wa.me/${handle}`,
    telegram: `https://t.me/${handle}`,
    website: handle,
    substack: `https://${handle}.substack.com`,
    spotify: `https://open.spotify.com/user/${handle}`,
  }
  return map[platform] ?? handle
}

export function Connections() {
  const navigate = useNavigate()
  const { profile: ownProfile, loading: authLoading } = useAuth()

  const [connections, setConnections] = useState<Connection[]>([])
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!ownProfile?.id) {
      setError('We could not find your profile.')
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from('connections')
          .select('*')
          .or(`user_a_id.eq.${ownProfile!.id},user_b_id.eq.${ownProfile!.id}`)

        if (error) throw error

        const rows = (data ?? []) as Connection[]
        setConnections(rows)

        const otherIds = rows.map((c: Connection) =>
          c.user_a_id === ownProfile!.id ? c.user_b_id : c.user_a_id
        )
        if (otherIds.length === 0) return

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, home_city, current_city, is_local, social_links, trust_score')
          .in('id', otherIds)

        if (profileError) throw profileError

        const map: Record<string, ProfileRow> = {}
        for (const p of profileData ?? []) map[p.id] = p
        setProfiles(map)
      } catch (err) {
        console.error('Connections load error:', err)
        setConnections([])
        setProfiles({})
        setError(err instanceof Error ? err.message : 'Failed to load connections.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authLoading, ownProfile?.id])

  const handleAccept = async (conn: Connection) => {
    await supabase.from('connections').update({ user_b_wants_connect: true }).eq('id', conn.id)
    setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, user_b_wants_connect: true } : c))
  }

  const handleDecline = async (conn: Connection) => {
    await supabase.from('connections').delete().eq('id', conn.id)
    setConnections(prev => prev.filter(c => c.id !== conn.id))
  }

  const pending = connections.filter(
    c => c.user_b_id === ownProfile?.id && c.user_a_wants_connect && !c.user_b_wants_connect
  )
  const connected = connections.filter(c => c.user_a_wants_connect && c.user_b_wants_connect)

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="bg-cream border-b border-[#E8E4DC] px-4 pt-14 pb-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 bg-sand rounded-xl flex items-center justify-center cursor-pointer active:opacity-70"
          >
            <ChevronLeft size={18} className="text-ink" />
          </button>
          <p className="text-ink font-extrabold text-lg tracking-tight">Connections</p>
        </div>
        <div className="px-4 py-20 text-center">
          <p className="text-ink font-bold text-sm">Connections unavailable</p>
          <p className="text-muted text-xs mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-cream border-b border-[#E8E4DC] px-4 pt-14 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 bg-sand rounded-xl flex items-center justify-center cursor-pointer active:opacity-70"
        >
          <ChevronLeft size={18} className="text-ink" />
        </button>
        <p className="text-ink font-extrabold text-lg tracking-tight">Connections</p>
      </div>

      <div className="px-4 py-4 pb-24 flex flex-col gap-6">
        {/* Pending requests */}
        {pending.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
              Pending Requests
            </p>
            <div className="flex flex-col gap-3">
              {pending.map(conn => {
                const other = profiles[conn.user_a_id]
                if (!other) return null
                return (
                  <div key={conn.id} className="bg-white border border-[#E8E4DC] rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={getProfilePhoto(other.display_name, other.home_city)}
                          alt={other.display_name}
                          className="w-full h-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-bold text-sm">{other.display_name}</p>
                        <p className="text-muted text-xs">{other.home_city} · {other.is_local ? 'Local' : other.current_city}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="md" fullWidth onClick={() => handleDecline(conn)}>
                        Decline
                      </Button>
                      <Button variant="cta" size="md" fullWidth onClick={() => handleAccept(conn)}>
                        Accept
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Connected */}
        {connected.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
              Connected
            </p>
            <div className="flex flex-col gap-3">
              {connected.map(conn => {
                const otherId = conn.user_a_id === ownProfile?.id ? conn.user_b_id : conn.user_a_id
                const other = profiles[otherId]
                if (!other) return null
                const socialEntries = Object.entries(other.social_links ?? {}).filter(([, v]) => v)
                return (
                  <div key={conn.id} className="bg-white border border-[#E8E4DC] rounded-2xl p-4">
                    <div
                      className="flex items-center gap-3 mb-3 cursor-pointer"
                      onClick={() => navigate(`/profile/${other.id}`)}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={getProfilePhoto(other.display_name, other.home_city)}
                          alt={other.display_name}
                          className="w-full h-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-bold text-sm">{other.display_name}</p>
                        <p className="text-muted text-xs">{other.home_city} · {other.is_local ? 'Local' : other.current_city}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/direct/${other.id}`)}
                      className="w-full mb-2 py-2.5 bg-ink text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:opacity-80 transition cursor-pointer"
                    >
                      <span>💬</span> Message
                    </button>
                    {socialEntries.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {socialEntries.map(([platform, handle]) => (
                          <button
                            key={platform}
                            onClick={() => window.open(getSocialUrl(platform, handle), '_blank')}
                            className="bg-sand rounded-xl px-3 py-2 flex items-center gap-1.5 cursor-pointer active:opacity-70"
                          >
                            <span className="text-sm">{SOCIAL_EMOJIS[platform] ?? '🔗'}</span>
                            <span className="text-xs font-bold text-ink capitalize">{platform}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted text-xs">No social links added yet</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {pending.length === 0 && connected.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-sand rounded-2xl flex items-center justify-center mb-4">
              <span className="text-2xl">🤝</span>
            </div>
            <p className="text-ink font-extrabold text-base tracking-tight mb-1">No connections yet</p>
            <p className="text-muted text-sm leading-relaxed">Join a plan, meet people, and connect after. That's how it works.</p>
            <button
              onClick={() => navigate('/feed')}
              className="mt-5 bg-ink text-white text-xs font-bold px-6 py-3 rounded-xl active:opacity-80 transition cursor-pointer"
            >
              Explore people
            </button>
          </div>
        )}
      </div>

      <BottomNav active="connections" />
    </div>
  )
}
