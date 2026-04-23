'use client'

import { useMemo, useState } from 'react'
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
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    cash: { label: 'Cash', variant: 'default' },
    card: { label: 'Card', variant: 'secondary' },
    upi: { label: 'UPI', variant: 'outline' },
    credit: { label: 'Credit', variant: 'secondary' },
  }
  const info = map[mode] ?? { label: mode, variant: 'outline' as const }
  return <Badge variant={info.variant}>{info.label}</Badge>
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
  trend?: 'up' | 'down'
  trendLabel?: string
  delayMs?: number
}) {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-up',
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

      {/* Decorative blob in top-right corner */}
      <div className={cn(
        'absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-[0.07] dark:opacity-[0.12] pointer-events-none blur-sm transition-transform duration-500 group-hover:scale-125',
        colorClass.replace('text-', 'bg-')
      )} />
      <div className={cn(
        'absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-[0.04] dark:opacity-[0.07] pointer-events-none blur-md transition-transform duration-500 group-hover:scale-110',
        colorClass.replace('text-', 'bg-')
      )} />

      <CardContent className="relative p-4 lg:p-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className={cn('text-xl lg:text-2xl font-bold tracking-tight', colorClass)}>
              {isCurrency ? formatCurrency(value) : value.toLocaleString('en-IN')}
            </p>
            {trend && trendLabel && (
              <div className={cn(
                'flex items-center gap-1 mt-1',
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
          <div className={cn('flex items-center justify-center rounded-xl p-2.5 shrink-0 transition-transform duration-300 group-hover:scale-110', iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Skeletons ───────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-24" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
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
    1: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    2: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-600',
    3: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
  }

  const rankLabels: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' }

  return (
    <Card className="min-w-[200px] shrink-0 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-muted/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              'h-7 w-7 flex items-center justify-center p-0 text-xs font-bold shrink-0',
              rankStyles[rank] ?? 'bg-muted text-muted-foreground border-muted-foreground/20'
            )}
          >
            {rank}
          </Badge>
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-sm font-semibold truncate">{item.medicineName}</p>
            <p className="text-xs text-muted-foreground">{item.qtySold} units sold</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/60">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(item.revenue)}
          </p>
          <p className="text-[11px] text-muted-foreground">revenue</p>
        </div>
        {rank <= 3 && (
          <div className="mt-2 flex items-center gap-1">
            <Trophy className={cn(
              'h-3 w-3',
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
      badge: 'border-red-300 text-red-600 dark:border-red-800 dark:text-red-400',
    },
    warning: {
      card: 'border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30',
      titleText: 'text-amber-700 dark:text-amber-400',
      badge: 'border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400',
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
          'flex items-center justify-between rounded-lg px-3 py-2 mb-2 transition-colors cursor-pointer',
          headerBg
        )}>
          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', dotColor)} />
            <span className="text-xs font-semibold">{title}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
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
        <div className="space-y-2 mb-3">
          {alerts.map((alert) => {
            const styles = severityStyles[alert.severity] ?? severityStyles.info
            return (
              <div
                key={alert.id}
                className={cn(
                  'rounded-lg border p-3 transition-all duration-200 hover:shadow-sm border-l-4',
                  styles.card,
                  borderClass
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn('mt-0.5 h-2 w-2 rounded-full shrink-0', dotColor)} />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className={cn('text-xs font-semibold truncate', styles.titleText)}>
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

  const topSellers = useMemo(() => {
    if (!profitData?.items) return []
    return [...profitData.items]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
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
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {greeting}, Admin <Sparkles className="inline h-6 w-6 text-amber-400 ml-1" />
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {formattedDate}
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

      {/* Quick Actions - Pill-shaped cards */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setCurrentPage('billing')}
          className="flex items-center gap-3 rounded-full border bg-card px-5 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.03] hover:border-primary/40 active:scale-[0.98]"
        >
          <div className="flex items-center justify-center rounded-full bg-primary/10 p-1.5">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium">New Bill</span>
        </button>
        <button
          onClick={() => setCurrentPage('medicines')}
          className="flex items-center gap-3 rounded-full border bg-card px-5 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.03] hover:border-primary/40 active:scale-[0.98]"
        >
          <div className="flex items-center justify-center rounded-full bg-teal-500/10 p-1.5">
            <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <span className="text-sm font-medium">Add Medicine</span>
        </button>
        <button
          onClick={() => setCurrentPage('purchases')}
          className="flex items-center gap-3 rounded-full border bg-card px-5 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.03] hover:border-primary/40 active:scale-[0.98]"
        >
          <div className="flex items-center justify-center rounded-full bg-orange-500/10 p-1.5">
            <ShoppingCart className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <span className="text-sm font-medium">New Purchase</span>
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
            iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
            gradientFrom="from-emerald-500"
            gradientTo="to-transparent"
            borderClass="border-emerald-200/60 dark:border-emerald-800/40"
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
            iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
            gradientFrom="from-emerald-500"
            gradientTo="to-teal-300"
            borderClass="border-emerald-200/60 dark:border-emerald-800/40"
            trend="up"
            trendLabel="This month"
            delayMs={40}
          />
          <StatCard
            label="Total Medicines"
            value={stats.totalMedicines}
            icon={Pill}
            colorClass="text-teal-600 dark:text-teal-400"
            iconBg="bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400"
            gradientFrom="from-teal-500"
            gradientTo="to-transparent"
            borderClass="border-teal-200/60 dark:border-teal-800/40"
            delayMs={80}
          />
          <StatCard
            label="Low Stock"
            value={stats.lowStockCount}
            icon={AlertTriangle}
            colorClass="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
            gradientFrom="from-amber-500"
            gradientTo="to-transparent"
            borderClass="border-amber-200/60 dark:border-amber-800/40"
            trend={stats.lowStockCount > 0 ? 'down' : undefined}
            trendLabel={stats.lowStockCount > 0 ? 'Needs attention' : undefined}
            delayMs={120}
          />
          <StatCard
            label="Expiring Soon"
            value={stats.expiringSoonCount}
            icon={Clock}
            colorClass="text-orange-600 dark:text-orange-400"
            iconBg="bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
            gradientFrom="from-orange-500"
            gradientTo="to-transparent"
            borderClass="border-orange-200/60 dark:border-orange-800/40"
            trend={stats.expiringSoonCount > 0 ? 'down' : undefined}
            trendLabel={stats.expiringSoonCount > 0 ? 'Check expiry' : undefined}
            delayMs={160}
          />
          <StatCard
            label="Expired"
            value={stats.expiredCount}
            icon={XCircle}
            colorClass="text-red-600 dark:text-red-400"
            iconBg="bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
            gradientFrom="from-red-500"
            gradientTo="to-transparent"
            borderClass="border-red-200/60 dark:border-red-800/40"
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
          <Card className="transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Sales Trend</CardTitle>
                  <CardDescription>Last 7 days daily sales</CardDescription>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/40">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
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
          <Card className="transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Stock Distribution</CardTitle>
                  <CardDescription>By unit type</CardDescription>
                </div>
                <div className="rounded-lg bg-teal-50 p-2 dark:bg-teal-950/40">
                  <Package className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
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

      {/* Top Selling Medicines */}
      <div className="animate-fade-up">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="text-base font-semibold">Top Selling Medicines</h3>
            <span className="text-xs text-muted-foreground">Last 30 days</span>
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
              <Card key={i} className="min-w-[200px] shrink-0">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : topSellers.length > 0 ? (
          <ScrollArea className="w-full" type="scroll">
            <div className="flex gap-4 pb-2">
              {topSellers.map((item, idx) => (
                <TopSellerCard key={item.medicineName} item={item} rank={idx + 1} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
              <Package className="h-8 w-8 opacity-30" />
              <p className="text-sm">No sales data in the last 30 days</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Section: Recent Sales + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Sales Table */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Sales</CardTitle>
                <CardDescription>Latest 5 transactions</CardDescription>
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
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right pr-6">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentSales.map((sale, idx) => (
                    <TableRow
                      key={sale.id}
                      className={cn(
                        'transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary hover:bg-primary/[0.03] dark:hover:bg-primary/[0.05]',
                        idx % 2 === 1 && 'bg-muted/30'
                      )}
                    >
                      <TableCell className="pl-6 font-mono text-xs font-medium">
                        {sale.invoiceNo}
                      </TableCell>
                      <TableCell className="text-sm">{sale.customerName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {format(parseISO(sale.saleDate), 'dd MMM yyyy, hh:mm a')}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
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
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Alerts</CardTitle>
                <CardDescription>
                  {hasAlerts
                    ? `${alertsData.alerts.length} active alert${alertsData.alerts.length !== 1 ? 's' : ''}`
                    : 'All clear'}
                </CardDescription>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/40">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
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
              <ScrollArea className="max-h-[400px] pr-1">
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
