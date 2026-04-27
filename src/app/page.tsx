'use client'

import { useAppStore } from '@/lib/store'
import { LandingPage } from '@/components/landing-page'
import { AppShell } from '@/components/app-shell'
import { AdminShell } from '@/components/admin/admin-shell'

export default function Home() {
  const launchedApp = useAppStore((s) => s.launchedApp)
  const adminPage = useAppStore((s) => s.adminPage)

  if (adminPage) return <AdminShell />
  if (!launchedApp) return <LandingPage />
  return <AppShell />
}
