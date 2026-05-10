import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Users, FileText } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PostCard, type PostData } from '@/components/post/PostCard'
import { PostEditor } from '@/components/post/PostEditor'
import { PageSpinner, PostSkeleton } from '@/components/ui/Spinner'
import { communityApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { formatNumber, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function CommunityDetail() {
  const { slug } = useParams<{ slug: string }>()
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  const [isMember, setIsMember] = useState<boolean | null>(null)
  const [sort, setSort] = useState<'hot' | 'new'>('hot')
  const qc = useQueryClient()

  const { data: commData, isLoading } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => communityApi.get(slug!).then((r) => r.data),
    enabled: !!slug,
  })

  useEffect(() => {
    if (commData && isMember === null) setIsMember(commData.isMember)
  }, [commData, isMember])

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['community-posts', slug, sort],
    queryFn: () => communityApi.getPosts(slug!, 0, sort).then((r) => r.data),
    enabled: !!slug,
  })

  const toggle = async () => {
    if (!isAuth) { toast.error('Sign in first'); return }
    try {
      if (isMember) {
        await communityApi.leave(slug!)
        setIsMember(false)
      } else {
        await communityApi.join(slug!)
        setIsMember(true)
      }
      qc.invalidateQueries({ queryKey: ['community', slug] })
    } catch { toast.error('Action failed') }
  }

  if (isLoading) return <PageSpinner />
  if (!commData?.community) return (
    <div className="flex flex-col items-center justify-center py-20 text-text-3">
      <p className="font-brand text-3xl">Community not found.</p>
    </div>
  )

  const { community } = commData

  return (
    <div>
      {/* Banner */}
      <div className="h-28 bg-gradient-to-br from-accent/20 to-elevated relative overflow-hidden">
        {community.banner && <img src={community.banner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
      </div>

      {/* Header */}
      <div className="px-4 py-4 border-b border-border-dim">
        <div className="flex items-start gap-3">
          <Avatar src={community.avatar} name={community.name} size="lg" className="-mt-8 ring-4 ring-base" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-lg font-bold text-text-1">c/{community.name}</h1>
                {community.description && (
                  <p className="text-sm text-text-2 mt-0.5">{community.description}</p>
                )}
              </div>
              <Button variant={isMember ? 'outline' : 'primary'} size="sm" onClick={toggle}>
                {isMember ? 'Leave' : 'Join'}
              </Button>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-xs text-text-3">
                <Users className="w-3.5 h-3.5" />
                {formatNumber(community.memberCount)} members
              </span>
              <span className="flex items-center gap-1.5 text-xs text-text-3">
                <FileText className="w-3.5 h-3.5" />
                {formatNumber(community.postCount)} posts
              </span>
              {community.tags.map((t: string) => <Badge key={t} variant="muted">{t}</Badge>)}
            </div>
          </div>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-border-dim">
        {(['hot', 'new'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
              sort === s ? 'bg-accent-dim text-accent' : 'text-text-3 hover:bg-elevated',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Compose */}
      {isAuth && isMember && (
        <div className="p-4 border-b border-border-dim">
          <PostEditor
            communityId={community.id}
            onSuccess={() => qc.invalidateQueries({ queryKey: ['community-posts', slug] })}
            placeholder={`Post to c/${community.name}…`}
          />
        </div>
      )}

      {/* Posts */}
      <div className="divide-y divide-border-dim">
        {postsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="p-4"><PostSkeleton /></div>)
        ) : (postsData?.posts || []).length === 0 ? (
          <div className="py-12 text-center text-text-3 text-sm">No posts yet. Be the first to post.</div>
        ) : (
          (postsData?.posts || []).map((p: PostData) => (
            <div key={p.id} className="p-4">
              <PostCard post={{ ...p, community: { id: community.id, name: community.name, slug: community.slug, avatar: community.avatar } }} compact showCommunity={false} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
