'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3,
  DollarSign,
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  UserCheck,
  UserX,
  RefreshCw,
  CalendarDays,
  Activity,
} from 'lucide-react'

export function AdminReports() {
  const { data: dashboardData, isLoading: dashLoading, error: dashError, refetch: dashRefetch } = useQuery({
    queryKey: ['admin-dashboard-reports'],
    queryFn: () => fetch('/api/admin/dashboard').then((r) => r.json()),
  })

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['admin-tenants-reports'],
    queryFn: () => fetch('/api/admin/tenants?search=&page=1&limit=1000').then((r) => r.json()),
  })

  const isLoading = dashLoading || tenantsLoading

  if (dashError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load report data</p>
        <Button onClick={() => dashRefetch()} className="bg-primary hover:bg-primary/80 text-white">
          Try Again
        </Button>
      </div>
    )
  }

  const stats = dashboardData?.stats ?? {}
  const tenants = tenantsData?.tenants ?? []

  const totalRevenue = stats.totalRevenue ?? 0
  const totalUsers = stats.totalUsers ?? 0
  const activeUsers = stats.activeUsers ?? 0
  const suspendedUsers = stats.suspendedUsers ?? 0
  const newSignupsToday = stats.newSignupsToday ?? 0
  const openTickets = stats.openTickets ?? 0
  const planDistribution = dashboardData?.planDistribution ?? { free: 0, pro: 0 }

  // Compute user growth by month (from tenant createdAt)
  const monthlyGrowth: Record<string, number> = {}
  tenants.forEach((t: Record<string, string>) => {
    if (t.createdAt) {
      const monthKey = new Date(t.createdAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      monthlyGrowth[monthKey] = (monthlyGrowth[monthKey] ?? 0) + 1
    }
  })
  const growthMonths = Object.keys(monthlyGrowth)
  const growthValues = Object.values(monthlyGrowth)
  const maxGrowth = Math.max(...growthValues, 1)

  // Compute status distribution
  const statusDist: Record<string, number> = {}
  tenants.forEach((t: Record<string, string>) => {
    statusDist[t.status] = (statusDist[t.status] ?? 0) + 1
  })

  if (isLoading) {
    return <ReportsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            Platform Reports
          </h1>
          <p className="text-white/50 mt-1">Comprehensive platform analytics and metrics</p>
        </div>
        <Button onClick={() => { dashRefetch() }} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Revenue & Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-xs text-white/40">Total Revenue</p>
          </div>
          <p className="text-3xl font-bold text-white">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-white/30 mt-1">Across all subscriptions</p>
        </div>

        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-white/40">Pro Subscribers</p>
          </div>
          <p className="text-3xl font-bold text-white">{planDistribution.pro ?? 0}</p>
          <p className="text-xs text-white/30 mt-1">
            {planDistribution.free + planDistribution.pro > 0
              ? `${Math.round(((planDistribution.pro ?? 0) / ((planDistribution.free ?? 0) + (planDistribution.pro ?? 0))) * 100)}% conversion rate`
              : 'No conversion data'}
          </p>
        </div>

        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-xs text-white/40">Active Users</p>
          </div>
          <p className="text-3xl font-bold text-white">{activeUsers}</p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" />
            {totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}% of total` : 'N/A'}
          </p>
        </div>

        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <UserX className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-xs text-white/40">Suspended</p>
          </div>
          <p className="text-3xl font-bold text-white">{suspendedUsers}</p>
          <p className="text-xs text-white/30 mt-1">{newSignupsToday} new signups today</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Growth Bar Chart */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              User Growth by Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {growthMonths.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/30">
                <Users className="h-8 w-8 mb-2" />
                <p className="text-sm">No growth data available</p>
              </div>
            ) : (
              <div className="flex items-end gap-2 h-48 pt-2">
                {growthMonths.map((month, idx) => {
                  const height = (growthValues[idx] / maxGrowth) * 100
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-primary font-medium">
                        {growthValues[idx]}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/60 transition-all duration-500 min-h-[4px]"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[10px] text-white/40 text-center leading-tight">
                        {month}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              {/* Visual bars */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      <span className="text-sm text-white/70">Free Plan</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{planDistribution.free ?? 0}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-8 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gray-600 to-gray-400 rounded-full flex items-center justify-end pr-3 transition-all duration-700"
                      style={{
                        width: `${planDistribution.free + planDistribution.pro > 0 ? Math.max(((planDistribution.free ?? 0) / ((planDistribution.free ?? 0) + (planDistribution.pro ?? 0))) * 100, 5) : 50}%`,
                      }}
                    >
                      <span className="text-[10px] text-white font-bold">
                        {planDistribution.free + planDistribution.pro > 0
                          ? `${Math.round(((planDistribution.free ?? 0) / ((planDistribution.free ?? 0) + (planDistribution.pro ?? 0))) * 100)}%`
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm text-white/70">Pro Plan</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{planDistribution.pro ?? 0}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-8 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full flex items-center justify-end pr-3 transition-all duration-700"
                      style={{
                        width: `${planDistribution.free + planDistribution.pro > 0 ? Math.max(((planDistribution.pro ?? 0) / ((planDistribution.free ?? 0) + (planDistribution.pro ?? 0))) * 100, 5) : 50}%`,
                      }}
                    >
                      <span className="text-[10px] text-white font-bold">
                        {planDistribution.free + planDistribution.pro > 0
                          ? `${Math.round(((planDistribution.pro ?? 0) / ((planDistribution.free ?? 0) + (planDistribution.pro ?? 0))) * 100)}%`
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-white/40 mb-3">Status Breakdown</p>
              <div className="flex gap-4">
                {Object.entries(statusDist).map(([status, count]) => {
                  const colors: Record<string, string> = {
                    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                    suspended: 'bg-red-500/20 text-red-300 border-red-500/30',
                    trial: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                  }
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <Badge className={cn(colors[status] ?? 'bg-gray-500/20 text-gray-300', 'border')}>
                        {status}
                      </Badge>
                      <span className="text-sm text-white font-medium">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Platform Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-sm text-white/60">Total Tenants</span>
              <span className="text-sm font-bold text-white">{totalUsers}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-sm text-white/60">Open Support Tickets</span>
              <span className="text-sm font-bold text-amber-400">{openTickets}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-sm text-white/60">Active Rate</span>
              <span className="text-sm font-bold text-emerald-400">
                {totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-sm text-white/60">Free Plan Users</span>
              <span className="text-sm font-bold text-white">{planDistribution.free ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-sm text-white/60">Pro Plan Users</span>
              <span className="text-sm font-bold text-primary">{planDistribution.pro ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-sm text-white/60">New Signups Today</span>
              <span className="text-sm font-bold text-blue-400">{newSignupsToday}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 bg-white/5" />
        <Skeleton className="h-4 w-60 mt-2 bg-white/5" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-10 h-10 rounded-lg bg-white/5" />
              <Skeleton className="h-3 w-24 bg-white/5" />
            </div>
            <Skeleton className="h-8 w-32 bg-white/5" />
            <Skeleton className="h-3 w-40 mt-2 bg-white/5" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-5">
          <Skeleton className="h-5 w-36 mb-6 bg-white/5" />
          <div className="flex items-end gap-2 h-48">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1">
                <Skeleton className="h-full w-full rounded-t-md bg-white/5" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-5">
          <Skeleton className="h-5 w-36 mb-6 bg-white/5" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-4">
              <Skeleton className="h-3 w-24 mb-2 bg-white/5" />
              <Skeleton className="h-8 w-full rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
