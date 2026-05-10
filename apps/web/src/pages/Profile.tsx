import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Link2, MapPin, Calendar } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PostCard, type PostData } from '@/components/post/PostCard'
import { PageSpinner, PostSkeleton } from '@/components/ui/Spinner'
import { useAuthStore } from '@/stores/auth'
import { userApi } from '@/lib/api'
import { formatNumber, formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function Profile() {
  const { handle } = useParams<{ handle: string }>()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.user)
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  const [following, setFollowing] = useState<boolean | null>(null)
  const [tab, setTab] = useState<'posts' | 'replies'>('posts')
  const qc = useQueryClient()

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user', handle],
    queryFn: () => userApi.get(handle!).then((r) => r.data),
    enabled: !!handle,
  })

  useEffect(() => {
    if (userData && following === null) setFollowing(userData.isFollowing)
  }, [userData, following])

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', handle, tab],
    queryFn: () => userApi.getPosts(handle!).then((r) => r.data),
    enabled: !!handle,
  })

  const handleFollow = async () => {
    if (!isAuth) { toast.error('Sign in first'); return }
    try {
      if (following) {
        await userApi.unfollow(handle!)
        setFollowing(false)
      } else {
        await userApi.follow(handle!)
        setFollowing(true)
      }
      qc.invalidateQueries({ queryKey: ['user', handle] })
    } catch { toast.error('Action failed') }
  }

  if (isLoading) return <PageSpinner />
  if (!userData?.user) return (
    <div className="flex flex-col items-center justify-center py-20 text-text-3">
      <p className="font-brand text-3xl">User not found.</p>
    </div>
  )

  const { user } = userData
  const isMe = me?.id === user.id

  return (
    <div>
      {/* Banner */}
      <div className="h-32 bg-gradient-to-br from-accent/20 to-elevated relative">
        {user.banner && <img src={user.banner} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      </div>

      {/* Profile header */}
      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-10 mb-4">
          <Avatar src={user.avatar} name={user.username} size="xl" className="ring-4 ring-base" />
          <div className="flex gap-2 mt-2">
            {isMe ? (
              <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                Edit Profile
              </Button>
            ) : (
              <Button
                variant={following ? 'outline' : 'primary'}
                size="sm"
                onClick={handleFollow}
              >
                {following ? 'Unfollow' : 'Follow'}
              </Button>
            )}
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-text-1">{user.username}</h1>
            {user.isVerified && <span className="text-accent text-sm">✓</span>}
            {user.role !== 'USER' && <Badge variant="accent">{user.role}</Badge>}
          </div>
          <p className="text-sm text-text-3">@{user.handle}</p>
        </div>

        {user.bio && <p className="text-sm text-text-2 mb-3 leading-relaxed">{user.bio}</p>}

        <div className="flex flex-wrap items-center gap-3 text-xs text-text-3 mb-4">
          {user.location && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{user.location}</span>
          )}
          {user.website && (
            <a href={user.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent hover:underline">
              <Link2 className="w-3 h-3" />{user.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Joined {formatDate(user.createdAt)}</span>
        </div>

        <div className="flex gap-5">
          <button className="text-sm hover:underline">
            <span className="font-semibold text-text-1">{formatNumber(user._count?.followers ?? 0)}</span>
            <span className="text-text-3 ml-1">Followers</span>
          </button>
          <button className="text-sm hover:underline">
            <span className="font-semibold text-text-1">{formatNumber(user._count?.following ?? 0)}</span>
            <span className="text-text-3 ml-1">Following</span>
          </button>
          <span className="text-sm">
            <span className="font-semibold text-text-1">{formatNumber(user._count?.posts ?? 0)}</span>
            <span className="text-text-3 ml-1">Posts</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border-dim">
        <div className="flex px-4">
          {(['posts', 'replies'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2',
                tab === t ? 'border-accent text-text-1' : 'border-transparent text-text-3 hover:text-text-2',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="divide-y divide-border-dim">
        {postsLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="p-4"><PostSkeleton /></div>)
        ) : (postsData?.posts || []).length === 0 ? (
          <div className="py-12 text-center text-text-3 text-sm">No posts yet.</div>
        ) : (
          (postsData?.posts || []).map((p: PostData) => (
            <div key={p.id} className="p-4">
              <PostCard post={p} compact showCommunity />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
