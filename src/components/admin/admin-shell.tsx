'use client'

import { useAppStore } from '@/lib/store'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { AdminUsers } from '@/components/admin/admin-users'
import { AdminSubscriptions } from '@/components/admin/admin-subscriptions'
import { AdminReports } from '@/components/admin/admin-reports'
import { AdminTickets } from '@/components/admin/admin-tickets'
import { AdminAnnouncements } from '@/components/admin/admin-announcements'
import { AdminSettings } from '@/components/admin/admin-settings'

const adminPages: Record<string, React.ComponentType> = {
  'admin-dashboard': AdminDashboard,
  'admin-users': AdminUsers,
  'admin-subscriptions': AdminSubscriptions,
  'admin-reports': AdminReports,
  'admin-tickets': AdminTickets,
  'admin-announcements': AdminAnnouncements,
  'admin-settings': AdminSettings,
}

export function AdminShell() {
  const { adminPage } = useAppStore()
  const PageComponent = adminPages[adminPage || 'admin-dashboard']

  return (
    <div className="flex h-screen overflow-hidden bg-[oklch(0.12_0.015_250)]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-64">
        <main className="flex-1 overflow-y-auto p-6">
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
