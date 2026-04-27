'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  UserCheck,
  UserX,
  DollarSign,
  UserPlus,
  TicketCheck,
  Activity,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Server,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  BarChart3,
} from 'lucide-react'
import { useEffect, useState } from 'react'

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

const statCards = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'activeUsers', label: 'Active Users', icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'suspendedUsers', label: 'Suspended', icon: UserX, color: 'text-red-400', bg: 'bg-red-500/10' },
  { key: 'totalRevenue', label: 'Revenue', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10', prefix: '₹' },
  { key: 'newSignupsToday', label: 'New Signups Today', icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'openTickets', label: 'Open Tickets', icon: TicketCheck, color: 'text-orange-400', bg: 'bg-orange-500/10' },
]

export function AdminDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => fetch('/api/admin/dashboard').then((r) => r.json()),
    refetchInterval: 30000,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load dashboard data</p>
        <Button onClick={() => refetch()} className="bg-purple-600 hover:bg-purple-700 text-white">
          Try Again
        </Button>
      </div>
    )
  }

  const stats = data?.stats ?? {}
  const recentLogs = data?.recentLogs ?? []
  const planDistribution = data?.planDistribution ?? { free: 0, pro: 0 }
  const recentActivity = data?.recentActivity ?? []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-purple-400" />
          Admin Dashboard
        </h1>
        <p className="text-white/50 mt-1">Platform overview and system health</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          const value = stats[card.key] ?? 0
          return (
            <div
              key={card.key}
              className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.bg)}>
                  <Icon className={cn('h-5 w-5', card.color)} />
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-white/5 text-white/40 border border-white/10"
                >
                  Live
                </Badge>
              </div>
              <p className="text-2xl font-bold text-white">
                {card.prefix}
                <AnimatedNumber value={value} />
              </p>
              <p className="text-xs text-white/50 mt-1">{card.label}</p>
            </div>
          )
        })}
      </div>

      {/* Middle Row: Plan Distribution + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Plan Distribution */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-400" />
              Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm text-white/70">Free Plan</span>
              </div>
              <span className="text-sm font-semibold text-white">{planDistribution.free ?? 0}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full transition-all duration-700"
                style={{
                  width: `${planDistribution.free + planDistribution.pro > 0 ? ((planDistribution.free / (planDistribution.free + planDistribution.pro)) * 100) : 50}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-400" />
                <span className="text-sm text-white/70">Pro Plan</span>
              </div>
              <span className="text-sm font-semibold text-white">{planDistribution.pro ?? 0}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-700"
                style={{
                  width: `${planDistribution.free + planDistribution.pro > 0 ? ((planDistribution.pro / (planDistribution.free + planDistribution.pro)) * 100) : 50}%`,
                }}
              />
            </div>

            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Total Tenants</span>
                <span className="text-white font-medium">
                  {(planDistribution.free ?? 0) + (planDistribution.pro ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-white/40">Pro Conversion</span>
                <span className="text-purple-400 font-medium">
                  {planDistribution.free + planDistribution.pro > 0
                    ? Math.round(((planDistribution.pro ?? 0) / ((planDistribution.free ?? 0) + (planDistribution.pro ?? 0))) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/30">
                <Clock className="h-8 w-8 mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentActivity.map((activity: Record<string, string>, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                        activity.type === 'signup'
                          ? 'bg-emerald-500/10'
                          : activity.type === 'subscription'
                            ? 'bg-purple-500/10'
                            : activity.type === 'ticket'
                              ? 'bg-amber-500/10'
                              : 'bg-blue-500/10'
                      )}
                    >
                      {activity.type === 'signup' ? (
                        <UserPlus className="h-4 w-4 text-emerald-400" />
                      ) : activity.type === 'subscription' ? (
                        <CreditCard className="h-4 w-4 text-purple-400" />
                      ) : activity.type === 'ticket' ? (
                        <TicketCheck className="h-4 w-4 text-amber-400" />
                      ) : (
                        <BarChart3 className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80">{activity.description}</p>
                      <p className="text-xs text-white/40 mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Logs */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
            <Server className="h-4 w-4 text-purple-400" />
            Recent System Logs
            <Badge variant="secondary" className="ml-auto text-[10px] bg-white/5 text-white/40 border border-white/10">
              Last 5
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-white/30">
              <Server className="h-8 w-8 mb-2" />
              <p className="text-sm">No system logs</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log: Record<string, string>, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors"
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      log.level === 'error'
                        ? 'bg-red-400'
                        : log.level === 'warning'
                          ? 'bg-amber-400'
                          : log.level === 'info'
                            ? 'bg-blue-400'
                            : 'bg-white/30'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{log.action}</p>
                    {log.details && <p className="text-xs text-white/40 truncate mt-0.5">{log.details}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {log.tenant && (
                      <p className="text-xs text-purple-400 mb-0.5">{log.tenant}</p>
                    )}
                    <p className="text-[11px] text-white/30">{log.createdAt}</p>
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-56 bg-white/5" />
        <Skeleton className="h-4 w-40 mt-2 bg-white/5" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="w-10 h-10 rounded-lg bg-white/5" />
              <Skeleton className="w-10 h-5 rounded-full bg-white/5" />
            </div>
            <Skeleton className="h-7 w-20 bg-white/5" />
            <Skeleton className="h-3 w-24 mt-2 bg-white/5" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <Skeleton className="h-5 w-32 mb-4 bg-white/5" />
          <Skeleton className="h-3 w-full mb-2 bg-white/5" />
          <Skeleton className="h-3 w-full mb-4 bg-white/5" />
          <Skeleton className="h-3 w-full mb-2 bg-white/5" />
          <Skeleton className="h-3 w-full bg-white/5" />
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4 lg:col-span-2">
          <Skeleton className="h-5 w-32 mb-4 bg-white/5" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <Skeleton className="w-8 h-8 rounded-full bg-white/5" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 bg-white/5" />
                <Skeleton className="h-3 w-24 mt-1 bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
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
