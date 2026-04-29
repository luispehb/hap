import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ADMIN_USER_ID = 'aeef7b13-4e49-4c3d-a8d8-372dc5566d22'

type ActiveSection = 'overview' | 'mindset' | 'memberships' | 'users' | 'plans' | 'connections' | 'invites'
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
  user_id: string
  display_name: string
  current_city: string
  created_at: string
  trust_score: number
  mindset_answer: string
  mindset_summary: string | null
  mindset_tags: string[] | null
  mindset_recommendation: string | null
  mindset_welcome_note: string | null
  mindset_compatibility_score: number | null
}

type SortColumn = 'name' | 'city' | 'trust' | 'invite' | 'status' | 'date'

interface UserProfile {
  id: string
  user_id: string
  display_name: string
  first_name: string | null
  last_name: string | null
  current_city: string
  trust_score: number
  has_invite: boolean
  mindset_approved: boolean | null
  membership_status: string
  created_at: string
  travel_style: string | null
  email: string | null
  home_city: string | null
  is_local: boolean | null
  trip_end_date: string | null
}

interface InviteCode {
  id: string
  code: string
  used: boolean
  created_at: string
  inviter_id: string
  used_by?: string | null
}

interface AdminPlan {
  id: string
  creator_id: string
  title: string
  activity_type: string
  city: string
  location_name: string | null
  scheduled_at: string
  max_participants: number
  status: string
  is_hap_day: boolean
  created_at: string
}

interface AdminParticipant {
  plan_id: string
  user_id: string
  status: string
}

interface AdminConnection {
  id: string
  user_a_id: string
  user_b_id: string
  plan_id: string | null
  user_a_wants_connect: boolean
  user_b_wants_connect: boolean
  social_shared: boolean
  connected_at: string
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

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function pct(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body?.detail) return `${body.error ?? 'Error'}: ${body.detail}`
      if (body?.body) return `${body.error ?? 'Error'}: ${body.body}`
      if (body?.error) return String(body.error)
    } catch {
      return error.message
    }
  }

  return error instanceof Error ? error.message : String(error)
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

