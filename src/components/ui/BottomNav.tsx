import { useNavigate } from 'react-router-dom'
import { Compass, CalendarDays, MessageCircle, User } from 'lucide-react'

type NavTab = 'explore' | 'plans' | 'chats' | 'profile'

interface BottomNavProps {
  active: NavTab
  onNavigate?: (tab: NavTab) => void
}

const NAV_ITEMS: { id: NavTab; label: string; Icon: typeof Compass }[] = [
  { id: 'explore', label: 'Explore', Icon: Compass },
  { id: 'plans', label: 'Plans', Icon: CalendarDays },
  { id: 'chats', label: 'Chats', Icon: MessageCircle },
  { id: 'profile', label: 'Profile', Icon: User },
]

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const navigate = useNavigate()

  function handleTab(tab: NavTab) {
    onNavigate?.(tab)
    if (tab === 'explore') navigate('/feed')
    else if (tab === 'plans') navigate('/feed', { state: { tab: 'plans' } })
    else if (tab === 'chats') navigate('/chats')
    else if (tab === 'profile') navigate('/profile')
  }

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream border-t border-[#EAE6DF] z-50">
      <div className="flex pb-safe">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = id === active
          return (
            <button
              key={id}
              onClick={() => handleTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 pt-3 min-h-[56px] transition-colors cursor-pointer select-none ${
                isActive ? 'text-sky' : 'text-muted'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-sky mt-0.5" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
