'use client'

import { useAppStore } from '@/lib/store'
import { LandingPage } from '@/components/landing-page'
import { AppShell } from '@/components/app-shell'

export default function Home() {
  const launchedApp = useAppStore((s) => s.launchedApp)

  if (!launchedApp) return <LandingPage />
  return <AppShell />
}
