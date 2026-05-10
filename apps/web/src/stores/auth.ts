import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  handle: string
  email: string
  avatar: string | null
  banner: string | null
  bio: string | null
  website: string | null
  location: string | null
  role: string
  isVerified: boolean
  isOnline: boolean
  lastSeen: string
  emailVerified: boolean
  createdAt: string
  _count?: { followers: number; following: number; posts: number }
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  updateUser: (updates: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('glimpse_token', token)
        set({ user, token, isAuthenticated: true })
      },
      updateUser: (updates) =>
        set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),
      logout: () => {
        localStorage.removeItem('glimpse_token')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'glimpse-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    },
  ),
)
