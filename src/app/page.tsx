'use client'

import { useAppStore } from '@/lib/store'
import { LandingPage } from '@/components/landing-page'
import { AppShell } from '@/components/app-shell'
import { AdminShell } from '@/components/admin/admin-shell'
import { AuthPage } from '@/components/auth-page'
import { AnimatePresence } from 'framer-motion'

export default function Home() {
  const launchedApp = useAppStore((s) => s.launchedApp)
  const adminPage = useAppStore((s) => s.adminPage)
  const showAuth = useAppStore((s) => s.showAuth)
  const adminAuth = useAppStore((s) => s.adminAuth)

  if (adminPage) return <AdminShell />
  if (launchedApp) return <AppShell />
  return (
    <>
      <LandingPage />
      <AnimatePresence>
        {showAuth && <AuthPage />}
      </AnimatePresence>
    </>
  )
}