function OpsCard({ title, value, sub, tone = 'neutral' }: { title: string; value: string; sub?: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'blue' }) {
  const color = tone === 'good' ? '#3B6D11' : tone === 'warn' ? '#854F0B' : tone === 'bad' ? '#A32D2D' : tone === 'blue' ? '#2A60A8' : '#1A1A1A'
  const bg = tone === 'good' ? '#F3F8EC' : tone === 'warn' ? '#FFF7E8' : tone === 'bad' ? '#FFF1F1' : tone === 'blue' ? '#EFF6FF' : '#F5F4F1'
  return (
    <div className="bg-white border border-[#E8E4DC]" style={{ borderRadius: 12, padding: 16 }}>
      <p style={{ fontSize: 11, color: '#B0AA9E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{title}</p>
      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, background: bg, borderRadius: 10, padding: '8px 12px' }}>
        <span style={{ color, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{value}</span>
      </div>
      {sub && <p style={{ fontSize: 12, color: '#6F695F', marginTop: 10, lineHeight: 1.45 }}>{sub}</p>}
    </div>
  )
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-[#E8E4DC]" style={{ borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E4DC' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{title}</p>
        {sub && <p style={{ fontSize: 12, color: '#B0AA9E', marginTop: 2 }}>{sub}</p>}
      </div>
      <div style={{ padding: 16 }}>
        {children}
      </div>
    </section>
  )
}

const SECTION_META: Record<ActiveSection, { title: string; sub: string }> = {
  overview: { title: 'Operations overview', sub: 'lo que necesita atención para operar el MVP hoy' },
  mindset: { title: 'Perfiles pendientes', sub: 'usuarios sin invite · esperando revisión de mindset' },
  memberships: { title: 'Membresías', sub: 'usuarios en período de prueba o pendientes de aprobación' },
  users: { title: 'Usuarios', sub: 'todos los usuarios registrados en la plataforma' },
  plans: { title: 'Planes', sub: 'supply, ocupación y próximos encuentros' },
  connections: { title: 'Conexiones', sub: 'señales de matching, dobles opt-in y social sharing' },
  invites: { title: 'Invite codes', sub: 'códigos disponibles, usados y crecimiento por invitación' },
}

export function Admin() {
  useNavigate()
  const { profile, user } = useAuth()
  const [profiles, setProfiles] = useState<PendingProfile[]>([])
  const [mindsetProfiles, setMindsetProfiles] = useState<MindsetProfile[]>([])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [participants, setParticipants] = useState<AdminParticipant[]>([])
  const [connections, setConnections] = useState<AdminConnection[]>([])
  const [messageCount, setMessageCount] = useState(0)
  const [ratingCount, setRatingCount] = useState(0)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ trust_score: number; current_city: string; mindset_approved: boolean | null }>({ trust_score: 0, current_city: '', mindset_approved: null })
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [newCodeId, setNewCodeId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('todos')
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  const isAdmin = profile?.user_id === ADMIN_USER_ID

  useEffect(() => {
    if (!isAdmin) {
      setTimeout(() => setLoading(false), 0)
      return
    }
    Promise.all([
      supabase
        .from('profiles')
        .select('id, user_id, display_name, current_city, created_at, bio_question, membership_status')
        .in('membership_status', ['trial', 'pending'])
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, user_id, display_name, current_city, created_at, trust_score, mindset_answer, mindset_summary, mindset_tags, mindset_recommendation, mindset_welcome_note, mindset_compatibility_score')
        .eq('has_invite', false)
        .is('mindset_approved', null)
        .not('mindset_answer', 'is', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name, current_city, trust_score, has_invite, mindset_approved, membership_status, created_at, travel_style, email, home_city, is_local, trip_end_date')
        .order('created_at', { ascending: false }),
      supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('plans')
        .select('id, creator_id, title, activity_type, city, location_name, scheduled_at, max_participants, status, is_hap_day, created_at')
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('plan_participants')
        .select('plan_id, user_id, status'),
      supabase
        .from('connections')
        .select('id, user_a_id, user_b_id, plan_id, user_a_wants_connect, user_b_wants_connect, social_shared, connected_at')
        .order('connected_at', { ascending: false }),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('ratings')
        .select('id', { count: 'exact', head: true }),
    ]).then(([res1, res2, res3, res4, res5, res6, res7, res8, res9, res10]) => {
      setProfiles(res1.data ?? [])
      setMindsetProfiles(res2.data ?? [])
      setTotalUsers(res3.count ?? 0)
      setAllUsers(res4.data ?? [])
      setInviteCodes(res5.data ?? [])
      setPlans(res6.data ?? [])
      setParticipants(res7.data ?? [])
      setConnections(res8.data ?? [])
      setMessageCount(res9.count ?? 0)
      setRatingCount(res10.count ?? 0)
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
      .select('*')
      .single()
    if (data) {
      setInviteCodes(prev => [data, ...prev])
      setNewCodeId(data.id)
      setTimeout(() => setNewCodeId(null), 3000)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(`https://app.go-hap.com/invite/${code}`)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleDeleteInvite = async (id: string) => {
    await supabase.from('invitations').delete().eq('id', id)
    setInviteCodes(prev => prev.filter(i => i.id !== id))
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

  const handleDeleteUser = async (profileId: string, authUserId: string, displayName: string) => {
    if (!confirm(`¿Eliminar a ${displayName}? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.functions.invoke('delete-user', {
      body: { userId: authUserId }
    })
    if (error) {
      alert(`Error al eliminar usuario: ${await getFunctionErrorMessage(error)}`)
      return
    }
    setAllUsers(prev => prev.filter(u => u.id !== profileId))
  }

  const handleMindsetReject = async (profileId: string) => {
    await supabase.from('profiles')
      .update({ mindset_approved: false })
      .eq('id', profileId)
    setMindsetProfiles(prev => prev.filter(p => p.id !== profileId))
  }

  const handleReanalyze = async (p: MindsetProfile) => {
    if (!p.mindset_answer || reanalyzingId === p.id) return
    setReanalyzingId(p.id)
    try {
      const { error: fnError } = await supabase.functions.invoke('analyze-mindset', {
        body: { userId: p.user_id, mindsetAnswer: p.mindset_answer }
      })
      if (fnError) {
        alert(`Error al re-analizar: ${await getFunctionErrorMessage(fnError)}`)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('mindset_summary, mindset_tags, mindset_recommendation')
        .eq('id', p.id)
        .single()
      if (data) setMindsetProfiles(prev => prev.map(x => x.id === p.id ? { ...x, ...data } : x))
    } catch (err) {
      alert(`Error inesperado: ${String(err)}`)
    } finally {
      setReanalyzingId(null)
    }
  }

  const processedUsers = useMemo(() => {
    let list = [...allUsers]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(u =>
        u.display_name.toLowerCase().includes(q) ||
        (u.current_city ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
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
  }, [allUsers, searchQuery, sortColumn, sortDir])

  const participantsByPlan = useMemo(() => {
    return participants.reduce<Record<string, AdminParticipant[]>>((acc, participant) => {
      acc[participant.plan_id] = acc[participant.plan_id] ?? []
      acc[participant.plan_id].push(participant)
      return acc
    }, {})
  }, [participants])

  const userById = useMemo(() => {
    return Object.fromEntries(allUsers.map(u => [u.id, u]))
  }, [allUsers])

  const activePlans = useMemo(() => (
    plans.filter(plan => plan.status !== 'cancelled' && new Date(plan.scheduled_at).getTime() >= now)
  ), [now, plans])
  const nextPlans = activePlans.slice(0, 6)
  const openCapacity = activePlans.reduce((sum, plan) => {
    const joined = (participantsByPlan[plan.id] ?? []).filter(p => p.status !== 'cancelled').length
    return sum + Math.max(plan.max_participants - joined, 0)
  }, 0)
  const filledSeats = activePlans.reduce((sum, plan) => sum + (participantsByPlan[plan.id] ?? []).filter(p => p.status !== 'cancelled').length, 0)
  const totalSeats = activePlans.reduce((sum, plan) => sum + plan.max_participants, 0)
  const avgTrust = allUsers.length > 0 ? Math.round(allUsers.reduce((sum, u) => sum + (u.trust_score ?? 0), 0) / allUsers.length) : 0
  const approvedUsers = allUsers.filter(u => u.mindset_approved === true).length
  const invitedUsers = allUsers.filter(u => u.has_invite).length
  const activeMembers = allUsers.filter(u => u.membership_status === 'active').length
  const pendingUsers = allUsers.filter(u => u.mindset_approved === null || ['trial', 'pending'].includes(u.membership_status)).length
  const usedInvites = inviteCodes.filter(inv => inv.used).length
  const availableInvites = inviteCodes.length - usedInvites
  const mutualConnections = connections.filter(c => c.user_a_wants_connect && c.user_b_wants_connect).length
  const oneWayConnections = connections.filter(c => c.user_a_wants_connect !== c.user_b_wants_connect).length
  const socialSharedConnections = connections.filter(c => c.social_shared).length

  const cityOps = useMemo(() => {
    const cities = new Map<string, {
      city: string
      users: number
      travelers: number
      locals: number
      pending: number
      plans: number
      seats: number
    }>()

    allUsers.forEach(userProfile => {
      const city = userProfile.current_city || 'Sin ciudad'
      const row = cities.get(city) ?? { city, users: 0, travelers: 0, locals: 0, pending: 0, plans: 0, seats: 0 }
      row.users += 1
      if (userProfile.is_local) row.locals += 1
      else row.travelers += 1
      if (userProfile.mindset_approved === null || ['trial', 'pending'].includes(userProfile.membership_status)) row.pending += 1
      cities.set(city, row)
    })

    activePlans.forEach(plan => {
      const row = cities.get(plan.city) ?? { city: plan.city, users: 0, travelers: 0, locals: 0, pending: 0, plans: 0, seats: 0 }
      row.plans += 1
      row.seats += Math.max(plan.max_participants - ((participantsByPlan[plan.id] ?? []).filter(p => p.status !== 'cancelled').length), 0)
      cities.set(plan.city, row)
    })

    return [...cities.values()].sort((a, b) => (b.pending + b.users + b.plans) - (a.pending + a.users + a.plans)).slice(0, 6)
  }, [activePlans, allUsers, participantsByPlan])

  function toggleSort(col: SortColumn) {
    if (sortColumn === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortColumn(col); setSortDir('asc') }
  }

  const filteredMindset = activeFilter === 'todos'
    ? mindsetProfiles
    : mindsetProfiles.filter(p => p.mindset_recommendation === activeFilter)

  const filters: ActiveFilter[] = ['todos', 'approve', 'review', 'doubt']

  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-ink font-bold">Access denied</p>
      </div>
    )
  }

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
            OPERACIÓN
          </p>
          <NavItem
            label="Overview"
            active={activeSection === 'overview'}
            onClick={() => setActiveSection('overview')}
            badge={pendingUsers}
            badgeColor={pendingUsers > 0 ? 'red' : 'blue'}
          />

          <p className="text-[10px] font-bold uppercase tracking-widest text-muted px-2 mb-2 mt-5">
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
                <StatCard label="usuarios totales" value={totalUsers.toString()} sub={`${activeMembers} activos · ${approvedUsers} aprobados · ${invitedUsers} con invite`} />
                <StatCard label="pendientes revisión" value={pendingUsers.toString()} sub={`${mindsetProfiles.length} mindset · ${profiles.length} membresía`} />
                <StatCard label="planes próximos" value={activePlans.length.toString()} sub={`${openCapacity} cupos abiertos · ${pct(filledSeats, totalSeats)} ocupación`} />
                <StatCard label="trust score promedio" value={avgTrust.toString()} sub={`${mutualConnections} conexiones mutuas`} />
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

              {/* ── Overview section ── */}
              {activeSection === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="grid grid-cols-4 gap-3">
                    <OpsCard
                      title="Admisión"
                      value={pendingUsers.toString()}
                      sub={`${mindsetProfiles.length} mindset por revisar, ${profiles.length} membresías trial/pending`}
                      tone={pendingUsers > 0 ? 'warn' : 'good'}
                    />
                    <OpsCard
                      title="Supply"
                      value={activePlans.length.toString()}
                      sub={`${openCapacity} cupos disponibles en los próximos planes`}
                      tone={activePlans.length > 0 ? 'blue' : 'warn'}
                    />
                    <OpsCard
                      title="Matching"
                      value={mutualConnections.toString()}
                      sub={`${oneWayConnections} señales one-way, ${socialSharedConnections} con social compartido`}
                      tone={mutualConnections > 0 ? 'good' : 'neutral'}
                    />
                    <OpsCard
                      title="Invites"
                      value={availableInvites.toString()}
                      sub={`${usedInvites}/${inviteCodes.length} usados · ${pct(usedInvites, inviteCodes.length)} conversión`}
                      tone={availableInvites < 3 ? 'warn' : 'good'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Panel title="Prioridades de hoy" sub="atajos para mantener el MVP sano">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { label: 'Revisar mindset sin invite', value: mindsetProfiles.length, target: 'mindset' as ActiveSection, tone: mindsetProfiles.length > 0 ? '#854F0B' : '#3B6D11' },
                          { label: 'Resolver membresías trial/pending', value: profiles.length, target: 'memberships' as ActiveSection, tone: profiles.length > 0 ? '#854F0B' : '#3B6D11' },
                          { label: 'Crear supply donde falten cupos', value: cityOps.filter(c => c.users > 0 && c.plans === 0).length, target: 'plans' as ActiveSection, tone: cityOps.some(c => c.users > 0 && c.plans === 0) ? '#A32D2D' : '#3B6D11' },
                          { label: 'Revisar conexiones one-way', value: oneWayConnections, target: 'connections' as ActiveSection, tone: oneWayConnections > 0 ? '#2A60A8' : '#3B6D11' },
                        ].map(item => (
                          <button
                            key={item.label}
                            onClick={() => setActiveSection(item.target)}
                            className="cursor-pointer transition-all hover:bg-[#FAFAF7]"
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #E8E4DC', borderRadius: 10, background: 'white', textAlign: 'left' }}
                          >
                            <span style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 600 }}>{item.label}</span>
                            <span style={{ minWidth: 26, textAlign: 'center', fontSize: 12, color: item.tone, fontWeight: 800, background: '#F5F4F1', borderRadius: 999, padding: '3px 8px' }}>{item.value}</span>
                          </button>
                        ))}
                      </div>
                    </Panel>

                    <Panel title="Salud por ciudad" sub="demanda, supply y backlog">
                      {cityOps.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#B0AA9E' }}>Aún no hay actividad por ciudad.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {cityOps.map(city => (
                            <div key={city.city} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #F0EDE8' }}>
                              <div>
                                <p style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 700 }}>{city.city}</p>
                                <p style={{ fontSize: 11, color: '#B0AA9E', marginTop: 1 }}>{city.travelers} travelers · {city.locals} locals</p>
                              </div>
                              <span style={{ fontSize: 12, color: '#2A60A8', fontWeight: 700 }}>{city.plans} planes</span>
                              <span style={{ fontSize: 12, color: '#3B6D11', fontWeight: 700 }}>{city.seats} cupos</span>
                              <span style={{ fontSize: 12, color: city.pending > 0 ? '#854F0B' : '#B0AA9E', fontWeight: 700 }}>{city.pending} pendientes</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Panel>
                  </div>

                  <Panel title="Próximos planes" sub="lo más cercano en la operación">
                    {nextPlans.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#B0AA9E' }}>No hay planes próximos. Es momento de crear o empujar supply.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                        {nextPlans.map(plan => {
                          const joined = (participantsByPlan[plan.id] ?? []).filter(p => p.status !== 'cancelled').length
                          return (
                            <div key={plan.id} style={{ border: '1px solid #E8E4DC', borderRadius: 10, padding: 12, background: '#FAFAF7' }}>
                              <p style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 800, lineHeight: 1.25 }}>{plan.title}</p>
                              <p style={{ fontSize: 11, color: '#B0AA9E', marginTop: 5 }}>{plan.city} · {formatDateTime(plan.scheduled_at)}</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: '#6F695F' }}>
                                <span>{joined}/{plan.max_participants} joined</span>
                                <span>{plan.status}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Panel>
                </div>
              )}

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
                                {p.mindset_compatibility_score != null && (
                                  <span style={{ background: '#EBF4FF', color: '#4A90D9', fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 6 }}>
                                    {p.mindset_compatibility_score}% match
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* AI summary */}
                            {p.mindset_summary && (
                              <p style={{ fontSize: 12, color: '#B0AA9E', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 8 }}>
                                {p.mindset_summary}
                              </p>
                            )}

                            {/* Welcome note */}
                            {p.mindset_welcome_note && (
                              <p style={{ fontSize: 12, color: '#4A90D9', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 8 }}>
                                ✦ {p.mindset_welcome_note}
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
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {!p.mindset_recommendation && (
                                <button
                                  onClick={() => handleReanalyze(p)}
                                  disabled={reanalyzingId === p.id}
                                  className="transition-all hover:opacity-80"
                                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1px solid #B0AA9E', color: '#5A554E', background: 'white', cursor: reanalyzingId === p.id ? 'not-allowed' : 'pointer', opacity: reanalyzingId === p.id ? 0.5 : 1 }}
                                >
                                  {reanalyzingId === p.id ? 'Analizando...' : '↻ Re-analizar'}
                                </button>
                              )}
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
                              const email = u.email ?? null
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
                                    <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>
                                      {(u.first_name && u.last_name) ? `${u.first_name} ${u.last_name}` : u.display_name}
                                    </p>
                                    {email && <p style={{ fontSize: 11, color: '#B0AA9E', marginTop: 1 }}>{email}</p>}
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
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => { setEditingUserId(u.id); setEditValues({ trust_score: u.trust_score, current_city: u.current_city || '', mindset_approved: u.mindset_approved }) }} className="cursor-pointer" style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6, background: 'transparent', color: '#B0AA9E', border: '1px solid #E8E4DC' }}>
                                          Editar
                                        </button>
                                        {u.user_id !== ADMIN_USER_ID && (
                                          <button
                                            onClick={() => handleDeleteUser(u.id, u.user_id, u.display_name)}
                                            className="cursor-pointer transition-all hover:bg-[#FCEBEB]"
                                            style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6, background: 'white', color: '#A32D2D', border: '1px solid #F09595' }}
                                          >
                                            Eliminar
                                          </button>
                                        )}
                                      </div>
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
                    <div className="bg-white border border-[#E8E4DC] overflow-x-auto" style={{ borderRadius: 12 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #E8E4DC' }}>
                            {['Código + Link', 'Generado por', 'Usado por', 'Creado', 'Estado', 'Acción'].map(col => (
                              <th
                                key={col}
                                style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#B0AA9E', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}
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
                            const inviterName = allUsers.find(u => u.user_id === inv.inviter_id)?.display_name ?? '—'
                            const usedByName = inv.used_by ? allUsers.find(u => u.id === inv.used_by)?.display_name ?? null : null
                            return (
                              <tr
                                key={inv.id}
                                style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7', borderBottom: i < inviteCodes.length - 1 ? '1px solid #F0EDE8' : 'none' }}
                              >
                                {/* Código + Link */}
                                <td style={{ padding: '10px 16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: isNew ? '#4A90D9' : '#1A1A1A', letterSpacing: '0.1em' }}>
                                      {inv.code}
                                    </span>
                                    <span style={{ fontSize: 11, color: '#B0AA9E' }}>app.go-hap.com/invite/{inv.code}</span>
                                    <button
                                      onClick={() => handleCopyCode(inv.code)}
                                      className="cursor-pointer transition-all hover:bg-sky/10"
                                      style={{ fontSize: 10, fontWeight: 700, color: '#4A90D9', border: '1px solid rgba(74,144,217,0.3)', padding: '2px 8px', borderRadius: 999, background: 'none' }}
                                    >
                                      {isCopied ? 'Copiado ✓' : 'Copy'}
                                    </button>
                                  </div>
                                </td>
                                {/* Generado por */}
                                <td style={{ padding: '10px 16px', fontSize: 12, color: '#1A1A1A', whiteSpace: 'nowrap' }}>
                                  {inviterName}
                                </td>
                                {/* Usado por */}
                                <td style={{ padding: '10px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>
                                  {inv.used
                                    ? usedByName
                                      ? <span style={{ color: '#3B6D11', fontWeight: 500 }}>{usedByName}</span>
                                      : <span style={{ color: '#B0AA9E' }}>Usado</span>
                                    : <span style={{ color: '#B0AA9E' }}>—</span>
                                  }
                                </td>
                                {/* Creado */}
                                <td style={{ padding: '10px 16px', fontSize: 12, color: '#B0AA9E', whiteSpace: 'nowrap' }}>
                                  {new Date(inv.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                {/* Estado */}
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
                                {/* Acción */}
                                <td style={{ padding: '10px 16px' }}>
                                  {!inv.used && (
                                    <button
                                      onClick={() => handleDeleteInvite(inv.id)}
                                      className="cursor-pointer transition-all hover:bg-red-50"
                                      style={{ fontSize: 10, fontWeight: 700, color: '#F87171', border: '1px solid #FECACA', padding: '2px 8px', borderRadius: 999, background: 'none' }}
                                    >
                                      Cancelar
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
              )}

              {/* ── Plans section ── */}
              {activeSection === 'plans' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="grid grid-cols-4 gap-3">
                    <OpsCard title="Próximos" value={activePlans.length.toString()} sub={`${plans.length} planes totales`} tone="blue" />
                    <OpsCard title="Ocupación" value={pct(filledSeats, totalSeats)} sub={`${filledSeats}/${totalSeats} cupos tomados`} tone={filledSeats > 0 ? 'good' : 'warn'} />
                    <OpsCard title="Cupos abiertos" value={openCapacity.toString()} sub="capacidad disponible para empujar matching" tone={openCapacity > 0 ? 'good' : 'warn'} />
                    <OpsCard title="Hap days" value={activePlans.filter(plan => plan.is_hap_day).length.toString()} sub="planes destacados próximos" tone="neutral" />
                  </div>

                  {plans.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
                      <p style={{ fontSize: 14, color: '#B0AA9E' }}>No hay planes creados todavía</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#E8E4DC]" style={{ borderRadius: 12, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #E8E4DC' }}>
                            {['Plan', 'Ciudad', 'Fecha', 'Ocupación', 'Estado', 'Creator'].map(col => (
                              <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#B0AA9E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {plans.map((plan, i) => {
                            const joined = (participantsByPlan[plan.id] ?? []).filter(p => p.status !== 'cancelled').length
                            const creator = userById[plan.creator_id]
                            const isPast = new Date(plan.scheduled_at).getTime() < now
                            return (
                              <tr key={plan.id} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7', borderBottom: i < plans.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                                <td style={{ padding: '10px 16px' }}>
                                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{plan.title}</p>
                                  <p style={{ fontSize: 11, color: '#B0AA9E', marginTop: 1 }}>{plan.activity_type}{plan.location_name ? ` · ${plan.location_name}` : ''}</p>
                                </td>
                                <td style={{ padding: '10px 16px', fontSize: 13, color: '#1A1A1A', whiteSpace: 'nowrap' }}>{plan.city}</td>
                                <td style={{ padding: '10px 16px', fontSize: 12, color: isPast ? '#B0AA9E' : '#1A1A1A', whiteSpace: 'nowrap' }}>{formatDateTime(plan.scheduled_at)}</td>
                                <td style={{ padding: '10px 16px' }}>
                                  <span style={{ background: joined >= plan.max_participants ? '#EAF3DE' : '#EFF6FF', color: joined >= plan.max_participants ? '#3B6D11' : '#2A60A8', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6 }}>
                                    {joined}/{plan.max_participants}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 16px' }}>
                                  <span style={{ background: isPast ? '#EAE6DF' : plan.status === 'open' ? '#EAF3DE' : '#FAEEDA', color: isPast ? '#B0AA9E' : plan.status === 'open' ? '#3B6D11' : '#854F0B', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}>
                                    {isPast ? 'past' : plan.status}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 16px', fontSize: 12, color: '#6F695F' }}>{creator?.display_name ?? '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Connections section ── */}
              {activeSection === 'connections' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="grid grid-cols-4 gap-3">
                    <OpsCard title="Total señales" value={connections.length.toString()} sub="todas las conexiones registradas" tone="neutral" />
                    <OpsCard title="Mutuas" value={mutualConnections.toString()} sub={`${pct(mutualConnections, connections.length)} doble opt-in`} tone={mutualConnections > 0 ? 'good' : 'warn'} />
                    <OpsCard title="One-way" value={oneWayConnections.toString()} sub="potencial para nudges o notificaciones" tone={oneWayConnections > 0 ? 'blue' : 'neutral'} />
                    <OpsCard title="Social shared" value={socialSharedConnections.toString()} sub={`${pct(socialSharedConnections, mutualConnections)} de conexiones mutuas`} tone={socialSharedConnections > 0 ? 'good' : 'neutral'} />
                  </div>

                  <Panel title="Engagement" sub="mensajes y ratings como señales de calidad">
                    <div className="grid grid-cols-3 gap-3">
                      <StatCard label="mensajes enviados" value={messageCount.toString()} />
                      <StatCard label="ratings recibidos" value={ratingCount.toString()} />
                      <StatCard label="mensajes / conexión" value={connections.length > 0 ? (messageCount / connections.length).toFixed(1) : '0'} />
                    </div>
                  </Panel>

                  {connections.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
                      <p style={{ fontSize: 14, color: '#B0AA9E' }}>Aún no hay señales de conexión</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#E8E4DC]" style={{ borderRadius: 12, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #E8E4DC' }}>
                            {['Usuarios', 'Tipo', 'Plan', 'Social', 'Fecha'].map(col => (
                              <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#B0AA9E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {connections.map((connection, i) => {
                            const a = userById[connection.user_a_id]
                            const b = userById[connection.user_b_id]
                            const plan = plans.find(p => p.id === connection.plan_id)
                            const isMutual = connection.user_a_wants_connect && connection.user_b_wants_connect
                            return (
                              <tr key={connection.id} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7', borderBottom: i < connections.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                                <td style={{ padding: '10px 16px' }}>
                                  <p style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 700 }}>{a?.display_name ?? 'Usuario A'} ↔ {b?.display_name ?? 'Usuario B'}</p>
                                  <p style={{ fontSize: 11, color: '#B0AA9E', marginTop: 1 }}>{a?.current_city ?? '—'} · {b?.current_city ?? '—'}</p>
                                </td>
                                <td style={{ padding: '10px 16px' }}>
                                  <span style={{ background: isMutual ? '#EAF3DE' : '#EFF6FF', color: isMutual ? '#3B6D11' : '#2A60A8', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                                    {isMutual ? 'mutual' : 'one-way'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 16px', fontSize: 12, color: '#6F695F' }}>{plan?.title ?? '—'}</td>
                                <td style={{ padding: '10px 16px', fontSize: 13 }}>{connection.social_shared ? <span style={{ color: '#3B6D11', fontWeight: 700 }}>✓</span> : <span style={{ color: '#B0AA9E' }}>—</span>}</td>
                                <td style={{ padding: '10px 16px', fontSize: 12, color: '#B0AA9E', whiteSpace: 'nowrap' }}>{formatShortDate(connection.connected_at)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        )}
      </main>
    </div>
  )
}
