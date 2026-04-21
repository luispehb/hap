import type { ReactNode } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'cta' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
}

const VARIANT_CLASSES = {
  primary: 'bg-ink text-white hover:opacity-90',
  cta: 'bg-sky text-white hover:opacity-90',
  outline: 'bg-white border border-[#E8E4DC] text-muted hover:bg-sand',
  ghost: 'bg-transparent text-muted hover:bg-sand',
}

const SIZE_CLASSES = {
  sm: 'py-1.5 px-3 text-xs',
  md: 'py-2.5 px-4 text-sm',
  lg: 'py-3 px-6 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  onClick,
  disabled = false,
  children,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        'font-bold rounded-btn transition-all cursor-pointer',
        fullWidth ? 'w-full' : '',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
