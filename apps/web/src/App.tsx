import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageSpinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/stores/auth'
import { useSocket } from '@/hooks/useSocket'

const Home = lazy(() => import('@/pages/Home'))
const Explore = lazy(() => import('@/pages/Explore'))
const PostDetail = lazy(() => import('@/pages/PostDetail'))
const Profile = lazy(() => import('@/pages/Profile'))
const Communities = lazy(() => import('@/pages/Communities'))
const CommunityDetail = lazy(() => import('@/pages/CommunityDetail'))
const News = lazy(() => import('@/pages/News'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const Settings = lazy(() => import('@/pages/Settings'))
const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function SocketInit() {
  useSocket()
  return null
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  if (!isAuth) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SocketInit />
        <Suspense fallback={<div className="min-h-screen bg-base flex items-center justify-center"><PageSpinner /></div>}>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* App routes */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/trending" element={<Home />} />
              <Route path="/communities" element={<Communities />} />
              <Route path="/c/:slug" element={<CommunityDetail />} />
              <Route path="/p/:id" element={<PostDetail />} />
              <Route path="/u/:handle" element={<Profile />} />
              <Route path="/news" element={<News />} />
              <Route
                path="/notifications"
                element={<AuthGuard><Notifications /></AuthGuard>}
              />
              <Route
                path="/settings"
                element={<AuthGuard><Settings /></AuthGuard>}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
