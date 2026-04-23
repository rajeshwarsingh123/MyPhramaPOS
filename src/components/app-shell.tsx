'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { useAppStore } from '@/lib/store'
import { DashboardPage } from '@/components/pages/dashboard'
import { BillingPage } from '@/components/pages/billing'
import { MedicinesPage } from '@/components/pages/medicines'
import { StockPage } from '@/components/pages/stock'
import { PurchasesPage } from '@/components/pages/purchases'
import { SuppliersPage } from '@/components/pages/suppliers'
import { ReportsPage } from '@/components/pages/reports'
import { CustomersPage } from '@/components/pages/customers'
import { SettingsPage } from '@/components/pages/settings'

const pages: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  billing: BillingPage,
  medicines: MedicinesPage,
  stock: StockPage,
  purchases: PurchasesPage,
  suppliers: SuppliersPage,
  reports: ReportsPage,
  customers: CustomersPage,
  settings: SettingsPage,
}

export function AppShell() {
  const { currentPage } = useAppStore()
  const PageComponent = pages[currentPage]

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {PageComponent ? <PageComponent /> : <DashboardPage />}
        </main>
        <Footer />
      </div>
    </div>
  )
}
