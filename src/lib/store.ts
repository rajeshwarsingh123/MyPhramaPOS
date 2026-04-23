import { create } from 'zustand'

export type Page = 
  | 'dashboard'
  | 'billing'
  | 'medicines'
  | 'stock'
  | 'purchases'
  | 'reports'
  | 'customers'
  | 'settings'

interface AppState {
  currentPage: Page
  setCurrentPage: (page: Page) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
