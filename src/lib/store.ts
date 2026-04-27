import { create } from 'zustand'

export type Page = 
  | 'dashboard'
  | 'billing'
  | 'medicines'
  | 'stock'
  | 'purchases'
  | 'suppliers'
  | 'reports'
  | 'customers'
  | 'sales-returns'
  | 'invoice-history'
  | 'settings'

interface AppState {
  currentPage: Page
  setCurrentPage: (page: Page) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  sidebarCollapsed: boolean
  toggleSidebarCollapse: () => void
  pendingSearchQuery: string
  setPendingSearchQuery: (query: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  sidebarCollapsed: false,
  toggleSidebarCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  pendingSearchQuery: '',
  setPendingSearchQuery: (query) => set({ pendingSearchQuery: query }),
}))
