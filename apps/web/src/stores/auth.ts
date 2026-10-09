import { create } from 'zustand'
import { setAccessToken } from '@/lib/api'

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
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => {
    setAccessToken(token)
    set({ user, token, isAuthenticated: true })
  },
  updateUser: (updates) =>
    set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
  logout: () => {
    setAccessToken(null)
    set({ user: null, token: null, isAuthenticated: false })
  },
  clearAuth: () => {
    setAccessToken(null)
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
