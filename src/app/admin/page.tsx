'use client'

import { useAppStore } from '@/lib/store'
import { AdminLogin } from '@/components/admin/admin-login'
import { AdminShell } from '@/components/admin/admin-shell'
import { useEffect } from 'react'

export default function AdminPage() {
  const adminAuth = useAppStore((s) => s.adminAuth)
  const setAdminPage = useAppStore((s) => s.setAdminPage)
  const adminPage = useAppStore((s) => s.adminPage)

  useEffect(() => {
    // If we land on /admin and we are authenticated, make sure a sub-page is set
    if (adminAuth.isAuthenticated && !adminPage) {
      setAdminPage('admin-dashboard')
    }
  }, [adminAuth.isAuthenticated, adminPage, setAdminPage])

  if (!adminAuth.isAuthenticated) {
    return <AdminLogin />
  }

  return <AdminShell />
}
