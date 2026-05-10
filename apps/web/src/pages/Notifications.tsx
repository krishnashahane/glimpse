import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Heart, MessageSquare, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { notificationApi } from '@/lib/api'
import { timeAgo, cn } from '@/lib/utils'
import { getSocket } from '@/hooks/useSocket'
import { useAuthStore } from '@/stores/auth'

const ICONS = {
  VOTE: Heart,
  COMMENT: MessageSquare,
  FOLLOW: UserPlus,
  MENTION: Bell,
  COMMUNITY_INVITE: Bell,
}

interface NotifData {
  id: string
  type: keyof typeof ICONS
  read: boolean
  createdAt: string
  data: Record<string, unknown>
  actor: { id: string; username: string; handle: string; avatar: string | null; isVerified: boolean } | null
}

export default function Notifications() {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list().then((r) => r.data),
    enabled: isAuth,
  })

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    socket.on('notification:new', () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-count'] })
    })
    return () => { socket.off('notification:new') }
  }, [qc])

  const markAllRead = async () => {
    await notificationApi.read()
    qc.invalidateQueries({ queryKey: ['notifications'] })
    qc.invalidateQueries({ queryKey: ['notif-count'] })
  }

  const messages: Record<string, string> = {
    VOTE: 'upvoted your post',
    COMMENT: 'replied to your post',
    FOLLOW: 'started following you',
    MENTION: 'mentioned you',
    COMMUNITY_INVITE: 'invited you to a community',
  }

  return (
    <div>
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-md border-b border-border-dim px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent" />
          <h1 className="text-base font-semibold text-text-1">Notifications</h1>
        </div>
        {data?.unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {!isAuth ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-3">
          <p className="font-brand text-2xl mb-2">Sign in to see notifications</p>
          <Link to="/login" className="text-accent text-sm hover:underline">Sign in →</Link>
        </div>
      ) : isLoading ? (
        <PageSpinner />
      ) : (data?.notifications || []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-3">
          <Bell className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-brand text-2xl">All caught up.</p>
        </div>
      ) : (
        <div className="divide-y divide-border-dim">
          {(data?.notifications || []).map((n: NotifData) => {
            const Icon = ICONS[n.type] || Bell
            return (
              <div key={n.id} className={cn('flex items-start gap-3 p-4 hover:bg-elevated/50 transition-colors', !n.read && 'bg-accent-dim/30')}>
                <div className={cn('p-2 rounded-xl flex-shrink-0', !n.read ? 'bg-accent-dim text-accent' : 'bg-elevated text-text-3')}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-1">
                    {n.actor ? (
                      <Link to={`/u/${n.actor.handle}`} className="font-medium hover:text-accent transition-colors">
                        @{n.actor.handle}
                      </Link>
                    ) : (
                      <span className="font-medium text-text-2">Someone</span>
                    )}{' '}
                    {messages[n.type] || 'interacted with you'}
                  </p>
                  <p className="text-xs text-text-3 mt-0.5">{timeAgo(n.createdAt)}</p>
                </div>
                {n.actor && <Avatar src={n.actor.avatar} name={n.actor.username} size="xs" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
