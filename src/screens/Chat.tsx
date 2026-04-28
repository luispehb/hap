import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getActivityEmoji } from '../hooks/usePlans'

interface Message {
  id: string
  plan_id: string
  sender_id: string
  content: string
  sent_at: string
  sender?: {
    display_name: string
    home_city: string
  }
}

interface PlanInfo {
  title: string
  activity_type: string
  participant_count?: number
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function Chat() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const senderId = profile?.id ?? null

  // Fetch plan info
  useEffect(() => {
    if (!planId) return
    supabase
      .from('plans')
      .select('title, activity_type')
      .eq('id', planId)
      .single()
      .then(({ data }) => { if (data) setPlan(data) })
  }, [planId])

  // Fetch messages
  async function fetchMessages() {
    if (!planId) return
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles(display_name, home_city)')
      .eq('plan_id', planId)
      .order('sent_at', { ascending: true })
    setMessages(data ?? [])
  }

  useEffect(() => {
    fetchMessages()
  }, [planId])

  // Realtime subscription
  useEffect(() => {
    if (!planId) return
    const channel = supabase
      .channel(`plan-chat-${planId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `plan_id=eq.${planId}` },
        () => { fetchMessages() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [planId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const content = input.trim()
    if (!content || sending || !planId) return
    setSending(true)
    setInput('')
    await supabase.from('messages').insert({
      plan_id: planId,
      sender_id: senderId,
      content,
    })
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const participantLabel = plan ? '· Group chat' : ''

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="bg-cream border-b border-[#E8E4DC] px-4 py-3 flex items-center gap-3 pt-12">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-xl bg-white border border-[#E8E4DC] flex items-center justify-center cursor-pointer active:bg-sand transition flex-shrink-0"
        >
          <ChevronLeft size={16} className="text-ink" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-ink font-bold text-sm truncate">
            {plan ? `${getActivityEmoji(plan.activity_type)} ${plan.title}` : '…'}
          </p>
          <p className="text-muted text-xs">{participantLabel}</p>
        </div>
        <div className="w-8 flex-shrink-0" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 pb-24">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-4xl">
              {plan ? getActivityEmoji(plan.activity_type) : '💬'}
            </span>
            <p className="text-ink font-bold text-sm">Chat opens when your plan is confirmed</p>
            <p className="text-muted text-xs">Messages are only between plan participants</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = senderId !== null && msg.sender_id === senderId
            return (
              <div key={msg.id} className={`flex flex-col max-w-[75%] ${isOwn ? 'self-end items-end' : 'self-start items-start'}`}>
                {!isOwn && msg.sender && (
                  <p className="text-[10px] font-bold text-muted mb-0.5 px-1">
                    {msg.sender.display_name}
                  </p>
                )}
                <div
                  className={`px-3 py-2 text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-sky text-white rounded-2xl rounded-br-md'
                      : 'bg-white border border-[#E8E4DC] text-ink rounded-2xl rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`text-[10px] text-muted mt-0.5 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.sent_at)}
                </p>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream border-t border-[#E8E4DC] px-4 pt-3 pb-safe">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the group…"
            className="flex-1 bg-white border border-[#E8E4DC] rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-sky focus:outline-none transition"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 bg-sky rounded-xl flex items-center justify-center cursor-pointer active:opacity-80 transition disabled:opacity-50 flex-shrink-0"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
