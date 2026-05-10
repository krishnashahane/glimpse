import { create } from 'zustand'

interface UIState {
  composeOpen: boolean
  searchOpen: boolean
  mobileMenuOpen: boolean
  setComposeOpen: (v: boolean) => void
  setSearchOpen: (v: boolean) => void
  setMobileMenuOpen: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  composeOpen: false,
  searchOpen: false,
  mobileMenuOpen: false,
  setComposeOpen: (v) => set({ composeOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setMobileMenuOpen: (v) => set({ mobileMenuOpen: v }),
}))
