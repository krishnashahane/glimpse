import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'accent' | 'muted' | 'success' | 'warning' | 'danger'
  className?: string
  onClick?: () => void
}

const variants = {
  accent: 'bg-accent-dim text-accent',
  muted: 'bg-elevated text-text-3 border border-border-dim',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
}

export function Badge({ children, variant = 'muted', className, onClick }: BadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className,
      )}
    >
      {children}
    </span>
  )
}
