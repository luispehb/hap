import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ADMIN_USER_ID = 'aeef7b13-4e49-4c3d-a8d8-372dc5566d22'

type ActiveSection = 'mindset' | 'memberships' | 'users' | 'plans' | 'connections' | 'invites'
type ActiveFilter = 'todos' | 'approve' | 'review' | 'doubt'

interface PendingProfile {
  id: string
  user_id: string
  display_name: string
  current_city: string
  created_at: string
  bio_question: string
  membership_status: string
}

interface MindsetProfile {
  id: string
  display_name: string
  current_city: string
  created_at: string
  trust_score: number
  mindset_answer: string
  mindset_summary: string | null
  mindset_tags: string[] | null
  mindset_recommendation: string | null
}

type SortColumn = 'name' | 'city' | 'trust' | 'invite' | 'status' | 'date'

interface UserProfile {
  id: string
  user_id: string
  display_name: string
  current_city: string
  trust_score: number
  has_invite: boolean
  mindset_approved: boolean | null
  created_at: string
  travel_style: string | null
  email: string | null
}

interface InviteCode {
  id: string
  code: string
  used: boolean
  created_at: string
  inviter_id: string
}

const POSITIVE_TAGS = new Set(['curioso', 'reflexivo', 'viajero real', 'growth mindset', 'empático', 'creativo'])
const NEGATIVE_TAGS = new Set(['superficial', 'genérico', 'respuesta corta', 'copy-paste sospechoso'])

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'hace menos de 1h'
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

function TagChip({ tag }: { tag: string }) {
  const isPos = POSITIVE_TAGS.has(tag)
  const isNeg = NEGATIVE_TAGS.has(tag)
  return (
    <span style={{
      background: isPos ? '#EAF3DE' : isNeg ? '#FCEBEB' : '#EAE6DF',
      color: isPos ? '#3B6D11' : isNeg ? '#A32D2D' : '#B0AA9E',
      fontSize: 10, fontWeight: 500,
      padding: '2px 8px', borderRadius: 999,
    }}>
      {tag}
    </span>
  )
}

function RecBadge({ rec }: { rec: string | null }) {
  if (!rec) return (
    <span style={{ background: '#EAE6DF', color: '#B0AA9E', fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 6 }}>
      analizando...
    </span>
  )
  const s = rec === 'approve'
    ? { bg: '#EAF3DE', color: '#3B6D11' }
    : rec === 'review'
    ? { bg: '#FAEEDA', color: '#854F0B' }
    : { bg: '#FCEBEB', color: '#A32D2D' }
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 6 }}>
      {rec}
    </span>
  )
}

