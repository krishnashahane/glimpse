import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { PostCard, type PostData } from '@/components/post/PostCard'
import { CommunityCard } from '@/components/community/CommunityCard'
import { PostSkeleton } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { searchApi, communityApi } from '@/lib/api'
import { cn } from '@/lib/utils'

type SearchType = 'all' | 'posts' | 'communities' | 'users'

export default function Explore() {
  const [q, setQ] = useState('')
  const [type, setType] = useState<SearchType>('all')
  const [debouncedQ, setDebouncedQ] = useState('')

  const handleInput = (v: string) => {
    setQ(v)
    clearTimeout((window as unknown as { _st?: ReturnType<typeof setTimeout> })._st)
    ;(window as unknown as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setDebouncedQ(v), 300)
  }

  const { data: searchData, isLoading: searching } = useQuery({
    queryKey: ['search', debouncedQ, type],
    queryFn: () => searchApi.search(debouncedQ, type).then((r) => r.data),
    enabled: debouncedQ.length >= 2,
  })

  const { data: commData } = useQuery({
    queryKey: ['communities', 'explore'],
    queryFn: () => communityApi.list(0).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const tabs: { key: SearchType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'posts', label: 'Posts' },
    { key: 'communities', label: 'Communities' },
    { key: 'users', label: 'People' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-md border-b border-border-dim px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Search posts, communities, people…"
            className="w-full bg-elevated border border-border-dim rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-1 placeholder:text-text-3 outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>

        {debouncedQ.length >= 2 && (
          <div className="flex gap-1 mt-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setType(tab.key)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-all',
                  type === tab.key ? 'bg-accent-dim text-accent' : 'text-text-3 hover:bg-elevated',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        {debouncedQ.length >= 2 ? (
          searching ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => <PostSkeleton key={i} />)}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {searchData?.posts?.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-2">Posts</h3>
                  <div className="flex flex-col gap-2">
                    {searchData.posts.map((p: PostData) => <PostCard key={p.id} post={p} compact />)}
                  </div>
                </section>
              )}
              {searchData?.communities?.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-2">Communities</h3>
                  <div className="flex flex-col gap-2">
                    {searchData.communities.map((c: Parameters<typeof CommunityCard>[0]['community']) => (
                      <CommunityCard key={c.id} community={c} />
                    ))}
                  </div>
                </section>
              )}
              {searchData?.users?.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-2">People</h3>
                  <div className="flex flex-col gap-2">
                    {searchData.users.map((u: { id: string; username: string; handle: string; avatar: string | null; bio: string | null; isVerified: boolean }) => (
                      <div key={u.id} className="card p-3 flex items-center gap-3">
                        <img src={u.avatar || ''} alt="" className="w-9 h-9 rounded-full bg-elevated" />
                        <div>
                          <p className="text-sm font-medium text-text-1">{u.username} {u.isVerified && <span className="text-accent">✓</span>}</p>
                          <p className="text-xs text-text-3">@{u.handle}</p>
                          {u.bio && <p className="text-xs text-text-2 mt-0.5 line-clamp-1">{u.bio}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {!searchData?.posts?.length && !searchData?.communities?.length && !searchData?.users?.length && (
                <p className="text-center text-text-3 py-10 text-sm">No results for "{debouncedQ}"</p>
              )}
            </div>
          )
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-text-1 mb-3">Popular Communities</h2>
            <div className="flex flex-col gap-2">
              {(commData?.communities || []).map((c: Parameters<typeof CommunityCard>[0]['community']) => (
                <CommunityCard key={c.id} community={c} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
