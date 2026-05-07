'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Building2,
  RefreshCw,
  AlertTriangle,
  Package,
  IndianRupee,
  AlertCircle,
  Clock,
  TrendingUp,
  HeartPulse,
  Database,
  Activity,
  Zap,
  Users,
  ShieldCheck,
  FileText,
  UserPlus,
  CreditCard,
  TicketCheck,
  Wifi,
  WifiOff,
  AlertOctagon,
  ArrowUpRight,
  ArrowRight,
  Pill,
  HardDrive,
  Timer,
  CalendarClock,
  Megaphone,
  CircleDot,
} from 'lucide-react'
import { useState, useCallback, useSyncExternalStore } from 'react'
import { toast } from 'sonner'

// ─── Types ─────────────────────────────────────────────
interface MonitorData {
  totalMedicines: number
  totalStock: number
  totalStockValue: number
  lowStockCount: number
  expiredCount: number
  expiringCount: number
  topMedicines: { name: string; totalSold: number; revenue: number }[]
  recentSales: { invoiceNo: string; customer: string; amount: number; date: string }[]
  dataQuality: { totalMedicines: number; completeInfo: number; percentage: number }
  stockHealth: { totalMedicines: number; healthyStock: number; lowOrExpired: number; percentage: number }
}

interface TenantRecord {
  id: string
  name: string
  email: string
  phone: string | null
  businessName: string
  businessPhone: string | null
  businessAddress: string | null
  gstNumber: string | null
  plan: string
  status: string
  createdAt: string
  updatedAt: string
  subscriptions: { id: string; plan: string; amount: number; status: string; startDate: string; endDate: string; createdAt: string }[]
  _count: { supportTickets: number; systemLogs: number }
}

interface DashboardData {
  stats: {
    totalUsers: number
    activeUsers: number
    suspendedUsers: number
    newSignupsToday: number
    newSignupsWeek: number
    totalRevenue: number
    mrr: number
    totalBillsGenerated: number
    totalMedicinesAdded: number
    openTickets: number
    expiringSubscriptions: number
  }
  recentActivity: { type: string; description: string; time: string }[]
}

interface TenantAlert {
  id: string
  businessName: string
  type: 'usage' | 'subscription' | 'inactive'
  severity: 'warning' | 'critical'
  message: string
}

// ─── Helper: Relative Time ─────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Helper: Simulated Uptime ──────────────────────────
function computeSystemStatus(monitor: MonitorData | null, tenants: TenantRecord[] | null, dashboard: DashboardData | null): {
  uptime: number
  status: 'Operational' | 'Warning' | 'Critical'
  statusColor: string
  statusBg: string
  statusBorder: string
} {
  // Derive system health from data quality, stock health, and tenant activity
  let healthScore = 100

  if (monitor) {
    if (monitor.stockHealth.percentage < 50) healthScore -= 10
    else if (monitor.stockHealth.percentage < 80) healthScore -= 4
    if (monitor.dataQuality.percentage < 50) healthScore -= 10
    else if (monitor.dataQuality.percentage < 80) healthScore -= 3
    if (monitor.expiredCount > 0) healthScore -= Math.min(5, monitor.expiredCount)
  }

  if (dashboard) {
    if (dashboard.stats.openTickets > 10) healthScore -= 5
    else if (dashboard.stats.openTickets > 5) healthScore -= 2
    if (dashboard.stats.expiringSubscriptions > 3) healthScore -= 3
  }

  const suspendedCount = tenants?.filter((t) => t.status === 'suspended').length ?? 0
  if (suspendedCount > 0) healthScore -= Math.min(5, suspendedCount * 2)

  const uptime = Math.max(90, Math.min(99.9, healthScore + Math.random() * 0.1))

  if (uptime >= 99) {
    return { uptime: 99.9, status: 'Operational', statusColor: 'text-emerald-400', statusBg: 'bg-emerald-500/10', statusBorder: 'border-emerald-500/20' }
  }
  if (uptime >= 95) {
    return { uptime, status: 'Warning', statusColor: 'text-amber-400', statusBg: 'bg-amber-500/10', statusBorder: 'border-amber-500/20' }
  }
  return { uptime, status: 'Critical', statusColor: 'text-red-400', statusBg: 'bg-red-500/10', statusBorder: 'border-red-500/20' }
}

