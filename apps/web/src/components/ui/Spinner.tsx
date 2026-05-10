import { cn } from '@/lib/utils'

export function Spinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-border-dim border-t-accent',
        sizes[size],
        className,
      )}
    />
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <Spinner size="lg" />
    </div>
  )
}

export function PostSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-elevated" />
        <div className="flex-1">
          <div className="h-3 w-32 bg-elevated rounded mb-1.5" />
          <div className="h-2.5 w-20 bg-elevated/60 rounded" />
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-elevated rounded w-full" />
        <div className="h-3 bg-elevated rounded w-5/6" />
        <div className="h-3 bg-elevated rounded w-4/6" />
      </div>
      <div className="flex gap-4">
        <div className="h-6 w-16 bg-elevated rounded" />
        <div className="h-6 w-16 bg-elevated rounded" />
        <div className="h-6 w-16 bg-elevated rounded" />
      </div>
    </div>
  )
}
