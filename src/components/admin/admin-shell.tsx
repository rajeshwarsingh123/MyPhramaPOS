'use client'

import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminNavbar } from '@/components/admin/admin-navbar'
import { AdminLogin } from '@/components/admin/admin-login'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { AdminUsers } from '@/components/admin/admin-users'
import { AdminSubscriptions } from '@/components/admin/admin-subscriptions'
import { AdminPayments } from '@/components/admin/admin-payments'
import { AdminInvoices } from '@/components/admin/admin-invoices'
import { AdminReports } from '@/components/admin/admin-reports'
import { AdminLogs } from '@/components/admin/admin-logs'
import { AdminTickets } from '@/components/admin/admin-tickets'
import { AdminAnnouncements } from '@/components/admin/admin-announcements'
import { AdminSettings } from '@/components/admin/admin-settings'
import { AdminPharmacyMonitor } from '@/components/admin/admin-pharmacy-monitor'
import { SupabaseSetupPage } from '@/components/pages/supabase-setup'


const adminPages: Record<string, React.ComponentType> = {
  'admin-dashboard': AdminDashboard,
  'admin-users': AdminUsers,
  'admin-subscriptions': AdminSubscriptions,
  'admin-payments': AdminPayments,
  'admin-invoices': AdminInvoices,
  'admin-reports': AdminReports,
  'admin-logs': AdminLogs,
  'admin-tickets': AdminTickets,
  'admin-announcements': AdminAnnouncements,
  'admin-settings': AdminSettings,
  'admin-pharmacy-monitor': AdminPharmacyMonitor,
  'admin-supabase': SupabaseSetupPage,
}

export function AdminShell() {
  const { adminPage, adminAuth, adminSidebarCollapsed } = useAppStore()

  // Show login if not authenticated
  if (!adminAuth.isAuthenticated) {
    return <AdminLogin />
  }

  const PageComponent = adminPages[adminPage || 'admin-dashboard']

  return (
    <div className="dark flex h-screen overflow-hidden bg-[oklch(0.12_0.015_250)]">
      <AdminSidebar />

      {/* Main area */}
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 overflow-hidden transition-[margin-left] duration-200',
          // On mobile: no left margin (sidebar overlays)
          'ml-0',
          // On desktop: margin for fixed sidebar
          'lg:ml-64',
          adminSidebarCollapsed && 'lg:ml-16',
        )}
      >
        {/* Top Navbar */}
        <AdminNavbar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 pt-20">
          {PageComponent ? (
            <div className="animate-in fade-in-0 duration-300">
              <PageComponent />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