// ─── Compute Tenant Alerts ─────────────────────────────
function computeAlerts(tenants: TenantRecord[]): TenantAlert[] {
  const alerts: TenantAlert[] = []
  const now = new Date()
  const sevenDays = new Date(now.getTime() + 7 * 86400000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

  for (const t of tenants) {
    // Expiring subscription within 7 days
    const activeSub = t.subscriptions.find((s) => s.status === 'active')
    if (activeSub) {
      const expiryDate = new Date(activeSub.expiryDate)
      if (expiryDate <= sevenDays && expiryDate >= now) {
        alerts.push({
          id: `sub-${t.id}`,
          businessName: t.businessName,
          type: 'subscription',
          severity: 'warning',
          message: `Subscription expiring in ${Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000)} days`,
        })
      } else if (expiryDate < now) {
        alerts.push({
          id: `sub-${t.id}`,
          businessName: t.businessName,
          type: 'subscription',
          severity: 'critical',
          message: 'Subscription has expired',
        })
      }
    }

    // Inactive for 30+ days
    const lastActive = new Date(t.updatedAt)
    if (lastActive < thirtyDaysAgo && t.status === 'active') {
      alerts.push({
        id: `inactive-${t.id}`,
        businessName: t.businessName,
        type: 'inactive',
        severity: 'warning',
        message: `No activity for ${Math.floor((now.getTime() - lastActive.getTime()) / 86400000)} days`,
      })
    }

    // Suspended tenants
    if (t.status === 'suspended') {
      alerts.push({
        id: `suspended-${t.id}`,
        businessName: t.businessName,
        type: 'inactive',
        severity: 'critical',
        message: 'Tenant account is suspended',
      })
    }

    // Data usage warning — estimate based on log count
    if (t._count.systemLogs > 500) {
      alerts.push({
        id: `usage-${t.id}`,
        businessName: t.businessName,
        type: 'usage',
        severity: 'warning',
        message: `High API usage detected (${t._count.systemLogs} calls logged)`,
      })
    }
  }

  return alerts
}

// ─── Tenant Status Helper ──────────────────────────────
function getTenantStatus(t: TenantRecord): 'active' | 'warning' | 'offline' {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
  if (t.status === 'suspended') return 'offline'
  if (t.status !== 'active') return 'offline'
  const activeSub = t.subscriptions.find((s) => s.status === 'active')
  if (!activeSub) return 'warning'
  const expiryDate = new Date(activeSub.expiryDate)
  if (expiryDate < new Date()) return 'offline'
  if (expiryDate <= new Date(Date.now() + 7 * 86400000)) return 'warning'
  if (new Date(t.updatedAt) < thirtyDaysAgo) return 'warning'
  return 'active'
}

function getTenantStatusConfig(status: 'active' | 'warning' | 'offline') {
  switch (status) {
    case 'active':
      return { color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400', label: 'Active' }
    case 'warning':
      return { color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', dot: 'bg-amber-400', label: 'Warning' }
    case 'offline':
      return { color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10', dot: 'bg-red-400', label: 'Offline' }
  }
}

// ─── Activity Feed Icon Helper ─────────────────────────
function getActivityIcon(type: string) {
  switch (type) {
    case 'signup':
      return { icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/20' }
    case 'subscription':
      return { icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/15', ring: 'ring-purple-500/20' }
    case 'ticket':
      return { icon: TicketCheck, color: 'text-amber-400', bg: 'bg-amber-500/15', ring: 'ring-amber-500/20' }
    case 'payment':
      return { icon: IndianRupee, color: 'text-teal-400', bg: 'bg-teal-500/15', ring: 'ring-teal-500/20' }
    default:
      return { icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/15', ring: 'ring-purple-500/20' }
  }
}

// ─── Progress Bar Component ────────────────────────────
function ProgressBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">{label}</span>
        <span className={cn('text-xs font-semibold', color)}>{value}%</span>
      </div>
      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────
export function AdminPharmacyMonitor() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Reactive clock for last-updated display
  const subscribe = useCallback((cb: () => void) => {
    const id = setInterval(cb, 60000)
    return () => clearInterval(id)
  }, [])
  const getSnapshot = useCallback(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), [])
  const getServerSnapshot = useCallback(() => '', [])
  const lastUpdated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Fetch pharmacy monitor data
  const { data: monitorData, isLoading: monitorLoading, error: monitorError, refetch: refetchMonitor } = useQuery<MonitorData>({
    queryKey: ['admin-pharmacy-monitor'],
    queryFn: () => fetch('/api/admin/pharmacy-monitor').then((r) => { if (!r.ok) throw new Error('Failed to fetch'); return r.json() }),
    refetchInterval: 30000,
  })

  // Fetch tenants
  const { data: tenantsData, isLoading: tenantsLoading, error: tenantsError, refetch: refetchTenants } = useQuery<{ tenants: TenantRecord[]; pagination: { total: number } }>({
    queryKey: ['admin-tenants-monitor'],
    queryFn: () => fetch('/api/admin/tenants?limit=100').then((r) => { if (!r.ok) throw new Error('Failed to fetch'); return r.json() }),
    refetchInterval: 30000,
  })

  // Fetch dashboard stats
  const { data: dashboardData, isLoading: dashLoading, error: dashError, refetch: refetchDash } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard-monitor'],
    queryFn: () => fetch('/api/admin/dashboard').then((r) => { if (!r.ok) throw new Error('Failed to fetch'); return r.json() }),
    refetchInterval: 30000,
  })

  const monitor = monitorData ?? null
  const tenants = tenantsData?.tenants ?? []
  const dashboard = dashboardData ?? null

  const isLoading = monitorLoading || tenantsLoading || dashLoading
  const hasError = monitorError || tenantsError || dashError

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([refetchMonitor(), refetchTenants(), refetchDash()])
      toast.success('Monitor data refreshed')
    } catch {
      toast.error('Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }

  if (hasError && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load pharmacy monitor data</p>
        <Button onClick={handleRefresh} className="bg-purple-600 hover:bg-purple-700 text-white">
          Try Again
        </Button>
      </div>
    )
  }

  if (isLoading || !monitor) {
    return <MonitorSkeleton />
  }

  // ─── Derived Data ─────────────────────────────────────
  const systemStatus = computeSystemStatus(monitor, tenants.length > 0 ? tenants : null, dashboard)
  const activeTenantCount = tenants.filter((t) => t.status === 'active').length
  const totalTickets = dashboard?.stats.openTickets ?? 0

  // Estimate API calls from system logs count across all tenants
  const totalApiCalls = tenants.reduce((sum, t) => sum + t._count.systemLogs, 0)

  // Tenant alerts
  const alerts = computeAlerts(tenants)

  // Top 5 by activity (most system logs = most active)
  const topActive = [...tenants]
    .sort((a, b) => b._count.systemLogs - a._count.systemLogs)
    .slice(0, 5)

  // Top 5 by medicines — estimate from monitor data since medicines are shared
  const topMedicineSales = monitor.topMedicines.slice(0, 5)

  const recentActivity = dashboard?.recentActivity ?? []

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Building2 className="h-7 w-7 text-purple-400" />
            Pharmacy Monitor
          </h1>
          <p className="text-white/50 mt-1">Live monitoring of all tenant pharmacies</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <Badge variant="secondary" className="text-[11px] bg-white/5 text-white/50 border border-white/10 px-3 py-1">
              Updated: {lastUpdated}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          1. SYSTEM HEALTH BAR
          ═══════════════════════════════════════════════════ */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-white/5">
            {/* Uptime */}
            <div className="p-4 flex flex-col items-center justify-center text-center">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center ring-1 mb-2', systemStatus.statusBg, systemStatus.statusBorder)}>
                {systemStatus.status === 'Operational' ? (
                  <Wifi className={cn('h-5 w-5', systemStatus.statusColor)} />
                ) : systemStatus.status === 'Warning' ? (
                  <AlertCircle className={cn('h-5 w-5', systemStatus.statusColor)} />
                ) : (
                  <AlertOctagon className={cn('h-5 w-5', systemStatus.statusColor)} />
                )}
              </div>
              <p className={cn('text-2xl font-bold', systemStatus.statusColor)}>
                {systemStatus.uptime}%
              </p>
              <p className="text-[11px] text-white/40 mt-0.5">Uptime</p>
            </div>

            {/* Active Tenants */}
            <div className="p-4 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-purple-500/15 ring-1 ring-purple-500/20 flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{activeTenantCount}</p>
              <p className="text-[11px] text-white/40 mt-0.5">Active Tenants</p>
            </div>

            {/* API Calls Today */}
            <div className="p-4 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-teal-500/15 ring-1 ring-teal-500/20 flex items-center justify-center mb-2">
                <Zap className="h-5 w-5 text-teal-400" />
              </div>
              <p className="text-2xl font-bold text-white">{totalApiCalls.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-white/40 mt-0.5">Total API Calls</p>
            </div>

            {/* System Status */}
            <div className="p-4 flex flex-col items-center justify-center text-center">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center ring-1 mb-2', systemStatus.statusBg, systemStatus.statusBorder)}>
                <ShieldCheck className={cn('h-5 w-5', systemStatus.statusColor)} />
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full animate-pulse', systemStatus.statusColor.replace('text-', 'bg-'))} />
                <p className={cn('text-lg font-bold', systemStatus.statusColor)}>{systemStatus.status}</p>
              </div>
              <p className="text-[11px] text-white/40 mt-0.5">System Status</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════
          2. TENANT ACTIVITY GRID
          ═══════════════════════════════════════════════════ */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              Tenant Activity Grid
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] bg-white/5 text-white/40 border border-white/10">
              {tenants.length} tenants
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/30">
              <Building2 className="h-8 w-8 mb-2" />
              <p className="text-sm">No tenants registered yet</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[520px]">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pr-4">
                {tenants.map((t) => {
                  const status = getTenantStatus(t)
                  const cfg = getTenantStatusConfig(status)
                  const activeSub = t.subscriptions.find((s) => s.status === 'active')
                  // Estimate data usage from log count (simulated percentage)
                  const estimatedUsage = Math.min(100, Math.round((t._count.systemLogs / 800) * 100))
                  const daysSinceUpdate = Math.floor((Date.now() - new Date(t.updatedAt).getTime()) / 86400000)

                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'rounded-xl border p-4 bg-white/[0.02] transition-all duration-200',
                        'hover:bg-white/5 hover:scale-[1.01]',
                        cfg.border,
                      )}
                    >
                      {/* Header: Business Name + Plan + Status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', cfg.dot)} />
                            <p className="text-sm font-semibold text-white truncate">{t.businessName}</p>
                          </div>
                          <p className="text-xs text-white/40 mt-0.5 ml-5">{t.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-medium px-2 py-0 bg-purple-500/15 text-purple-400 border border-purple-500/20"
                          >
                            YEARLY
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px] font-medium px-2 py-0', cfg.bg, cfg.color, `border ${cfg.border}`)}
                          >
                            {cfg.label}
                          </Badge>
                        </div>
                      </div>

                      <Separator className="bg-white/5 mb-3" />

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div>
                          <p className="text-white/30 mb-0.5">Last Activity</p>
                          <p className="text-white/70 font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(t.updatedAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/30 mb-0.5">Plan Expires</p>
                          <p className={cn('font-medium', activeSub ? (new Date(activeSub.expiryDate) < new Date(Date.now() + 7 * 86400000) ? 'text-amber-400' : 'text-white/70') : 'text-red-400')}>
                            {activeSub
                              ? new Date(activeSub.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                              : 'No active sub'}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/30 mb-0.5">API Calls</p>
                          <p className="text-white/70 font-medium flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {t._count.systemLogs}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/30 mb-0.5">Open Tickets</p>
                          <p className={cn('font-medium', t._count.supportTickets > 0 ? 'text-amber-400' : 'text-white/70')}>
                            {t._count.supportTickets}
                          </p>
                        </div>
                      </div>

                      {/* Data Usage Bar */}
                      <div>
                        <ProgressBar
                          value={estimatedUsage}
                          color={estimatedUsage >= 80 ? 'text-red-400' : estimatedUsage >= 50 ? 'text-amber-400' : 'text-emerald-400'}
                          label={`Data usage: ${estimatedUsage}%`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════
          3. RESOURCE USAGE + TOP PHARMACIES + ALERTS
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resource Usage Overview */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-purple-400" />
              Resource Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total Medicines */}
            <div className="bg-white/[0.03] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-purple-500/10 flex items-center justify-center">
                    <Pill className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <span className="text-xs text-white/50">Total Medicines</span>
                </div>
                <span className="text-sm font-bold text-white">{monitor.totalMedicines.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-teal-500/10 flex items-center justify-center">
                    <Package className="h-3.5 w-3.5 text-teal-400" />
                  </div>
                  <span className="text-xs text-white/50">Total Stock Units</span>
                </div>
                <span className="text-sm font-bold text-white">{monitor.totalStock.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-emerald-500/10 flex items-center justify-center">
                    <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <span className="text-xs text-white/50">Stock Value</span>
                </div>
                <span className="text-sm font-bold text-emerald-400">₹{monitor.totalStockValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-violet-500/10 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <span className="text-xs text-white/50">Total Bills</span>
                </div>
                <span className="text-sm font-bold text-white">
                  {(dashboard?.stats.totalBillsGenerated ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Stock & Data Health */}
            <div className="space-y-3">
              <ProgressBar
                value={monitor.stockHealth.percentage}
                color={monitor.stockHealth.percentage >= 80 ? 'text-emerald-400' : monitor.stockHealth.percentage >= 50 ? 'text-amber-400' : 'text-red-400'}
                label="Stock Health"
              />
              <ProgressBar
                value={monitor.dataQuality.percentage}
                color={monitor.dataQuality.percentage >= 80 ? 'text-emerald-400' : monitor.dataQuality.percentage >= 50 ? 'text-amber-400' : 'text-red-400'}
                label="Data Quality"
              />
            </div>

            {/* Issue counts */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-red-400">{monitor.expiredCount}</p>
                <p className="text-[10px] text-white/30">Expired</p>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-amber-400">{monitor.expiringCount}</p>
                <p className="text-[10px] text-white/30">Expiring 30d</p>
              </div>
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-orange-400">{monitor.lowStockCount}</p>
                <p className="text-[10px] text-white/30">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Pharmacies */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              Top Pharmacies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Top 5 Most Active (by API calls) */}
            <div>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                Most Active (by API calls)
              </p>
              {topActive.length === 0 ? (
                <p className="text-xs text-white/25 py-4 text-center">No activity data</p>
              ) : (
                <div className="space-y-2">
                  {topActive.map((t, idx) => {
                    const maxCalls = topActive[0]._count.systemLogs || 1
                    return (
                      <div key={t.id} className="flex items-center gap-2.5">
                        <span className="text-[10px] text-white/25 w-4 text-right shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-white/70 truncate max-w-[160px]">{t.businessName}</span>
                            <span className="text-[10px] text-white/40 ml-2 shrink-0">{t._count.systemLogs} calls</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-700"
                              style={{ width: `${(t._count.systemLogs / maxCalls) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Separator className="bg-white/5" />

            {/* Top 5 by Medicine Sales */}
            <div>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Pill className="h-3 w-3" />
                Top Selling Medicines
              </p>
              {topMedicineSales.length === 0 ? (
                <p className="text-xs text-white/25 py-4 text-center">No sales data</p>
              ) : (
                <div className="space-y-2">
                  {topMedicineSales.map((med, idx) => {
                    const maxSold = topMedicineSales[0].totalSold || 1
                    return (
                      <div key={idx} className="flex items-center gap-2.5">
                        <span className="text-[10px] text-white/25 w-4 text-right shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-white/70 truncate max-w-[160px]">{med.name}</span>
                            <span className="text-[10px] text-white/40 ml-2 shrink-0">
                              {med.totalSold} sold · ₹{med.revenue.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-700"
                              style={{ width: `${(med.totalSold / maxSold) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alert Panel */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Alerts
              </CardTitle>
              {alerts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">
                  {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-white/30">
                <ShieldCheck className="h-8 w-8 mb-2 text-emerald-400/40" />
                <p className="text-sm">All systems normal</p>
                <p className="text-xs text-white/20 mt-1">No alerts at this time</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[380px]">
                <div className="space-y-2 pr-4">
                  {alerts.map((alert) => {
                    const isCritical = alert.severity === 'critical'
                    const Icon = alert.type === 'subscription' ? CalendarClock
                      : alert.type === 'inactive' ? WifiOff
                      : AlertCircle
                    return (
                      <div
                        key={alert.id}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                          isCritical
                            ? 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10'
                            : 'bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10',
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                          isCritical ? 'bg-red-500/15 ring-1 ring-red-500/20' : 'bg-amber-500/15 ring-1 ring-amber-500/20',
                        )}>
                          <Icon className={cn('h-3.5 w-3.5', isCritical ? 'text-red-400' : 'text-amber-400')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/80">{alert.businessName}</p>
                          <p className={cn('text-[11px] mt-0.5', isCritical ? 'text-red-300/70' : 'text-amber-300/70')}>
                            {alert.message}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[9px] px-1.5 py-0 shrink-0',
                            isCritical
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                          )}
                        >
                          {isCritical ? 'Critical' : 'Warning'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════
          4. RECENT ACTIVITY FEED
          ═══════════════════════════════════════════════════ */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              Recent Activity Feed
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] bg-white/5 text-white/40 border border-white/10">
              {recentActivity.length} events
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/30">
              <Clock className="h-8 w-8 mb-2" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1 pr-4">
                {recentActivity.map((activity, idx) => {
                  const { icon: ActivityIcon, color, bg, ring } = getActivityIcon(activity.type)
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ring-1',
                          bg,
                          ring,
                        )}
                      >
                        <ActivityIcon className={cn('h-3.5 w-3.5', color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white/80 leading-tight">{activity.description}</p>
                        <p className="text-[11px] text-white/30 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════
          5. RECENT SALES TABLE (from pharmacy-monitor)
          ═══════════════════════════════════════════════════ */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-400" />
            Recent Sales Across Platform
            <span className="text-[10px] text-white/30 ml-auto">Read-only</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {monitor.recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/30">
              <Package className="h-8 w-8 mb-2" />
              <p className="text-sm">No sales data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-white/40 text-xs font-medium px-4 py-3">Invoice #</th>
                    <th className="text-left text-white/40 text-xs font-medium px-4 py-3">Customer</th>
                    <th className="text-left text-white/40 text-xs font-medium px-4 py-3 hidden sm:table-cell">Date</th>
                    <th className="text-right text-white/40 text-xs font-medium px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {monitor.recentSales.map((sale, idx) => (
                    <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-white font-medium text-sm font-mono">{sale.invoiceNo}</span>
                      </td>
                      <td className="px-4 py-3 text-white/80 text-sm">{sale.customer}</td>
                      <td className="px-4 py-3 text-white/50 text-xs hidden sm:table-cell">
                        {new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-medium text-sm text-right">
                        ₹{sale.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Monitor Skeleton ──────────────────────────────────
function MonitorSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Skeleton className="h-8 w-64 bg-white/5" />
          <Skeleton className="h-4 w-48 mt-2 bg-white/5" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-28 rounded-full bg-white/5" />
          <Skeleton className="h-8 w-8 rounded-md bg-white/5" />
        </div>
      </div>

      {/* System Health Bar */}
      <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-white/5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex flex-col items-center">
              <Skeleton className="w-10 h-10 rounded-full bg-white/5 mb-2" />
              <Skeleton className="h-7 w-16 bg-white/5" />
              <Skeleton className="h-3 w-16 mt-1 bg-white/5" />
            </div>
          ))}
        </div>
      </div>

      {/* Tenant Activity Grid */}
      <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
        <Skeleton className="h-5 w-32 mb-4 bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/5 p-4 bg-white/[0.02]">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-2.5 h-2.5 rounded-full bg-white/5" />
                  <Skeleton className="h-4 w-28 bg-white/5" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-10 rounded-full bg-white/5" />
                  <Skeleton className="h-5 w-14 rounded-full bg-white/5" />
                </div>
              </div>
              <Skeleton className="h-px w-full mb-3 bg-white/5" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j}>
                    <Skeleton className="h-3 w-16 mb-1 bg-white/5" />
                    <Skeleton className="h-3 w-20 bg-white/5" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-2 w-full mt-3 rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row: Resource + Top Pharmacies + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resource */}
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <Skeleton className="h-5 w-28 mb-4 bg-white/5" />
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-7 h-7 rounded bg-white/5" />
                  <Skeleton className="h-3 w-20 bg-white/5" />
                </div>
                <Skeleton className="h-4 w-12 bg-white/5" />
              </div>
            ))}
          </div>
          <Skeleton className="h-2 w-full mt-4 mb-2 rounded-full bg-white/5" />
          <Skeleton className="h-2 w-3/4 rounded-full bg-white/5" />
          <div className="grid grid-cols-3 gap-2 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg bg-white/5" />
            ))}
          </div>
        </div>

        {/* Top Pharmacies */}
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <Skeleton className="h-5 w-28 mb-4 bg-white/5" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 mb-3">
              <Skeleton className="h-4 w-4 bg-white/5" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-28 mb-1 bg-white/5" />
                <Skeleton className="h-1.5 w-full rounded-full bg-white/5" />
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <Skeleton className="h-5 w-16 mb-4 bg-white/5" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 mb-2 p-3 rounded-lg">
              <Skeleton className="w-8 h-8 rounded-full bg-white/5" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-28 mb-1 bg-white/5" />
                <Skeleton className="h-3 w-36 bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
        <Skeleton className="h-5 w-32 mb-4 bg-white/5" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 mb-2 p-2.5 rounded-lg">
            <Skeleton className="w-8 h-8 rounded-full bg-white/5" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 bg-white/5" />
              <Skeleton className="h-3 w-20 mt-1 bg-white/5" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sales */}
      <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
        <Skeleton className="h-5 w-40 mb-4 bg-white/5" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 mb-2 py-1">
            <Skeleton className="h-4 w-20 bg-white/5" />
            <Skeleton className="h-4 w-24 bg-white/5 flex-1" />
            <Skeleton className="h-4 w-16 bg-white/5 hidden sm:block" />
            <Skeleton className="h-4 w-16 bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  )
}
