import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Send } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getProfilePhoto } from '../lib/photos'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  read_at: string | null
}

interface OtherProfile {
  id: string
  display_name: string
  origin_city: string
}

export function DirectChat() {
  const { profileId } = useParams<{ profileId: string }>()
  const navigate = useNavigate()
  const { profile: ownProfile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [otherProfile, setOtherProfile] = useState<OtherProfile | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profileId) return
    supabase
      .from('profiles')
      .select('id, display_name, origin_city')
      .eq('id', profileId)
      .maybeSingle()
      .then(({ data }) => setOtherProfile(data))
  }, [profileId])

  useEffect(() => {
    if (!ownProfile?.id || !profileId) return

    async function loadMessages() {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${ownProfile!.id},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${ownProfile!.id})`
        )
        .order('created_at', { ascending: true })
      setMessages(data ?? [])
    }

    loadMessages()

    const channel = supabase
      .channel(`direct-${ownProfile.id}-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${ownProfile.id}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ownProfile?.id, profileId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || !ownProfile?.id || !profileId || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')

    const optimistic: Message = {
      id: crypto.randomUUID(),
      sender_id: ownProfile.id,
      receiver_id: profileId,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    }
    setMessages(prev => [...prev, optimistic])

    await supabase.from('direct_messages').insert({
      sender_id: ownProfile.id,
      receiver_id: profileId,
      content,
    })
    setSending(false)
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="bg-cream border-b border-[#E8E4DC] px-4 pt-12 pb-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 bg-sand rounded-xl flex items-center justify-center cursor-pointer active:opacity-70"
        >
          <ChevronLeft size={18} className="text-ink" />
        </button>
        {otherProfile && (
          <>
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
              <img
                src={getProfilePhoto(otherProfile.display_name, otherProfile.origin_city)}
                alt={otherProfile.display_name}
                className="w-full h-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink font-bold text-sm">{otherProfile.display_name}</p>
              <p className="text-muted text-xs">{otherProfile.origin_city}</p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-3xl">✨</p>
            <p className="text-ink font-bold text-sm">Start the conversation</p>
            <p className="text-muted text-xs">Good things happen.</p>
          </div>
        )}
        {messages.map(msg => {
          const isOwn = msg.sender_id === ownProfile?.id
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                  isOwn
                    ? 'bg-ink text-white rounded-br-sm'
                    : 'bg-white border border-[#E8E4DC] text-ink rounded-bl-sm'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/40' : 'text-muted'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream border-t border-[#E8E4DC] px-4 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
            placeholder="Message..."
            className="flex-1 bg-white border border-[#E8E4DC] rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-sky transition"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center cursor-pointer active:opacity-80 transition disabled:opacity-40"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
