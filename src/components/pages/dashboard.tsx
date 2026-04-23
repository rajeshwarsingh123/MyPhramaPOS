'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { format, parseISO, subDays } from 'date-fns'
import {
  IndianRupee,
  Pill,
  AlertTriangle,
  Clock,
  XCircle,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Plus,
  Receipt,
  ArrowRight,
  RefreshCw,
  Package,
  Trophy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  FileText,
  Banknote,
  CreditCard,
  Smartphone,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

// ── Types ───────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalMedicines: number
  totalStock: number
  todaySales: number
  monthSales: number
  lowStockCount: number
  expiringSoonCount: number
  expiredCount: number
  recentSales: Array<{
    id: string
    invoiceNo: string
    customerName: string
    saleDate: string
    totalAmount: number
    paymentMode: string
  }>
}

interface SalesTrendItem {
  date: string
  dayName: string
  shortDate: string
  totalSales: number
  orderCount: number
}

interface StockDistItem {
  name: string
  value: number
  medicineCount: number
  fill: string
}

interface AlertItem {
  id: string
  type: 'expired' | 'expiring' | 'low_stock'
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
}

interface TopSellingItem {
  medicineName: string
  qtySold: number
  revenue: number
  cost: number
  profit: number
  margin: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function paymentBadge(mode: string) {
  const map: Record<string, { label: string; dotColor: string }> = {
    cash: { label: 'Cash', dotColor: 'bg-emerald-500' },
    card: { label: 'Card', dotColor: 'bg-blue-500' },
    upi: { label: 'UPI', dotColor: 'bg-violet-500' },
    credit: { label: 'Credit', dotColor: 'bg-amber-500' },
  }
  const info = map[mode] ?? { label: mode, dotColor: 'bg-muted-foreground' }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={cn('h-1.5 w-1.5 rounded-full', info.dotColor)} />
      {info.label}
    </span>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

// ── Stat Card Component ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  isCurrency,
  colorClass,
  iconBg,
  gradientFrom,
  gradientTo,
  borderClass,
  accentColor,
  trend,
  trendLabel,
  delayMs = 0,
}: {
  label: string
  value: number
  icon: React.ElementType
  isCurrency?: boolean
  colorClass: string
  iconBg: string
  gradientFrom: string
  gradientTo: string
  borderClass: string
  accentColor: string
  trend?: 'up' | 'down'
  trendLabel?: string
  delayMs?: number
}) {
  return (
    <Card
      className={cn(
        'card-spotlight card-shadow-lg card-elevated stat-card-accent group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-fade-up rounded-xl',
        borderClass
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {/* Gradient overlay top-left to bottom-right */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08] pointer-events-none"
        style={{
          background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
        }}
      >
        <div className={cn('absolute top-0 left-0 w-full h-full rounded-inherit bg-gradient-to-br', gradientFrom, gradientTo)} />
      </div>

      {/* Decorative dot pattern overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.06] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`dots-${label.replace(/\s/g, '')}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${label.replace(/\s/g, '')})`} className="text-foreground" />
      </svg>

      {/* Decorative blob in top-right corner */}
      <div className={cn(
        'absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-[0.07] dark:opacity-[0.12] pointer-events-none blur-sm transition-transform duration-500 group-hover:scale-125',
        colorClass.replace('text-', 'bg-')
      )} />
      <div className={cn(
        'absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-[0.04] dark:opacity-[0.07] pointer-events-none blur-md transition-transform duration-500 group-hover:scale-110',
        colorClass.replace('text-', 'bg-')
      )} />

      <CardContent className="relative p-5 lg:p-6 pb-6 lg:pb-7">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              {label}
            </p>
            <p className={cn('text-3xl font-bold tracking-tight', colorClass)}>
              {isCurrency ? formatCurrency(value) : value.toLocaleString('en-IN')}
            </p>
            {trend && trendLabel && (
              <div className={cn(
                'flex items-center gap-1 mt-0.5',
                trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              )}>
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span className="text-[11px] font-medium">{trendLabel}</span>
              </div>
            )}
          </div>
          <div className={cn(
            'flex items-center justify-center rounded-2xl w-12 h-12 shrink-0 transition-transform duration-300 group-hover:scale-110 bg-gradient-to-br shadow-sm',
            iconBg
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>

      {/* Bottom accent bar */}
      <div className={cn(
        'absolute bottom-0 left-0 h-[3px] w-3/4 transition-all duration-500 group-hover:w-full rounded-full',
        accentColor
      )} />
    </Card>
  )
}

// ── Skeletons ───────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden rounded-xl">
          <CardContent className="p-5 lg:p-6 pb-6 lg:pb-7">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-28" />
              </div>
              <Skeleton className="h-12 w-12 rounded-2xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  )
}

// ── Custom Chart Tooltip ────────────────────────────────────────────────────

function SalesTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: SalesTrendItem }>; label?: string }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload as SalesTrendItem
  return (
    <div className="rounded-lg border bg-background p-3 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground">{data.shortDate}</p>
      <p className="text-sm font-bold text-foreground">{formatCurrency(data.totalSales)}</p>
      <p className="text-xs text-muted-foreground">{data.orderCount} order{data.orderCount !== 1 ? 's' : ''}</p>
    </div>
  )
}

function StockTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: StockDistItem }> }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload as StockDistItem
  return (
    <div className="rounded-lg border bg-background p-3 shadow-xl">
      <p className="text-sm font-bold text-foreground">{data.name}</p>
      <p className="text-xs text-muted-foreground">{data.value.toLocaleString('en-IN')} units</p>
      <p className="text-xs text-muted-foreground">{data.medicineCount} medicine{data.medicineCount !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ── Top Sellers Card ────────────────────────────────────────────────────────

function TopSellerCard({ item, rank }: { item: TopSellingItem; rank: number }) {
  const rankStyles = {
    1: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 border-amber-400 shadow-amber-200/50 dark:from-amber-900/60 dark:to-amber-800/40 dark:text-amber-200 dark:border-amber-600',
    2: 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 border-slate-400 shadow-slate-200/50 dark:from-slate-700/50 dark:to-slate-600/40 dark:text-slate-200 dark:border-slate-500',
    3: 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800 border-orange-400 shadow-orange-200/50 dark:from-orange-900/50 dark:to-orange-800/40 dark:text-orange-200 dark:border-orange-600',
  }

  const rankIcons = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
  }

  const rankLabels: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' }

  return (
    <Card className="min-w-[210px] shrink-0 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-muted/60 rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              'h-8 w-8 flex items-center justify-center p-0 text-xs font-bold shrink-0 shadow-sm',
              rankStyles[rank] ?? 'bg-muted text-muted-foreground border-muted-foreground/20'
            )}
          >
            {rankIcons[rank] ?? rank}
          </Badge>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <Pill className="h-3 w-3 text-muted-foreground shrink-0" />
              <p className="text-sm font-semibold truncate">{item.medicineName}</p>
            </div>
            <p className="text-xs text-muted-foreground">{item.qtySold} units sold</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/60">
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(item.revenue)}
          </p>
          <p className="text-[11px] text-muted-foreground">revenue</p>
        </div>
        {rank <= 3 && (
          <div className="mt-2 flex items-center gap-1">
            <Trophy className={cn(
              'h-3.5 w-3.5',
              rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-slate-400' : 'text-orange-400'
            )} />
            <span className={cn(
              'text-[10px] font-semibold',
              rank === 1 ? 'text-amber-600 dark:text-amber-400' : rank === 2 ? 'text-slate-500 dark:text-slate-400' : 'text-orange-600 dark:text-orange-400'
            )}>
              {rankLabels[rank]} Best Seller
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Alert Group Component ──────────────────────────────────────────────────

function AlertGroup({
  title,
  type,
  alerts,
  borderClass,
  headerBg,
  dotColor,
}: {
  title: string
  type: 'expired' | 'expiring' | 'low_stock'
  alerts: AlertItem[]
  borderClass: string
  headerBg: string
  dotColor: string
}) {
  const [isOpen, setIsOpen] = useState(true)

  const severityStyles: Record<string, { card: string; titleText: string; badge: string }> = {
    critical: {
      card: 'border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30',
      titleText: 'text-red-700 dark:text-red-400',
      badge: 'border-red-300 text-red-600 dark:border-red-800 dark:text-red-400 badge-pulse-critical',
    },
    warning: {
      card: 'border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30',
      titleText: 'text-amber-700 dark:text-amber-400',
      badge: 'border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400 badge-pulse-warning',
    },
    info: {
      card: 'border-orange-200 bg-orange-50/80 dark:border-orange-900/50 dark:bg-orange-950/30',
      titleText: 'text-orange-700 dark:text-orange-400',
      badge: 'border-orange-300 text-orange-600 dark:border-orange-800 dark:text-orange-400',
    },
  }

  if (alerts.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          'flex items-center justify-between rounded-lg px-3 py-2.5 mb-2 transition-colors cursor-pointer border-l-[4px]',
          headerBg,
          borderClass.replace('border-l-', 'border-l-')
        )}>
          <div className="flex items-center gap-2">
            <div className={cn('h-2.5 w-2.5 rounded-full shadow-sm', dotColor)} />
            <span className="text-xs font-bold">{title}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold tabular-nums">
              {alerts.length}
            </Badge>
          </div>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 mb-3 ml-1">
          {alerts.map((alert) => {
            const styles = severityStyles[alert.severity] ?? severityStyles.info
            return (
              <div
                key={alert.id}
                className={cn(
                  'rounded-lg border p-3 transition-all duration-200 hover:shadow-sm border-l-[4px]',
                  styles.card,
                  borderClass
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn('mt-0.5 h-2 w-2 rounded-full shrink-0', dotColor)} />
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <p className={cn('text-xs font-bold truncate', styles.titleText)}>
                      {alert.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {alert.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export function DashboardPage() {
  const { setCurrentPage } = useAppStore()

  // Hydration-safe mounted check
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // Date helpers
  const today = useMemo(() => new Date(), [])
  const thirtyDaysAgo = useMemo(() => subDays(today, 30), [today])
  const formattedDate = useMemo(() => format(today, 'EEEE, d MMMM yyyy'), [today])
  const greeting = useMemo(() => getGreeting(), [])

  // Fetch dashboard stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => fetch('/api/dashboard/stats').then((r) => r.json()),
    refetchInterval: 30000,
  })

  // Fetch sales trend
  const { data: salesTrend, isLoading: salesTrendLoading } = useQuery<{ data: SalesTrendItem[] }>({
    queryKey: ['sales-trend'],
    queryFn: () => fetch('/api/dashboard/sales-trend').then((r) => r.json()),
    refetchInterval: 60000,
  })

  // Fetch stock distribution
  const { data: stockDist, isLoading: stockDistLoading } = useQuery<{ data: StockDistItem[] }>({
    queryKey: ['stock-distribution'],
    queryFn: () => fetch('/api/dashboard/stock-distribution').then((r) => r.json()),
    refetchInterval: 60000,
  })

  // Fetch alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery<{ alerts: AlertItem[] }>({
    queryKey: ['alerts'],
    queryFn: () => fetch('/api/alerts').then((r) => r.json()),
    refetchInterval: 60000,
  })

  // Fetch top selling medicines (last 30 days)
  const { data: profitData, isLoading: topSellersLoading } = useQuery<{
    items: TopSellingItem[]
  }>({
    queryKey: ['top-sellers', thirtyDaysAgo.toISOString().split('T')[0]],
    queryFn: () => {
      const from = thirtyDaysAgo.toISOString().split('T')[0]
      const to = today.toISOString().split('T')[0]
      return fetch(`/api/reports/profit?fromDate=${from}&toDate=${to}`).then((r) => r.json())
    },
    refetchInterval: 120000,
  })

  // Fetch payment modes for current month
  const { data: paymentModes } = useQuery<{
    modes: Record<string, number>
    totals: number
  }>({
    queryKey: ['payment-modes'],
    queryFn: () => fetch('/api/dashboard/payment-modes').then((r) => r.json()),
    refetchInterval: 60000,
  })

  // Fetch activity feed
  const { data: activityData, isLoading: activityLoading } = useQuery<{
    activities: Array<{
      id: string
      type: 'sale' | 'purchase' | 'return' | 'low_stock' | 'expiry'
      title: string
      description: string
      timestamp: string
      amount?: number
    }>
    summary: { salesCount: number; purchasesCount: number; returnsCount: number; lowStockCount: number; expiryCount: number }
  }>({
    queryKey: ['activity-feed'],
    queryFn: () => fetch('/api/dashboard/activity').then((r) => r.json()),
    refetchInterval: 30000,
  })

  const topSellers = useMemo(() => {
    if (!profitData?.items) return []
    return [...profitData.items]
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, 8)
  }, [profitData])

  const hasAlerts = alertsData && alertsData.alerts.length > 0

  // Group alerts by type
  const groupedAlerts = useMemo(() => {
    if (!alertsData?.alerts) return { expired: [], expiring: [], low_stock: [] }
    return {
      expired: alertsData.alerts.filter((a) => a.type === 'expired'),
      expiring: alertsData.alerts.filter((a) => a.type === 'expiring'),
      low_stock: alertsData.alerts.filter((a) => a.type === 'low_stock'),
    }
  }, [alertsData])

  return (
    <div className="page-enter p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {mounted ? greeting : 'Welcome'}, Admin
            </span>{' '}
            <Sparkles className="inline h-6 w-6 text-amber-400 ml-1" />
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            {mounted ? formattedDate : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchStats()}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Actions - Card-style buttons */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={() => setCurrentPage('billing')}
          className="action-card-hover hover-lift flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 lg:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.05] hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-[0.98] group"
        >
          <div className="flex items-center justify-center rounded-2xl w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm group-hover:shadow-emerald-500/30 transition-shadow duration-200">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-semibold text-foreground">New Bill</span>
        </button>
        <button
          onClick={() => setCurrentPage('medicines')}
          className="action-card-hover hover-lift flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 lg:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.05] hover:border-teal-300 dark:hover:border-teal-700 active:scale-[0.98] group"
        >
          <div className="flex items-center justify-center rounded-2xl w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 shadow-sm group-hover:shadow-teal-500/30 transition-shadow duration-200">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-semibold text-foreground">Add Medicine</span>
        </button>
        <button
          onClick={() => setCurrentPage('purchases')}
          className="action-card-hover hover-lift flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 lg:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.05] hover:border-orange-300 dark:hover:border-orange-700 active:scale-[0.98] group"
        >
          <div className="flex items-center justify-center rounded-2xl w-11 h-11 bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm group-hover:shadow-orange-500/30 transition-shadow duration-200">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-semibold text-foreground">New Purchase</span>
        </button>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : statsError ? (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-destructive">Failed to load dashboard stats.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchStats()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 stagger-children">
          <StatCard
            label="Today's Sales"
            value={stats.todaySales}
            icon={IndianRupee}
            isCurrency
            colorClass="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-400"
            gradientFrom="from-emerald-500"
            gradientTo="to-emerald-300"
            borderClass="border-emerald-200/60 dark:border-emerald-800/40"
            accentColor="bg-emerald-500"
            trend="up"
            trendLabel="Sales today"
            delayMs={0}
          />
          <StatCard
            label="Monthly Sales"
            value={stats.monthSales}
            icon={TrendingUp}
            isCurrency
            colorClass="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-600 dark:from-emerald-950 dark:to-teal-900 dark:text-emerald-400"
            gradientFrom="from-emerald-500"
            gradientTo="to-teal-300"
            borderClass="border-emerald-200/60 dark:border-emerald-800/40"
            accentColor="bg-emerald-500"
            trend="up"
            trendLabel="This month"
            delayMs={40}
          />
          <StatCard
            label="Total Medicines"
            value={stats.totalMedicines}
            icon={Pill}
            colorClass="text-teal-600 dark:text-teal-400"
            iconBg="bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600 dark:from-teal-950 dark:to-teal-900 dark:text-teal-400"
            gradientFrom="from-teal-500"
            gradientTo="to-teal-300"
            borderClass="border-teal-200/60 dark:border-teal-800/40"
            accentColor="bg-teal-500"
            delayMs={80}
          />
          <StatCard
            label="Low Stock"
            value={stats.lowStockCount}
            icon={AlertTriangle}
            colorClass="text-amber-600 dark:text-amber-400"
            iconBg="bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 dark:from-amber-950 dark:to-amber-900 dark:text-amber-400"
            gradientFrom="from-amber-500"
            gradientTo="to-amber-300"
            borderClass="border-amber-200/60 dark:border-amber-800/40"
            accentColor="bg-amber-500"
            trend={stats.lowStockCount > 0 ? 'down' : undefined}
            trendLabel={stats.lowStockCount > 0 ? 'Needs attention' : undefined}
            delayMs={120}
          />
          <StatCard
            label="Expiring Soon"
            value={stats.expiringSoonCount}
            icon={Clock}
            colorClass="text-orange-600 dark:text-orange-400"
            iconBg="bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 dark:from-orange-950 dark:to-orange-900 dark:text-orange-400"
            gradientFrom="from-orange-500"
            gradientTo="to-orange-300"
            borderClass="border-orange-200/60 dark:border-orange-800/40"
            accentColor="bg-orange-500"
            trend={stats.expiringSoonCount > 0 ? 'down' : undefined}
            trendLabel={stats.expiringSoonCount > 0 ? 'Check expiry' : undefined}
            delayMs={160}
          />
          <StatCard
            label="Expired"
            value={stats.expiredCount}
            icon={XCircle}
            colorClass="text-red-600 dark:text-red-400"
            iconBg="bg-gradient-to-br from-red-50 to-red-100 text-red-600 dark:from-red-950 dark:to-red-900 dark:text-red-400"
            gradientFrom="from-red-500"
            gradientTo="to-red-300"
            borderClass="border-red-200/60 dark:border-red-800/40"
            accentColor="bg-red-500"
            trend={stats.expiredCount > 0 ? 'down' : undefined}
            trendLabel={stats.expiredCount > 0 ? 'Remove from shelf' : undefined}
            delayMs={200}
          />
        </div>
      ) : null}

      {/* Charts Row */}
      {salesTrendLoading || stockDistLoading ? (
        <ChartsSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales Trend Chart */}
          <Card className="rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-300/50 dark:hover:border-emerald-700/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/50">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Sales Trend</CardTitle>
                    <CardDescription className="text-xs">Last 7 days daily sales</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {salesTrend && salesTrend.data.length > 0 ? (
                <div className="rounded-lg bg-muted/30 p-2">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={salesTrend.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                      <XAxis
                        dataKey="dayName"
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                      />
                      <Tooltip content={<SalesTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="totalSales"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fill="url(#salesGradient)"
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'white' }}
                        activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: 'white' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No sales data available for the last 7 days
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Distribution Chart */}
          <Card className="rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/5 hover:border-teal-300/50 dark:hover:border-teal-700/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-teal-50 p-2 dark:bg-teal-950/50">
                    <Package className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Stock Distribution</CardTitle>
                    <CardDescription className="text-xs">By unit type</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {stockDist && stockDist.data.length > 0 ? (
                <div className="rounded-lg bg-muted/30 p-2">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={stockDist.data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {stockDist.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<StockTooltip />} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12 }}
                        formatter={(value: string) => (
                          <span className="text-muted-foreground">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No stock data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Selling Medicines Quick Grid */}
      <div className="card-elevated rounded-xl p-4 lg:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-lg w-8 h-8 bg-emerald-50 dark:bg-emerald-950/50">
              <Trophy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Top Selling Medicines</h3>
              <CardDescription className="text-xs">By units sold — all time</CardDescription>
            </div>
          </div>
        </div>
        {topSellersLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="pharmacy-card rounded-lg p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        ) : topSellers.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {topSellers.slice(0, 8).map((item, index) => {
              const rank = index + 1
              const rankColors = {
                1: 'text-amber-500',
                2: 'text-slate-400',
                3: 'text-orange-500',
              }
              const rankBg = {
                1: 'bg-amber-50 dark:bg-amber-950/40',
                2: 'bg-slate-50 dark:bg-slate-900/40',
                3: 'bg-orange-50 dark:bg-orange-950/40',
              }
              return (
                <div
                  key={index}
                  className={cn(
                    'pharmacy-card rounded-lg p-4 flex flex-col gap-2 hover:scale-[1.02] transition-all duration-200',
                  rank <= 3 && 'ring-1 ring-emerald-200/50 dark:ring-emerald-800/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full',
                      rank <= 3 ? `${rankBg[rank] ?? ''} ${rankColors[rank]}` : 'bg-muted text-muted-foreground'
                    )}>
                      {rank}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.qtySold} sold</span>
                  </div>
                  <p className="text-sm font-semibold truncate leading-tight">{item.medicineName}</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(item.revenue)}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Trophy className="h-8 w-8 opacity-30 mb-2" />
            <p className="text-sm">No sales data yet</p>
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <Card className="rounded-xl transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center rounded-lg w-8 h-8 bg-teal-50 dark:bg-teal-950/50">
                <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Activity Feed</CardTitle>
                <CardDescription className="text-xs">Recent activity across your pharmacy</CardDescription>
              </div>
            </div>
            {activityData?.summary && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {activityData.summary.salesCount} sales
                </Badge>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {activityData.summary.lowStockCount + activityData.summary.expiryCount} alerts
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : activityData && activityData.activities.length > 0 ? (
            <ScrollArea className="max-h-[340px]">
              <div className="space-y-1">
                {activityData.activities.slice(0, 15).map((activity) => {
                  const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
                    sale: { icon: Receipt, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-l-emerald-500' },
                    purchase: { icon: ShoppingCart, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-l-teal-500' },
                    return: { icon: ArrowRight, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-l-amber-500' },
                    low_stock: { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-l-orange-500' },
                    expiry: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-l-red-500' },
                  }
                  const config = typeConfig[activity.type] ?? typeConfig.sale
                  const Icon = config.icon
                  const timeAgo = useMemo(() => {
                    const now = new Date()
                    const then = new Date(activity.timestamp)
                    const diffMs = now.getTime() - then.getTime()
                    const diffMin = Math.floor(diffMs / 60000)
                    if (diffMin < 1) return 'Just now'
                    if (diffMin < 60) return `${diffMin}m ago`
                    const diffHrs = Math.floor(diffMin / 60)
                    if (diffHrs < 24) return `${diffHrs}h ago`
                    const diffDays = Math.floor(diffHrs / 24)
                    return `${diffDays}d ago`
                  }, [activity.timestamp])

                  return (
                    <div key={activity.id} className={cn('flex items-start gap-3 rounded-lg px-3 py-2.5 border-l-[3px] transition-colors hover:bg-muted/30', config.border)}>
                      <div className={cn('flex items-center justify-center rounded-lg w-8 h-8 shrink-0', config.bg)}>
                        <Icon className={cn('h-4 w-4', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold truncate">{activity.title}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{timeAgo}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{activity.description}</p>
                        {activity.amount !== undefined && (
                          <p className={cn('text-xs font-bold mt-0.5', config.color)}>
                            {activity.type === 'return' ? '-' : ''}{formatCurrency(activity.amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 opacity-30 mb-2" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales by Payment Mode + Top Selling Medicines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Payment Modes Breakdown */}
        <Card className="rounded-xl transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center rounded-lg w-8 h-8 bg-violet-50 dark:bg-violet-950/50">
                <Receipt className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Payment Modes</CardTitle>
                <CardDescription className="text-xs">This month</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentModes && paymentModes.totals > 0 ? (
              <>
                {/* Stacked progress bar */}
                <div className="flex rounded-full h-3 overflow-hidden bg-muted/50">
                  {Object.entries(paymentModes.modes).map(([mode, amount]) => {
                    const pct = Math.round((amount / paymentModes.totals) * 100)
                    if (pct === 0) return null
                    const colorMap: Record<string, string> = {
                      cash: 'bg-emerald-500',
                      card: 'bg-blue-500',
                      upi: 'bg-violet-500',
                      credit: 'bg-amber-500',
                    }
                    return (
                      <div
                        key={mode}
                        className={cn('h-full transition-all duration-500', colorMap[mode] ?? 'bg-gray-500')}
                        style={{ width: `${pct}%` }}
                        title={`${mode}: ${formatCurrency(amount)}`}
                      />
                    )
                  })}
                </div>
                {/* Mode details */}
                <div className="space-y-2.5 pt-1">
                  {([
                    { key: 'cash', label: 'Cash', icon: Banknote, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
                    { key: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
                    { key: 'upi', label: 'UPI', icon: Smartphone, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40' },
                    { key: 'credit', label: 'Credit', icon: Receipt, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
                  ] as const).map(({ key, label, icon: Icon, color, bg }) => {
                    const amount = paymentModes.modes[key] ?? 0
                    const pct = paymentModes.totals > 0 ? Math.round((amount / paymentModes.totals) * 100) : 0
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className={cn('flex items-center justify-center rounded-lg w-8 h-8 shrink-0', bg)}>
                          <Icon className={cn('h-4 w-4', color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{label}</span>
                            <span className="text-sm font-bold tabular-nums">{formatCurrency(amount)}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all duration-700', 
                                  key === 'cash' ? 'bg-emerald-500' : key === 'card' ? 'bg-blue-500' : key === 'upi' ? 'bg-violet-500' : 'bg-amber-500'
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground w-8 text-right tabular-nums">{pct}%</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="pt-2 mt-1 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Total</span>
                    <span className="text-sm font-bold tabular-nums">{formatCurrency(paymentModes.totals)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-6 flex flex-col items-center gap-2 text-muted-foreground">
                <Receipt className="h-6 w-6 opacity-30" />
                <p className="text-xs">No payment data this month</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Medicines - takes 2 cols */}
        <div className="lg:col-span-2 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center rounded-lg w-8 h-8 bg-amber-50 dark:bg-amber-950/50">
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Top Selling Medicines</h3>
                <span className="text-xs text-muted-foreground">Last 30 days</span>
              </div>
            </div>
          {topSellers.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage('reports')}
              className="gap-1 text-xs"
            >
              View Report
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
        {topSellersLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="min-w-[210px] shrink-0 rounded-xl">
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : topSellers.length > 0 ? (
          <ScrollArea className="scroll-container w-full" type="scroll">
            <div className="flex gap-4 pb-2">
              {topSellers.map((item, idx) => (
                <TopSellerCard key={item.medicineName} item={item} rank={idx + 1} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card className="rounded-xl">
            <CardContent className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
              <Package className="h-8 w-8 opacity-30" />
              <p className="text-sm">No sales data in the last 30 days</p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>

      {/* Top Selling Medicines Bar Chart */}
      {topSellersLoading ? (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </CardContent>
        </Card>
      ) : topSellers.length > 0 ? (
        <Card className="rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-300/50 dark:hover:border-emerald-700/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/50">
                  <Trophy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Top Selling Medicines</CardTitle>
                  <CardDescription className="text-xs">By quantity sold — horizontal bar chart</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage('reports')}
                className="gap-1 text-xs"
              >
                View Report
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="rounded-lg bg-muted/30 p-2">
              <ResponsiveContainer width="100%" height={Math.max(200, topSellers.length * 42 + 20)}>
                <BarChart
                  data={topSellers}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="emeraldBarGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="medicineName"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    width={140}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                        const data = payload[0].payload as TopSellingItem
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-xl">
                            <p className="text-sm font-bold text-foreground">{data.medicineName}</p>
                            <p className="text-xs text-muted-foreground">{data.qtySold} units sold</p>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data.revenue)}</p>
                          </div>
                        )
                      }}
                    />
                  <Bar
                    dataKey="qtySold"
                    fill="url(#emeraldBarGradient)"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl">
          <CardContent className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
            <Trophy className="h-8 w-8 opacity-30" />
            <p className="text-sm">No sales data yet</p>
          </CardContent>
        </Card>
      )}

      {/* Bottom Section: Recent Sales + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Sales Table */}
        <Card className="xl:col-span-2 rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center rounded-lg w-8 h-8 bg-emerald-50 dark:bg-emerald-950/50">
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Recent Sales</CardTitle>
                  <CardDescription className="text-xs">Latest 5 transactions</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage('reports')}
                className="gap-1 text-xs"
              >
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {statsLoading ? (
              <div className="px-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stats && stats.recentSales.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2">
                    <TableHead className="pl-6 text-xs font-bold uppercase tracking-wider">Invoice #</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Customer</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-bold uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Amount</TableHead>
                    <TableHead className="text-right pr-6 text-xs font-bold uppercase tracking-wider">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentSales.map((sale, idx) => (
                    <TableRow
                      key={sale.id}
                      className={cn(
                        'table-row-hover transition-all duration-200 border-l-[3px] border-l-transparent hover:border-l-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/20',
                        idx % 2 === 1 && 'bg-muted/30'
                      )}
                    >
                      <TableCell className="pl-6 font-mono text-xs font-medium">
                        {sale.invoiceNo}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{sale.customerName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {format(parseISO(sale.saleDate), 'dd MMM yyyy, hh:mm a')}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(sale.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {paymentBadge(sale.paymentMode)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No sales recorded yet. Start by creating a new bill!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts Panel - Grouped by Type */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center rounded-lg w-8 h-8 bg-amber-50 dark:bg-amber-950/50">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Alerts</CardTitle>
                  <CardDescription className="text-xs">
                    {hasAlerts
                      ? `${alertsData.alerts.length} active alert${alertsData.alerts.length !== 1 ? 's' : ''}`
                      : 'All clear'}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="h-6 px-2 text-[10px] font-bold tabular-nums">
                {hasAlerts ? alertsData.alerts.length : 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : hasAlerts ? (
              <ScrollArea className="scroll-container max-h-[400px] pr-1">
                <div className="space-y-1">
                  <AlertGroup
                    title="Expired"
                    type="expired"
                    alerts={groupedAlerts.expired}
                    borderClass="border-l-red-500"
                    headerBg="bg-red-50/60 dark:bg-red-950/20"
                    dotColor="bg-red-500"
                  />
                  <AlertGroup
                    title="Expiring Soon"
                    type="expiring"
                    alerts={groupedAlerts.expiring}
                    borderClass="border-l-amber-500"
                    headerBg="bg-amber-50/60 dark:bg-amber-950/20"
                    dotColor="bg-amber-500"
                  />
                  <AlertGroup
                    title="Low Stock"
                    type="low_stock"
                    alerts={groupedAlerts.low_stock}
                    borderClass="border-l-orange-500"
                    headerBg="bg-orange-50/60 dark:bg-orange-950/20"
                    dotColor="bg-orange-400"
                  />
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <div className="rounded-full bg-emerald-50 p-3 dark:bg-emerald-950/50">
                  <Package className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium">No alerts</p>
                <p className="text-xs text-center">All systems are running smoothly</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
