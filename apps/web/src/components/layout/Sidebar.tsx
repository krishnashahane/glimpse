import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Compass, Users, Newspaper, Bell, User, Settings, PenSquare, LogOut, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { authApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { notificationApi } from '@/lib/api'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/trending', icon: TrendingUp, label: 'Trending' },
  { to: '/communities', icon: Users, label: 'Communities' },
  { to: '/news', icon: Newspaper, label: 'News' },
]

const AUTH_NAV = [
  { to: '/notifications', icon: Bell, label: 'Notifications', badge: true },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const setComposeOpen = useUIStore((s) => s.setComposeOpen)

  const { data: notifData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => notificationApi.unreadCount().then((r) => r.data),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })
  const unread = notifData?.count ?? 0

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      logout()
      navigate('/login')
      toast.success('Logged out')
    }
  }

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0 py-6 px-3">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-1 px-3 mb-8">
        <span className="font-brand text-2xl font-bold text-text-1 tracking-tight">
          Glimpse<span className="text-accent">.</span>
        </span>
      </Link>

      {/* Compose */}
      {isAuthenticated && (
        <Button
          onClick={() => setComposeOpen(true)}
          className="mb-6 gap-2 justify-start pl-3"
          size="md"
        >
          <PenSquare className="w-4 h-4" />
          New Post
        </Button>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
          return (
            <Link key={to} to={to} className={cn('nav-item', active && 'active')}>
              <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: '18px', height: '18px' }} />
              {label}
            </Link>
          )
        })}

        {isAuthenticated && (
          <>
            {AUTH_NAV.map(({ to, icon: Icon, label, badge }) => {
              const active = location.pathname === to
              return (
                <Link key={to} to={to} className={cn('nav-item relative', active && 'active')}>
                  <Icon style={{ width: '18px', height: '18px' }} className="flex-shrink-0" />
                  {label}
                  {badge && unread > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto bg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                    >
                      {unread > 99 ? '99+' : unread}
                    </motion.span>
                  )}
                </Link>
              )
            })}
            <Link to={user ? `/u/${user.handle}` : '/login'} className={cn('nav-item', location.pathname === `/u/${user?.handle}` && 'active')}>
              <User style={{ width: '18px', height: '18px' }} className="flex-shrink-0" />
              Profile
            </Link>
          </>
        )}
      </nav>

      {/* Bottom */}
      {isAuthenticated && user ? (
        <div className="mt-4">
          <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-elevated transition-colors cursor-pointer" onClick={() => navigate(`/u/${user.handle}`)}>
            <Avatar src={user.avatar} name={user.username} size="sm" online={user.isOnline} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-1 truncate">{user.username}</p>
              <p className="text-xs text-text-3 truncate">@{user.handle}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleLogout() }} className="p-1.5 text-text-3 hover:text-danger transition-colors rounded-lg">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="primary" onClick={() => navigate('/register')}>Get Started</Button>
          <Button variant="ghost" onClick={() => navigate('/login')}>Sign In</Button>
        </div>
      )}

      <Link to="/settings" className="flex items-center gap-2 mt-2 px-3 py-1.5 text-xs text-text-3 hover:text-text-2 transition-colors">
        <Settings className="w-3.5 h-3.5" />
        Settings
      </Link>
    </aside>
  )
}
