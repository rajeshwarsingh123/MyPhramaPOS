'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { format, parseISO } from 'date-fns'
import {
  IndianRupee,
  Pill,
  AlertTriangle,
  Clock,
  XCircle,
  TrendingUp,
  ShoppingCart,
  Plus,
  Receipt,
  ArrowRight,
  RefreshCw,
  Package,
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

// ── Stats Card Component ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  isCurrency,
  colorClass,
  iconBg,
}: {
  label: string
  value: number
  icon: React.ElementType
  isCurrency?: boolean
  colorClass: string
  iconBg: string
}) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className={`text-xl lg:text-2xl font-bold tracking-tight ${colorClass}`}>
              {isCurrency ? formatCurrency(value) : value.toLocaleString('en-IN')}
            </p>
          </div>
          <div className={`flex items-center justify-center rounded-xl p-2.5 ${iconBg} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
      {/* Subtle bottom accent */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${colorClass.replace('text-', 'bg-')} opacity-40`} />
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

// ── Main Dashboard ──────────────────────────────────────────────────────────

export function DashboardPage() {
  const { setCurrentPage } = useAppStore()

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

  const hasAlerts = alertsData && alertsData.alerts.length > 0

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening at your pharmacy today.
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

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setCurrentPage('billing')}
          className="gap-2 shadow-sm"
        >
          <Receipt className="h-4 w-4" />
          New Bill
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentPage('medicines')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Medicine
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentPage('purchases')}
          className="gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          New Purchase
        </Button>
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
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Today's Sales"
            value={stats.todaySales}
            icon={IndianRupee}
            isCurrency
            colorClass="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
          />
          <StatCard
            label="Monthly Sales"
            value={stats.monthSales}
            icon={TrendingUp}
            isCurrency
            colorClass="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
          />
          <StatCard
            label="Total Medicines"
            value={stats.totalMedicines}
            icon={Pill}
            colorClass="text-teal-600 dark:text-teal-400"
            iconBg="bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400"
          />
          <StatCard
            label="Low Stock"
            value={stats.lowStockCount}
            icon={AlertTriangle}
            colorClass="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
          />
          <StatCard
            label="Expiring Soon"
            value={stats.expiringSoonCount}
            icon={Clock}
            colorClass="text-orange-600 dark:text-orange-400"
            iconBg="bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
          />
          <StatCard
            label="Expired"
            value={stats.expiredCount}
            icon={XCircle}
            colorClass="text-red-600 dark:text-red-400"
            iconBg="bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
          />
        </div>
      ) : null}

      {/* Charts Row */}
      {salesTrendLoading || stockDistLoading ? (
        <ChartsSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales Trend Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Sales Trend</CardTitle>
                  <CardDescription>Last 7 days daily sales</CardDescription>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {salesTrend && salesTrend.data.length > 0 ? (
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
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No sales data available for the last 7 days
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Distribution Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Stock Distribution</CardTitle>
                  <CardDescription>By unit type</CardDescription>
                </div>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {stockDist && stockDist.data.length > 0 ? (
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
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No stock data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                  <TableRow>
                    <TableHead className="pl-6">Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right pr-6">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="pl-6 font-mono text-xs font-medium">
                        {sale.invoiceNo}
                      </TableCell>
                      <TableCell className="text-sm">{sale.customerName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {format(parseISO(sale.saleDate), 'dd MMM yyyy, hh:mm a')}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
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

        {/* Alerts Panel */}
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
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
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
              <ScrollArea className="max-h-[360px] pr-1">
                <div className="space-y-2">
                  {alertsData.alerts.slice(0, 15).map((alert) => (
                    <div
                      key={alert.id}
                      className={`rounded-lg border p-3 transition-colors ${
                        alert.severity === 'critical'
                          ? 'border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30'
                          : alert.severity === 'warning'
                          ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30'
                          : 'border-orange-200 bg-orange-50/80 dark:border-orange-900/50 dark:bg-orange-950/30'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                            alert.severity === 'critical'
                              ? 'bg-red-500'
                              : alert.severity === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-orange-400'
                          }`}
                        />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${
                              alert.severity === 'critical'
                                ? 'text-red-700 dark:text-red-400'
                                : alert.severity === 'warning'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-orange-700 dark:text-orange-400'
                            }`}
                          >
                            {alert.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                            {alert.description}
                          </p>
                          <Badge
                            variant="outline"
                            className={`mt-1 text-[10px] px-1.5 h-4 w-fit ${
                              alert.type === 'expired'
                                ? 'border-red-300 text-red-600 dark:border-red-800 dark:text-red-400'
                                : alert.type === 'expiring'
                                ? 'border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400'
                                : 'border-orange-300 text-orange-600 dark:border-orange-800 dark:text-orange-400'
                            }`}
                          >
                            {alert.type === 'expired'
                              ? 'Expired'
                              : alert.type === 'expiring'
                              ? 'Expiring'
                              : 'Low Stock'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
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
