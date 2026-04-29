// v2: connections tab
import { useNavigate } from 'react-router-dom'
import { Compass, Users, MessageCircle, User } from 'lucide-react'

type NavTab = 'explore' | 'connections' | 'chats' | 'profile'

interface BottomNavProps {
  active: NavTab
  onNavigate?: (tab: NavTab) => void
}

const NAV_ITEMS: { id: NavTab; label: string; Icon: typeof Compass }[] = [
  { id: 'explore', label: 'Explore', Icon: Compass },
  { id: 'connections', label: 'Connections', Icon: Users },
  { id: 'chats', label: 'Chats', Icon: MessageCircle },
  { id: 'profile', label: 'Profile', Icon: User },
]

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const navigate = useNavigate()

  function handleTab(tab: NavTab) {
    onNavigate?.(tab)
    if (tab === 'explore') navigate('/feed')
    else if (tab === 'connections') navigate('/connections')
    else if (tab === 'chats') navigate('/chats')
    else if (tab === 'profile') navigate('/profile')
  }

  return (
    <div
      className="bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{ background: '#EAE6DF', borderTop: '1px solid #EAE6DF' }}
    >
      <div className="flex" style={{ paddingBottom: 'var(--safe-area-bottom)' }}>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = id === active
          return (
            <button
              key={id}
              onClick={() => handleTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-2 transition-colors cursor-pointer select-none min-h-[56px] ${
                isActive ? 'text-sky' : 'text-muted'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-sky mt-0.5" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
