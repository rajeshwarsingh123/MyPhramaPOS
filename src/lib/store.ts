import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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
  | 'sales-history'
  | 'settings'

export type AdminPage =
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-subscriptions'
  | 'admin-payments'
  | 'admin-invoices'
  | 'admin-reports'
  | 'admin-logs'
  | 'admin-tickets'
  | 'admin-announcements'
  | 'admin-settings'
  | 'admin-pharmacy-monitor'

export interface AdminAuthState {
  isAuthenticated: boolean
  adminId: string | null
  adminName: string | null
  adminEmail: string | null
  adminRole: 'super_admin' | 'staff' | null
  loginTime: string | null
}

export interface Tenant {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
}

export interface SalesFilters {
  search?: string
  year?: string
  month?: string
  paymentMode?: string
  fromDate?: string
  toDate?: string
}

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
  launchedApp: boolean
  setLaunchedApp: (v: boolean) => void
  showAuth: boolean
  setShowAuth: (v: boolean) => void
  adminPage: AdminPage | null
  setAdminPage: (page: AdminPage | null) => void
  adminAuth: AdminAuthState
  setAdminAuth: (auth: AdminAuthState) => void
  adminSidebarCollapsed: boolean
  setAdminSidebarCollapsed: (v: boolean) => void
  adminSidebarMobileOpen: boolean
  setAdminSidebarMobileOpen: (v: boolean) => void
  currentTenant: Tenant | null
  setCurrentTenant: (tenant: Tenant | null) => void
  salesFilters: SalesFilters
  setSalesFilters: (filters: SalesFilters) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentPage: 'dashboard',
      setCurrentPage: (page) => set({ currentPage: page, sidebarOpen: false }),
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      sidebarCollapsed: false,
      toggleSidebarCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      pendingSearchQuery: '',
      setPendingSearchQuery: (query) => set({ pendingSearchQuery: query }),
      launchedApp: false,
      setLaunchedApp: (v) => set({ launchedApp: v }),
      showAuth: false,
      setShowAuth: (v) => set({ showAuth: v }),
      adminPage: null,
      setAdminPage: (page) => set({ adminPage: page }),
      adminAuth: {
        isAuthenticated: false,
        adminId: null,
        adminName: null,
        adminEmail: null,
        adminRole: null,
        loginTime: null,
      },
      setAdminAuth: (auth) => set({ adminAuth: auth }),
      adminSidebarCollapsed: false,
      setAdminSidebarCollapsed: (v) => set({ adminSidebarCollapsed: v }),
      adminSidebarMobileOpen: false,
      setAdminSidebarMobileOpen: (v) => set({ adminSidebarMobileOpen: v }),
      currentTenant: null,
      setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
      salesFilters: {},
      setSalesFilters: (filters) => set({ salesFilters: filters }),
    }),
    {
      name: 'pharmpos-store',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
        return localStorage
      }),
      partialize: (state) => ({
        adminAuth: state.adminAuth,
        adminSidebarCollapsed: state.adminSidebarCollapsed,
        currentTenant: state.currentTenant,
        launchedApp: state.launchedApp,
        adminPage: state.adminPage,
        currentPage: state.currentPage,
      }),
    }
  )
)