function NavItem({ label, active, onClick, badge, badgeColor }: {
  label: string
  active: boolean
  onClick: () => void
  badge?: number
  badgeColor?: 'red' | 'blue'
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center justify-between cursor-pointer transition-all rounded-lg mb-0.5"
      style={{
        padding: '7px 8px',
        background: active ? '#4A90D915' : 'transparent',
        color: active ? '#4A90D9' : '#B0AA9E',
        fontWeight: active ? 500 : 400,
        fontSize: 13,
      }}
    >
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span style={{
          background: badgeColor === 'red' ? '#FCEBEB' : badgeColor === 'blue' ? '#E5EFFC' : '#EAE6DF',
          color: badgeColor === 'red' ? '#A32D2D' : badgeColor === 'blue' ? '#2A60A8' : '#B0AA9E',
          fontSize: 10, fontWeight: 600,
          padding: '1px 7px', borderRadius: 999,
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#F5F4F1', borderRadius: 10, padding: '12px 16px' }}>
      <p style={{ fontSize: 11, color: '#B0AA9E', fontWeight: 500, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 22, color: '#1A1A1A', fontWeight: 500, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: '#B0AA9E', marginTop: 3 }}>{sub}</p>}
    </div>
  )
}

const SECTION_META: Record<ActiveSection, { title: string; sub: string }> = {
  mindset: { title: 'Perfiles pendientes', sub: 'usuarios sin invite · esperando revisión de mindset' },
  memberships: { title: 'Membresías', sub: 'usuarios en período de prueba o pendientes de aprobación' },
  users: { title: 'Usuarios', sub: 'todos los usuarios registrados en la plataforma' },
  plans: { title: 'Planes activos', sub: 'planes activos en este momento' },
  connections: { title: 'Conexiones', sub: 'conexiones entre usuarios' },
  invites: { title: 'Invite codes', sub: 'códigos de invitación generados' },
}

export function Admin() {
  useNavigate()
  const { profile, user } = useAuth()
  const [profiles, setProfiles] = useState<PendingProfile[]>([])
  const [mindsetProfiles, setMindsetProfiles] = useState<MindsetProfile[]>([])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ trust_score: number; current_city: string; mindset_approved: boolean | null }>({ trust_score: 0, current_city: '', mindset_approved: null })
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [newCodeId, setNewCodeId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [emailMap, setEmailMap] = useState<Record<string, string>>({})
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<ActiveSection>('mindset')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('todos')

  const isAdmin = profile?.user_id === ADMIN_USER_ID

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return }
    Promise.all([
      supabase
        .from('profiles')
        .select('id, user_id, display_name, current_city, created_at, bio_question, membership_status')
        .in('membership_status', ['trial', 'pending'])
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, display_name, current_city, created_at, trust_score, mindset_answer, mindset_summary, mindset_tags, mindset_recommendation')
        .eq('has_invite', false)
        .is('mindset_approved', null)
        .not('mindset_answer', 'is', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id, user_id, display_name, current_city, trust_score, has_invite, mindset_approved, created_at, travel_style, email')
        .order('created_at', { ascending: false }),
      supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false }),
    ]).then(([res1, res2, res3, res4, res5]) => {
      setProfiles(res1.data ?? [])
      setMindsetProfiles(res2.data ?? [])
      setTotalUsers(res3.count ?? 0)
      setAllUsers(res4.data ?? [])
      setInviteCodes(res5.data ?? [])
      setLoading(false)
      supabase.functions.invoke('get-users-admin').then(({ data }) => {
        if (data?.emails) setEmailMap(data.emails)
      })
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

  const handleMindsetApprove = async (profileId: string) => {
    await supabase.from('profiles')
      .update({ mindset_approved: true, trust_score: 60 })
      .eq('id', profileId)
    setMindsetProfiles(prev => prev.filter(p => p.id !== profileId))
  }

  const handleGenerateCode = async () => {
    if (!user) return
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const { data } = await supabase
      .from('invitations')
      .insert({ inviter_id: user.id, code, used: false })
      .select()
      .single()
    if (data) {
      setInviteCodes(prev => [data, ...prev])
      setNewCodeId(data.id)
      setTimeout(() => setNewCodeId(null), 3000)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleUserSave = async () => {
    if (!editingUserId) return
    await supabase.from('profiles')
      .update({
        trust_score: editValues.trust_score,
        current_city: editValues.current_city,
        mindset_approved: editValues.mindset_approved,
      })
      .eq('id', editingUserId)
    setAllUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, ...editValues } : u))
    setEditingUserId(null)
  }

  const handleMindsetReject = async (profileId: string) => {
    await supabase.from('profiles')
      .update({ mindset_approved: false })
      .eq('id', profileId)
    setMindsetProfiles(prev => prev.filter(p => p.id !== profileId))
  }

  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-ink font-bold">Access denied</p>
      </div>
    )
  }

  const processedUsers = useMemo(() => {
    let list = [...allUsers]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(u =>
        u.display_name.toLowerCase().includes(q) ||
        (u.current_city ?? '').toLowerCase().includes(q) ||
        (emailMap[u.user_id] ?? u.email ?? '').toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      let va: string | number, vb: string | number
      switch (sortColumn) {
        case 'name':   va = a.display_name.toLowerCase();   vb = b.display_name.toLowerCase();   break
        case 'city':   va = (a.current_city ?? '').toLowerCase(); vb = (b.current_city ?? '').toLowerCase(); break
        case 'trust':  va = a.trust_score;  vb = b.trust_score;  break
        case 'invite': va = a.has_invite ? 1 : 0; vb = b.has_invite ? 1 : 0; break
        case 'status': va = a.mindset_approved === true ? 2 : a.mindset_approved === false ? 0 : 1
                       vb = b.mindset_approved === true ? 2 : b.mindset_approved === false ? 0 : 1; break
        default:       va = a.created_at; vb = b.created_at
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [allUsers, emailMap, searchQuery, sortColumn, sortDir])

  function toggleSort(col: SortColumn) {
    if (sortColumn === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortColumn(col); setSortDir('asc') }
  }

  const filteredMindset = activeFilter === 'todos'
    ? mindsetProfiles
    : mindsetProfiles.filter(p => p.mindset_recommendation === activeFilter)

  const filters: ActiveFilter[] = ['todos', 'approve', 'review', 'doubt']

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: '#EAE6DF' }}>

      {/* ── Sidebar ── */}
      <aside
        style={{ width: 200, flexShrink: 0 }}
        className="bg-white border-r border-[#E8E4DC] flex flex-col"
      >
        <div className="px-5 pt-6 pb-5 border-b border-[#E8E4DC]">
          <p className="text-ink font-extrabold tracking-tight leading-none" style={{ fontSize: 18 }}>
            hap<span style={{ color: '#4A90D9' }}>.</span>
          </p>
          <p style={{ fontSize: 11, color: '#B0AA9E', marginTop: 4 }}>admin panel</p>
        </div>

        <nav className="flex-1 px-3 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted px-2 mb-2">
            REVISIÓN
          </p>
          <NavItem
            label="Perfiles pendientes"
            active={activeSection === 'mindset'}
            onClick={() => setActiveSection('mindset')}
            badge={mindsetProfiles.length}
            badgeColor="red"
          />
          <NavItem
            label="Membresías"
            active={activeSection === 'memberships'}
            onClick={() => setActiveSection('memberships')}
            badge={profiles.length}
            badgeColor="blue"
          />

          <p className="text-[10px] font-bold uppercase tracking-widest text-muted px-2 mb-2 mt-5">
            DATOS
          </p>
          <NavItem label="Usuarios" active={activeSection === 'users'} onClick={() => setActiveSection('users')} />
          <NavItem label="Invite codes" active={activeSection === 'invites'} onClick={() => setActiveSection('invites')} />
          <NavItem label="Planes activos" active={activeSection === 'plans'} onClick={() => setActiveSection('plans')} />
          <NavItem label="Conexiones" active={activeSection === 'connections'} onClick={() => setActiveSection('connections')} />
        </nav>
      </aside>

      {/* ── Main content ── */}
      <main
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        className="bg-[#FAFAF7]"
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="bg-white border-b border-[#E8E4DC] flex-shrink-0" style={{ padding: '16px 24px' }}>
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="usuarios totales" value={totalUsers.toString()} />
                <StatCard label="pendientes revisión" value={mindsetProfiles.length.toString()} sub="sin invite" />
                <StatCard label="planes activos" value="—" sub="próximamente" />
                <StatCard label="trust score promedio" value="—" sub="próximamente" />
              </div>
            </div>

            {/* Topbar */}
            <div className="bg-white border-b border-[#E8E4DC] flex-shrink-0 flex items-center justify-between" style={{ padding: '16px 24px' }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>
                  {SECTION_META[activeSection].title}
                </p>
                <p style={{ fontSize: 12, color: '#B0AA9E', marginTop: 2 }}>
                  {SECTION_META[activeSection].sub}
                </p>
              </div>
              {activeSection === 'mindset' && (
                <div className="flex gap-1.5">
                  {filters.map(f => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className="cursor-pointer transition-all"
                      style={{
                        padding: '5px 14px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 500,
                        background: activeFilter === f ? '#1A1A1A' : 'white',
                        color: activeFilter === f ? 'white' : '#B0AA9E',
                        border: activeFilter === f ? '1px solid #1A1A1A' : '1px solid #E8E4DC',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {/* ── Mindset section ── */}
              {activeSection === 'mindset' && (
                filteredMindset.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <p style={{ fontSize: 14, color: '#B0AA9E' }}>
                      {mindsetProfiles.length === 0
                        ? 'No hay perfiles pendientes · todo al día ✓'
                        : 'No hay perfiles con este filtro'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredMindset.map(p => (
                      <div
                        key={p.id}
                        className="bg-white border border-[#E8E4DC]"
                        style={{ borderRadius: 12, padding: 16 }}
                      >
                        <div style={{ display: 'flex', gap: 16 }}>
                          {/* Avatar */}
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EAE6DF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 15, fontWeight: 500, color: '#B0AA9E' }}>
                              {p.display_name.charAt(0).toUpperCase()}
                            </span>
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <div>
                                <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', lineHeight: 1.2 }}>
                                  {p.display_name}
                                </p>
                                <p style={{ fontSize: 12, color: '#B0AA9E', marginTop: 2 }}>
                                  {p.current_city} · {timeAgo(p.created_at)}
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                <span style={{ background: '#1A1A1A', color: '#4A90D9', fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 6 }}>
                                  {p.trust_score}
                                </span>
                                <RecBadge rec={p.mindset_recommendation} />
                              </div>
                            </div>

                            {/* AI summary */}
                            {p.mindset_summary && (
                              <p style={{ fontSize: 12, color: '#B0AA9E', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 8 }}>
                                {p.mindset_summary}
                              </p>
                            )}

                            {/* Tags */}
                            {p.mindset_tags && p.mindset_tags.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                                {p.mindset_tags.map(tag => <TagChip key={tag} tag={tag} />)}
                              </div>
                            )}

                            {/* Mindset answer */}
                            <div style={{ background: '#F5F4F1', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                              <p style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.6 }}>
                                {p.mindset_answer}
                              </p>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => handleMindsetReject(p.id)}
                                className="cursor-pointer transition-all hover:bg-[#FCEBEB]"
                                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1px solid #F09595', color: '#A32D2D', background: 'white' }}
                              >
                                ✗ Rechazar
                              </button>
                              <button
                                onClick={() => handleMindsetApprove(p.id)}
                                className="cursor-pointer transition-all hover:opacity-90"
                                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: '#639922', color: 'white', border: 'none' }}
                              >
                                ✓ Aprobar
                              </button>
                              <button
                                onClick={() => window.open(`/profile/${p.id}`, '_blank')}
                                className="cursor-pointer transition-all"
                                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1px solid #B5D4F4', color: '#4A90D9', background: 'white' }}
                              >
                                Ver perfil →
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── Memberships section ── */}
              {activeSection === 'memberships' && (
                profiles.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <p style={{ fontSize: 14, color: '#B0AA9E' }}>No hay membresías pendientes ✓</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {profiles.map(p => (
                      <div
                        key={p.id}
                        className="bg-white border border-[#E8E4DC]"
                        style={{ borderRadius: 12, padding: 16 }}
                      >
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EAE6DF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 15, fontWeight: 500, color: '#B0AA9E' }}>
                              {p.display_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <div>
                                <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{p.display_name}</p>
                                <p style={{ fontSize: 12, color: '#B0AA9E', marginTop: 2 }}>
                                  {p.current_city} · {new Date(p.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              <span style={{ background: '#EAE6DF', color: '#B0AA9E', fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {p.membership_status}
                              </span>
                            </div>
                            {p.bio_question && (
                              <div style={{ background: '#F5F4F1', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                                <p style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.6, fontStyle: 'italic' }}>
                                  "{p.bio_question}"
                                </p>
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => handleReject(p.id)}
                                className="cursor-pointer transition-all hover:bg-[#FCEBEB]"
                                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1px solid #F09595', color: '#A32D2D', background: 'white' }}
                              >
                                Rechazar
                              </button>
                              <button
                                onClick={() => handleApprove(p.id)}
                                className="cursor-pointer transition-all hover:opacity-80"
                                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: '#1A1A1A', color: 'white', border: 'none' }}
                              >
                                Aprobar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── Users section ── */}
              {activeSection === 'users' && (() => {
                type ColDef = { key: SortColumn | null; label: string }
                const COLS: ColDef[] = [
                  { key: null,     label: '' },
                  { key: 'name',   label: 'Nombre' },
                  { key: 'city',   label: 'Ciudad' },
                  { key: 'trust',  label: 'Trust score' },
                  { key: 'invite', label: 'Invitado' },
                  { key: 'status', label: 'Estado' },
                  { key: 'date',   label: 'Registro' },
                  { key: null,     label: '' },
                ]
                return (
                  <div>
                    {/* Search bar */}
                    <div style={{ marginBottom: 12 }}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nombre, ciudad o email..."
                        style={{ width: '100%', fontSize: 13, color: '#1A1A1A', border: '1px solid #E8E4DC', borderRadius: 8, padding: '8px 14px', outline: 'none', background: 'white', boxSizing: 'border-box' }}
                      />
                    </div>

                    {processedUsers.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
                        <p style={{ fontSize: 14, color: '#B0AA9E' }}>
                          {allUsers.length === 0 ? 'No hay usuarios registrados aún' : 'Sin resultados para esa búsqueda'}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white border border-[#E8E4DC]" style={{ borderRadius: 12, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #E8E4DC' }}>
                              {COLS.map((col, i) => (
                                <th
                                  key={i}
                                  onClick={col.key ? () => toggleSort(col.key!) : undefined}
                                  style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: col.key && sortColumn === col.key ? '#4A90D9' : '#B0AA9E', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', cursor: col.key ? 'pointer' : 'default', userSelect: 'none' }}
                                >
                                  {col.label}{col.key && sortColumn === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {processedUsers.map((u, i) => {
                              const isEditing = editingUserId === u.id
                              const email = emailMap[u.user_id] ?? u.email ?? null
                              const rowBg = i % 2 === 0 ? 'white' : '#FAFAF7'
                              const rowBorder = i < processedUsers.length - 1 ? '1px solid #F0EDE8' : 'none'
                              const statusLabel = u.mindset_approved === true ? 'approved' : u.mindset_approved === false ? 'rejected' : 'pending'
                              const statusStyle = u.mindset_approved === true
                                ? { background: '#EAF3DE', color: '#3B6D11' }
                                : u.mindset_approved === false
                                ? { background: '#FCEBEB', color: '#A32D2D' }
                                : { background: '#EAE6DF', color: '#B0AA9E' }
                              const inputStyle = { fontSize: 13, color: '#1A1A1A', border: '1px solid #E8E4DC', borderRadius: 6, padding: '4px 8px', outline: 'none' }
                              return (
                                <tr key={u.id} style={{ background: rowBg, borderBottom: rowBorder }}>
                                  {/* Avatar */}
                                  <td style={{ padding: '10px 16px', width: 40 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EAE6DF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ fontSize: 13, fontWeight: 500, color: '#B0AA9E' }}>
                                        {u.display_name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  </td>
                                  {/* Nombre + email */}
                                  <td style={{ padding: '10px 16px' }}>
                                    <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{u.display_name}</p>
                                    {email && <p style={{ fontSize: 12, color: '#B0AA9E', marginTop: 1 }}>{email}</p>}
                                    {u.travel_style && <p style={{ fontSize: 11, color: '#B0AA9E', marginTop: 1 }}>{u.travel_style}</p>}
                                  </td>
                                  {/* Ciudad */}
                                  <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                                    {isEditing ? (
                                      <input type="text" value={editValues.current_city} onChange={e => setEditValues(prev => ({ ...prev, current_city: e.target.value }))} style={{ ...inputStyle, width: 140 }} />
                                    ) : (
                                      <span style={{ fontSize: 13, color: '#1A1A1A' }}>{u.current_city || '—'}</span>
                                    )}
                                  </td>
                                  {/* Trust score */}
                                  <td style={{ padding: '10px 16px' }}>
                                    {isEditing ? (
                                      <input type="number" min={0} max={100} value={editValues.trust_score} onChange={e => setEditValues(prev => ({ ...prev, trust_score: Number(e.target.value) }))} style={{ ...inputStyle, width: 60 }} />
                                    ) : (
                                      <span style={{ background: '#4A90D9', color: 'white', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6 }}>
                                        {u.trust_score}
                                      </span>
                                    )}
                                  </td>
                                  {/* Invitado */}
                                  <td style={{ padding: '10px 16px', fontSize: 13 }}>
                                    {u.has_invite
                                      ? <span style={{ color: '#3B6D11', fontWeight: 600 }}>✓</span>
                                      : <span style={{ color: '#B0AA9E' }}>—</span>
                                    }
                                  </td>
                                  {/* Estado */}
                                  <td style={{ padding: '10px 16px' }}>
                                    {isEditing ? (
                                      <select value={editValues.mindset_approved === null ? '' : String(editValues.mindset_approved)} onChange={e => { const v = e.target.value; setEditValues(prev => ({ ...prev, mindset_approved: v === '' ? null : v === 'true' })) }} style={{ ...inputStyle, cursor: 'pointer' }}>
                                        <option value="">pendiente</option>
                                        <option value="true">aprobado</option>
                                        <option value="false">rechazado</option>
                                      </select>
                                    ) : (
                                      <span style={{ ...statusStyle, fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 6 }}>
                                        {statusLabel}
                                      </span>
                                    )}
                                  </td>
                                  {/* Fecha */}
                                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#B0AA9E', whiteSpace: 'nowrap' }}>
                                    {new Date(u.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </td>
                                  {/* Editar / Guardar */}
                                  <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                                    {isEditing ? (
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={handleUserSave} className="cursor-pointer" style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6, background: '#4A90D9', color: 'white', border: 'none' }}>Guardar</button>
                                        <button onClick={() => setEditingUserId(null)} className="cursor-pointer" style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6, background: 'transparent', color: '#B0AA9E', border: 'none' }}>Cancelar</button>
                                      </div>
                                    ) : (
                                      <button onClick={() => { setEditingUserId(u.id); setEditValues({ trust_score: u.trust_score, current_city: u.current_city || '', mindset_approved: u.mindset_approved }) }} className="cursor-pointer" style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6, background: 'transparent', color: '#B0AA9E', border: '1px solid #E8E4DC' }}>
                                        Editar
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── Invite codes section ── */}
              {activeSection === 'invites' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <button
                      onClick={handleGenerateCode}
                      className="cursor-pointer transition-all hover:opacity-90"
                      style={{ fontSize: 13, fontWeight: 500, padding: '7px 16px', borderRadius: 8, background: '#4A90D9', color: 'white', border: 'none' }}
                    >
                      + Generar código
                    </button>
                  </div>
                  {inviteCodes.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
                      <p style={{ fontSize: 14, color: '#B0AA9E' }}>No hay códigos aún · genera el primero</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#E8E4DC]" style={{ borderRadius: 12, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #E8E4DC' }}>
                            {['Código', 'Creado', 'Estado'].map(col => (
                              <th
                                key={col}
                                style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#B0AA9E', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {inviteCodes.map((inv, i) => {
                            const isNew = newCodeId === inv.id
                            const isCopied = copiedCode === inv.code
                            return (
                              <tr
                                key={inv.id}
                                style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7', borderBottom: i < inviteCodes.length - 1 ? '1px solid #F0EDE8' : 'none' }}
                              >
                                <td style={{ padding: '10px 16px' }}>
                                  <button
                                    onClick={() => handleCopyCode(inv.code)}
                                    className="cursor-pointer transition-all"
                                    style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: isNew ? '#4A90D9' : '#1A1A1A', background: 'none', border: 'none', padding: 0, letterSpacing: '0.1em' }}
                                    title="Copiar al portapapeles"
                                  >
                                    {isCopied ? '¡Copiado!' : inv.code}
                                  </button>
                                </td>
                                <td style={{ padding: '10px 16px', fontSize: 12, color: '#B0AA9E', whiteSpace: 'nowrap' }}>
                                  {new Date(inv.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td style={{ padding: '10px 16px' }}>
                                  {inv.used ? (
                                    <span style={{ background: '#EAE6DF', color: '#B0AA9E', fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 6 }}>
                                      usado
                                    </span>
                                  ) : (
                                    <span style={{ background: '#EAF3DE', color: '#3B6D11', fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 6 }}>
                                      disponible
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Placeholder sections ── */}
              {(activeSection === 'plans' || activeSection === 'connections') && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px dashed #B0AA9E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#B0AA9E', fontSize: 14, lineHeight: 1 }}>—</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#B0AA9E' }}>Esta sección estará disponible próximamente</p>
                </div>
              )}

            </div>
          </>
        )}
      </main>
    </div>
  )
}
