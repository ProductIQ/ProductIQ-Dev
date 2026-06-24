// src/stores/useUIStore.ts
import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (value: boolean) => void
  toggleSidebar: () => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (value: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  mobileMenuOpen: false,
  setMobileMenuOpen: (value) => set({ mobileMenuOpen: value }),
}))
