import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatNumber } from '@/lib/utils'
import { communityApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface CommunityData {
  id: string
  name: string
  slug: string
  description?: string | null
  avatar?: string | null
  memberCount: number
  tags: string[]
  isMember?: boolean
}

export function CommunityCard({ community }: { community: CommunityData }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  const [isMember, setIsMember] = useState(community.isMember ?? false)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (!isAuth) { toast.error('Sign in first'); return }
    setLoading(true)
    try {
      if (isMember) {
        await communityApi.leave(community.slug)
        setIsMember(false)
      } else {
        await communityApi.join(community.slug)
        setIsMember(true)
      }
    } catch {
      toast.error('Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-4 hover:border-border-bright transition-all duration-200">
      <div className="flex items-start gap-3">
        <Avatar src={community.avatar} name={community.name} size="md" />
        <div className="flex-1 min-w-0">
          <Link to={`/c/${community.slug}`} className="font-semibold text-sm text-text-1 hover:text-accent transition-colors block truncate">
            c/{community.name}
          </Link>
          {community.description && (
            <p className="text-xs text-text-3 mt-0.5 line-clamp-2">{community.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-text-3">
              <Users className="w-3 h-3" />
              {formatNumber(community.memberCount)}
            </span>
            {community.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="muted">{t}</Badge>
            ))}
          </div>
        </div>
        <Button
          variant={isMember ? 'outline' : 'primary'}
          size="sm"
          loading={loading}
          onClick={toggle}
        >
          {isMember ? 'Leave' : 'Join'}
        </Button>
      </div>
    </div>
  )
}
