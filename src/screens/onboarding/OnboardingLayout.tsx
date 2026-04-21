import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface OnboardingLayoutProps {
  step: 1 | 2 | 3 | 4
  children: ReactNode
}

const BACK_ROUTES: Record<number, string> = {
  1: '/',
  2: '/onboarding',
  3: '/onboarding/2',
  4: '/onboarding/3',
}

export function OnboardingLayout({ step, children }: OnboardingLayoutProps) {
  const navigate = useNavigate()

  return (
    <div className="bg-cream min-h-screen max-w-[430px] mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 pt-12 pb-2">
        <button
          onClick={() => navigate(BACK_ROUTES[step])}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sand transition cursor-pointer flex-shrink-0"
        >
          <ChevronLeft size={20} className="text-ink" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map(i => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-5 bg-sky'
                  : i < step
                  ? 'w-1.5 bg-sky opacity-40'
                  : 'w-1.5 bg-[#E8E4DC]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-4 pb-8 flex flex-col flex-1">
        {children}
      </div>
    </div>
  )
}
