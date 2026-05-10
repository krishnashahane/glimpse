import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CommunityCard } from '@/components/community/CommunityCard'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { communityApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

export default function Communities() {
  const navigate = useNavigate()
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  const handleInput = (v: string) => {
    setQ(v)
    clearTimeout((window as unknown as { _ct?: ReturnType<typeof setTimeout> })._ct)
    ;(window as unknown as { _ct?: ReturnType<typeof setTimeout> })._ct = setTimeout(() => setDebouncedQ(v), 300)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['communities', debouncedQ],
    queryFn: () => communityApi.list(0, debouncedQ || undefined).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  })

  return (
    <div>
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-md border-b border-border-dim px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-semibold text-text-1">Communities</h1>
          {isAuth && (
            <Button size="sm" onClick={() => navigate('/communities/create')}>
              <Plus className="w-3.5 h-3.5" />
              Create
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Search communities…"
            className="w-full bg-elevated border border-border-dim rounded-xl pl-9 pr-4 py-2 text-sm text-text-1 placeholder:text-text-3 outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <PageSpinner />
        ) : (
          <div className="flex flex-col gap-2">
            {(data?.communities || []).map((c: Parameters<typeof CommunityCard>[0]['community']) => (
              <CommunityCard key={c.id} community={c} />
            ))}
            {data?.communities?.length === 0 && (
              <p className="text-center text-text-3 py-12 text-sm">No communities found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
