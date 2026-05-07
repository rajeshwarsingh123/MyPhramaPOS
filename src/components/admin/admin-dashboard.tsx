'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  UserCheck,
  DollarSign,
  UserPlus,
  TicketCheck,
  TrendingUp,
  Activity,
  Clock,
  ShieldCheck,
  CreditCard,
  Server,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Pill,
  CalendarClock,
  Percent,
  Zap,
  ArrowRight,
  Database,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ─── AnimatedNumber ────────────────────────────────────
interface AnimatedNumberProps {
  value: number
  duration?: number
}

function AnimatedNumber({ value, duration = 800 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let start = 0
    const increment = value / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{display.toLocaleString('en-IN')}</span>
}

// ─── Stat Card Config ──────────────────────────────────
interface StatCardConfig {
  key: string
  label: string
  icon: React.ElementType
  color: string
  bg: string
  ring: string
  prefix?: string
  subtext?: (stats: Record<string, number>) => string
  trend?: (stats: Record<string, number>) => { value: number; direction: 'up' | 'down' }
}

const statCardsConfig: StatCardConfig[] = [
  {
    key: 'totalUsers',
    label: 'Total Users',
    icon: Users,
    color: 'text-primary',
    bg: 'bg-primary/15',
    ring: 'ring-primary/20',
    trend: () => ({ value: 12, direction: 'up' }),
  },
  {
    key: 'activeUsers',
    label: 'Active Users',
    icon: UserCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    ring: 'ring-emerald-500/20',
    subtext: (s) =>
      s.totalUsers > 0
        ? `${Math.round((s.activeUsers / s.totalUsers) * 100)}% of total`
        : '',
  },
  {
    key: 'newSignupsToday',
    label: 'New Signups Today',
    icon: UserPlus,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    ring: 'ring-blue-500/20',
    subtext: (s) => `${s.newSignupsWeek ?? 0} this week`,
    trend: () => ({ value: 8, direction: 'up' }),
  },
  {
    key: 'totalRevenue',
    label: 'Total Revenue',
    icon: DollarSign,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    ring: 'ring-amber-500/20',
    prefix: '₹',
    subtext: (s) => `MRR: ₹${(s.mrr ?? 0).toLocaleString('en-IN')}`,
    trend: () => ({ value: 23, direction: 'up' }),
  },
  {
    key: 'mrr',
    label: 'MRR',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    ring: 'ring-emerald-500/20',
    prefix: '₹',
    subtext: () => 'Monthly Recurring Revenue',
  },
  {
    key: 'openTickets',
    label: 'Open Tickets',
    icon: TicketCheck,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    ring: 'ring-orange-500/20',
  },
]

// ─── Custom Tooltip Components ─────────────────────────
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  const revenueItem = payload.find((p) => p.dataKey === 'revenue')
  return (
    <div className="bg-[oklch(0.15_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-lg p-3 shadow-xl">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      {revenueItem && (
        <p className="text-sm font-semibold text-primary">
          ₹{revenueItem.value.toLocaleString('en-IN')}
        </p>
      )}
    </div>
  )
}

function UserGrowthTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  const userItem = payload.find((p) => p.dataKey === 'newUsers')
  return (
    <div className="bg-[oklch(0.15_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-lg p-3 shadow-xl">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      {userItem && (
        <p className="text-sm font-semibold text-primary">
          {userItem.value} new users
        </p>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────
export function AdminDashboard() {
  const setAdminPage = useAppStore((s) => s.setAdminPage)
  const [chartPeriod, setChartPeriod] = useState<'12M' | '6M' | '3M'>('12M')
  const [isRefreshing, setIsRefreshing] = useState(false)


  // Use useSyncExternalStore for a reactive clock (avoids setState-in-effect lint error)
  const subscribe = useCallback((cb: () => void) => {
    const id = setInterval(cb, 60000)
    return () => clearInterval(id)
  }, [])
  const getSnapshot = useCallback(() => {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }, [])
  const getServerSnapshot = useCallback(() => '', [])
  const lastUpdated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch dashboard data')
      }
      return res.json()
    },
    refetchInterval: 30000,
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  // Filter revenue trend based on chart period
  const filteredRevenueTrend = useMemo(() => {
    const trend = data?.revenueTrend ?? []
    if (chartPeriod === '3M') return trend.slice(-3)
    if (chartPeriod === '6M') return trend.slice(-6)
    return trend
  }, [data?.revenueTrend, chartPeriod])

  const filteredUserTrend = filteredRevenueTrend

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">{(error as Error)?.message || 'Failed to load dashboard data'}</p>
        {(error as Error)?.message === 'Unauthorized' ? (
          <Button 
            onClick={() => {
              const { setAdminAuth } = useAppStore.getState()
              setAdminAuth({ isAuthenticated: false, adminId: null, adminName: null, adminEmail: null, adminRole: null, loginTime: null })
            }} 
            className="bg-primary hover:bg-primary/80 text-white"
          >
            Login Again
          </Button>
        ) : (
          <Button onClick={() => refetch()} className="bg-primary hover:bg-primary/80 text-white">
            Try Again
          </Button>
        )}
      </div>
    )
  }

  const stats = data?.stats ?? {}
  const recentLogs = data?.recentLogs ?? []
  const planDistribution = data?.planDistribution ?? { free: 0, pro: 0 }
  const recentActivity = data?.recentActivity ?? []

  const totalTenants = planDistribution.free + planDistribution.pro
  const conversionRate =
    totalTenants > 0
      ? Math.round((planDistribution.pro / totalTenants) * 100)
      : 0
  const avgRevenuePerUser =
    stats.totalUsers > 0 ? Math.round(stats.mrr / stats.totalUsers) : 0

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-white/50 mt-1">Platform overview and system health</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <Badge
              variant="secondary"
              className="text-[11px] bg-white/5 text-white/50 border border-white/10 px-3 py-1"
            >
              Last updated: {lastUpdated}
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

      {/* ─── Stat Cards Row 1 (6 cards) ──────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCardsConfig.map((card) => {
          const Icon = card.icon
          const value = stats[card.key] ?? 0
          const trend = card.trend ? card.trend(stats) : null
          const subtext = card.subtext ? card.subtext(stats) : null

          return (
            <div
              key={card.key}
              className={cn(
                'bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4',
                'hover:bg-white/5 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5',
                'transition-all duration-200 cursor-default',
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center ring-1',
                    card.bg,
                    card.ring,
                  )}
                >
                  <Icon className={cn('h-5 w-5', card.color)} />
                </div>
                <Badge
                  variant="secondary"
                  className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0"
                >
                  Live
                </Badge>
              </div>
              <p className="text-2xl font-bold text-white">
                {card.prefix}
                <AnimatedNumber value={value} />
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-white/40">{card.label}</p>
                {trend && (
                  <div
                    className={cn(
                      'flex items-center gap-0.5 text-[10px] font-medium',
                      trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400',
                    )}
                  >
                    {trend.direction === 'up' ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {trend.value}%
                  </div>
                )}
              </div>
              {subtext && (
                <p className="text-[10px] text-white/30 mt-1 truncate">{subtext}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* ─── Charts Row (Revenue Trend + User Growth) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Revenue Trend
              </CardTitle>
              <div className="flex items-center gap-1">
                {(['3M', '6M', '12M'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-md transition-colors',
                      chartPeriod === period
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-white/30 hover:text-white/50 hover:bg-white/5',
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredRevenueTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--primary)', stroke: '#1e1b4b', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredUserTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="var(--primary)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<UserGrowthTooltip />} />
                  <Bar
                    dataKey="newUsers"
                    fill="url(#barGradient)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Middle Row: Plan Distribution + Activity + Quick Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Plan Distribution */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Free Plan */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span className="text-sm text-white/70">Free Plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{planDistribution.free}</span>
                  <span className="text-[10px] text-white/30">
                    {totalTenants > 0
                      ? Math.round((planDistribution.free / totalTenants) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-slate-500 to-slate-400 rounded-full transition-all duration-700"
                  style={{
                    width: `${totalTenants > 0 ? (planDistribution.free / totalTenants) * 100 : 50}%`,
                  }}
                />
              </div>
            </div>

            {/* Pro Plan */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-sm text-white/70">Pro Plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{planDistribution.pro}</span>
                  <span className="text-[10px] text-white/30">
                    {totalTenants > 0
                      ? Math.round((planDistribution.pro / totalTenants) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-700"
                  style={{
                    width: `${totalTenants > 0 ? (planDistribution.pro / totalTenants) * 100 : 50}%`,
                  }}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="pt-3 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Total Tenants</span>
                <span className="text-white font-medium">{totalTenants}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Pro Conversion</span>
                <span className="text-primary font-medium">{conversionRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
              <Badge
                variant="secondary"
                className="text-[10px] bg-white/5 text-white/40 border border-white/10"
              >
                {recentActivity.length} events
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-white/30">
                <Clock className="h-8 w-8 mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                {recentActivity.map((activity: Record<string, string>, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                        activity.type === 'signup'
                          ? 'bg-emerald-500/15 ring-1 ring-emerald-500/20'
                          : activity.type === 'subscription'
                            ? 'bg-primary/15 ring-1 ring-primary/20'
                            : activity.type === 'ticket'
                              ? 'bg-amber-500/15 ring-1 ring-amber-500/20'
                              : 'bg-blue-500/15 ring-1 ring-blue-500/20',
                      )}
                    >
                      {activity.type === 'signup' ? (
                        <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
                      ) : activity.type === 'subscription' ? (
                        <CreditCard className="h-3.5 w-3.5 text-primary" />
                      ) : activity.type === 'ticket' ? (
                        <TicketCheck className="h-3.5 w-3.5 text-amber-400" />
                      ) : (
                        <DollarSign className="h-3.5 w-3.5 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white/80 leading-tight">{activity.description}</p>
                      <p className="text-[11px] text-white/30 mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickStatTile
                icon={FileText}
                label="Total Bills"
                value={String((stats.totalBillsGenerated ?? 0).toLocaleString('en-IN'))}
                color="text-teal-400"
                bg="bg-teal-500/10"
              />
              <QuickStatTile
                icon={Pill}
                label="Medicines"
                value={String((stats.totalMedicinesAdded ?? 0).toLocaleString('en-IN'))}
                color="text-primary"
                bg="bg-primary/10"
              />
              <QuickStatTile
                icon={CalendarClock}
                label="Expiring Subs"
                value={String(stats.expiringSubscriptions ?? 0)}
                sublabel="30 days"
                color="text-amber-400"
                bg="bg-amber-500/10"
              />
              <QuickStatTile
                icon={Percent}
                label="Conversion"
                value={`${conversionRate}%`}
                sublabel="Free→Pro"
                color="text-primary"
                bg="bg-primary/10"
              />
              <QuickStatTile
                icon={DollarSign}
                label="Avg Rev/User"
                value={`₹${avgRevenuePerUser.toLocaleString('en-IN')}`}
                color="text-emerald-400"
                bg="bg-emerald-500/10"
              />
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-medium">Operational</span>
                </div>
                <span className="text-xs font-bold text-emerald-400">99.9%</span>
                <span className="text-[9px] text-white/30">System Uptime</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── System Logs ─────────────────────────────── */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              Recent System Logs
              <Badge
                variant="secondary"
                className="text-[10px] bg-white/5 text-white/40 border border-white/10"
              >
                Last 10
              </Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdminPage('admin-logs')}
              className="text-primary hover:text-primary/80 hover:bg-primary/10 text-xs gap-1 h-7"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-white/30">
              <Server className="h-8 w-8 mb-2" />
              <p className="text-sm">No system logs</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentLogs.map((log: Record<string, unknown>, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-colors cursor-pointer"
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      log.level === 'error'
                        ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.4)]'
                        : log.level === 'warning'
                          ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]'
                          : log.level === 'info'
                            ? 'bg-blue-400'
                            : 'bg-white/30',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{String(log.action ?? '')}</p>
                    {log.details && (
                      <p className="text-xs text-white/40 truncate mt-0.5">{String(log.details)}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {log.tenant && (
                      <p className="text-xs text-primary/80 mb-0.5">
                        {typeof log.tenant === 'object' && log.tenant !== null && 'businessName' in log.tenant
                          ? String((log.tenant as { businessName: string }).businessName)
                          : String(log.tenant)}
                      </p>
                    )}
                    <p className="text-[11px] text-white/30">
                      {log.createdAt
                        ? new Date(String(log.createdAt)).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Quick Stat Tile ───────────────────────────────────
function QuickStatTile({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
  bg,
}: {
  icon: React.ElementType
  label: string
  value: string
  sublabel?: string
  color: string
  bg: string
}) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2.5 flex flex-col gap-1.5 hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-1.5">
        <div className={cn('w-5 h-5 rounded flex items-center justify-center', bg)}>
          <Icon className={cn('h-3 w-3', color)} />
        </div>
        <span className="text-[10px] text-white/40">{label}</span>
      </div>
      <span className={cn('text-base font-bold', color)}>{value}</span>
      {sublabel && <span className="text-[9px] text-white/25">{sublabel}</span>}
    </div>
  )
}

// ─── Dashboard Skeleton ────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-56 bg-white/5" />
          <Skeleton className="h-4 w-44 mt-2 bg-white/5" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-32 rounded-full bg-white/5" />
          <Skeleton className="h-8 w-8 rounded-md bg-white/5" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="w-10 h-10 rounded-full bg-white/5" />
              <Skeleton className="w-8 h-4 rounded-full bg-white/5" />
            </div>
            <Skeleton className="h-7 w-20 bg-white/5" />
            <Skeleton className="h-3 w-16 mt-2 bg-white/5" />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <Skeleton className="h-5 w-32 mb-4 bg-white/5" />
          <Skeleton className="h-64 w-full bg-white/5 rounded-lg" />
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <Skeleton className="h-5 w-32 mb-4 bg-white/5" />
          <Skeleton className="h-64 w-full bg-white/5 rounded-lg" />
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <Skeleton className="h-5 w-32 mb-4 bg-white/5" />
          <Skeleton className="h-3 w-full mb-2 bg-white/5" />
          <Skeleton className="h-2 w-full mb-4 bg-white/5" />
          <Skeleton className="h-3 w-full mb-2 bg-white/5" />
          <Skeleton className="h-2 w-full mb-4 bg-white/5" />
          <Skeleton className="h-3 w-full mb-1 bg-white/5" />
          <Skeleton className="h-3 w-full bg-white/5" />
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4 lg:col-span-2">
          <Skeleton className="h-5 w-32 mb-4 bg-white/5" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <Skeleton className="w-8 h-8 rounded-full bg-white/5" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 bg-white/5" />
                <Skeleton className="h-3 w-20 mt-1 bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Logs */}
      <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
        <Skeleton className="h-5 w-40 mb-4 bg-white/5" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 mb-2 p-3 rounded-lg">
            <Skeleton className="w-2 h-2 rounded-full bg-white/5" />
            <Skeleton className="h-4 flex-1 bg-white/5" />
            <Skeleton className="h-3 w-24 bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  )
}
