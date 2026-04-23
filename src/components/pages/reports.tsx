'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import {
  IndianRupee,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  XCircle,
  ShoppingCart,
  CalendarDays,
  FileBarChart,
  BarChart3,
  ArrowUpDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useAppStore } from '@/lib/store'

// ── Export CSV Button ────────────────────────────────────────────────────

function ExportCsvButton({ url, label }: { url: string; label: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => {
        window.open(url, '_blank')
        toast.success(`${label} export started`, { description: 'Your CSV file will download shortly.' })
      }}
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </Button>
  )
}

// ── Export PDF Button ────────────────────────────────────────────────────

function ExportPdfButton({ url }: { url: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => {
        window.open(url, '_blank', 'noopener')
        toast.success('PDF export opened', { description: 'Use browser print dialog to save as PDF.' })
      }}
    >
      <FileDown className="h-3.5 w-3.5" />
      Export PDF
    </Button>
  )
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

function formatTime(isoDate: string): string {
  return format(parseISO(isoDate), 'hh:mm a')
}

// ── Types ───────────────────────────────────────────────────────────────────

interface DailySale {
  id: string
  invoiceNo: string
  customerName: string
  saleDate: string
  totalAmount: number
  totalGst: number
  totalDiscount: number
  paymentMode: string
  itemCount: number
}

interface DailySalesData {
  date: string
  totalSales: number
  totalGst: number
  totalDiscount: number
  totalItems: number
  sales: DailySale[]
}

interface MonthlyBreakdown {
  date: string
  amount: number
  items: number
  gst: number
}

interface MonthlySalesData {
  month: string
  totalSales: number
  totalGst: number
  totalItems: number
  avgDailySales: number
  dailyBreakdown: MonthlyBreakdown[]
}

interface ProfitItem {
  medicineName: string
  qtySold: number
  revenue: number
  cost: number
  profit: number
  margin: number
}

interface ProfitData {
  fromDate: string
  toDate: string
  totalRevenue: number
  totalCost: number
  totalProfit: number
  profitMargin: number
  items: ProfitItem[]
}

interface ExpiryItem {
  id: string
  batchNumber: string
  medicineName: string
  composition: string | null
  unitType: string
  quantity: number
  mrp: number
  expiryDate: string
  daysLeft: number
  valueAtRisk: number
}

interface ExpiryData {
  expired: ExpiryItem[]
  expiring7d: ExpiryItem[]
  expiring30d: ExpiryItem[]
  expiring90d: ExpiryItem[]
}

interface LowStockItem {
  medicineName: string
  composition: string | null
  unitType: string
  totalStock: number
  batchCount: number
}

interface LowStockData {
  items: LowStockItem[]
}

// ── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  isCurrency,
  colorClass,
  iconBg,
  suffix,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  isCurrency?: boolean
  colorClass: string
  iconBg: string
  suffix?: string
}) {
  return (
    <Card className="card-3d-hover card-spotlight group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-4 lg:p-5 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className={`text-xl lg:text-2xl font-bold tracking-tight ${colorClass}`}>
              {isCurrency ? formatCurrency(Number(value)) : value}
              {suffix && <span className="text-sm font-medium ml-1">{suffix}</span>}
            </p>
          </div>
          <div className={`flex items-center justify-center rounded-xl p-2.5 ${iconBg} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
      {/* Bottom accent bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${colorClass.replace('text-', 'bg-')} opacity-40 transition-opacity group-hover:opacity-70`} />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/20 dark:to-white/[0.03] pointer-events-none transition-opacity group-hover:opacity-0" />
    </Card>
  )
}

// ── Skeletons ───────────────────────────────────────────────────────────────

function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
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

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 px-1">
      <Skeleton className="h-9 w-full rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded" />
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return <Skeleton className="h-[320px] w-full rounded-lg" />
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

// ── Date Picker Component ───────────────────────────────────────────────────

function DatePickerField({
  label,
  date,
  onDateChange,
}: {
  label: string
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm font-medium whitespace-nowrap">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 w-[160px] justify-start text-left font-normal">
            <CalendarDays className="h-4 w-4" />
            {date ? format(date, 'dd MMM yyyy') : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              onDateChange(d)
              setOpen(false)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ── Chart Tooltips ──────────────────────────────────────────────────────────

function SalesChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

function ProfitChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

// ── Daily Sales Tab ─────────────────────────────────────────────────────────

function DailySalesTab() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DailySalesData>({
    queryKey: ['report-daily-sales', dateStr],
    queryFn: () => fetch(`/api/reports/daily-sales?date=${dateStr}`).then((r) => r.json()),
  })

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <DatePickerField
          label="Date"
          date={selectedDate}
          onDateChange={(d) => d && setSelectedDate(d)}
        />
        <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Today
        </Button>
        <ExportCsvButton url={`/api/export/sales-csv?fromDate=${dateStr}&toDate=${dateStr}`} label="Daily Sales" />
        <ExportPdfButton url={`/api/export/sales-pdf?type=daily&date=${dateStr}`} />
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="section-gap-lg grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-destructive">Failed to load data.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : data ? (
        <div className="section-gap-lg grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Sales"
            value={data.totalSales}
            icon={IndianRupee}
            isCurrency
            colorClass="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
          />
          <StatCard
            label="Total GST"
            value={data.totalGst}
            icon={TrendingUp}
            isCurrency
            colorClass="text-teal-600 dark:text-teal-400"
            iconBg="bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400"
          />
          <StatCard
            label="Total Discount"
            value={data.totalDiscount}
            icon={ShoppingCart}
            isCurrency
            colorClass="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
          />
          <StatCard
            label="Items Sold"
            value={data.totalItems}
            icon={Package}
            colorClass="text-violet-600 dark:text-violet-400"
            iconBg="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
          />
        </div>
      ) : null}

      {/* Sales Table */}
  return (
    <Card className="rounded-xl border bg-muted/20 dark:bg-muted/10 card-spotlight overflow-hidden transition-all duration-200">
      <CardHeader className="p-4 dark:p-5 pb-2">
      <div className="flex items-center gap-3 mb-2">
        <FileBarChart className="h-4 w-4 text-primary/70" />
        <CardTitle className="text-base">Sales for {format(selectedDate, 'dd MMM yyyy')}</CardTitle>
      </div>
      <CardDescription className="mb-2">
          {data ? `${data.sales.length} transaction${data.sales.length !== 1 ? 's' : ''}` : ''}
        </CardDescription>
      </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : data && data.sales.length > 0 ? (
            <ScrollArea className="scroll-container max-h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Time</TableHead>
                    <TableHead className="hidden sm:table-cell text-center">Items</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right pr-6">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="pl-6 font-mono text-xs font-medium">
                        {sale.invoiceNo}
                      </TableCell>
                      <TableCell className="text-sm">{sale.customerName}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {formatTime(sale.saleDate)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        <Badge variant="outline" className="text-xs">{sale.itemCount}</Badge>
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
            </ScrollArea>
          ) : (
            <EmptyState icon={FileBarChart} message="No sales recorded for this date" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Monthly Sales Tab ───────────────────────────────────────────────────────

function MonthlySalesTab() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())

  const monthStr = format(selectedMonth, 'yyyy-MM')
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<MonthlySalesData>({
    queryKey: ['report-monthly-sales', monthStr],
    queryFn: () => fetch(`/api/reports/monthly-sales?month=${monthStr}`).then((r) => r.json()),
  })

  const chartData = useMemo(() => {
    if (!data?.dailyBreakdown) return []
    return data.dailyBreakdown.map((d) => ({
      date: format(parseISO(d.date), 'dd MMM'),
      sales: d.amount,
      gst: d.gst,
      items: d.items,
    }))
  }, [data])

  const goToPrevMonth = () => setSelectedMonth((prev) => subMonths(prev, 1))
  const goToNextMonth = () => setSelectedMonth((prev) => addMonths(prev, 1))

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" onClick={goToPrevMonth} className="h-9 w-9">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" className="gap-2 min-w-[180px] justify-center font-semibold">
          <CalendarDays className="h-4 w-4" />
          {format(selectedMonth, 'MMMM yyyy')}
        </Button>
        <Button variant="outline" size="icon" onClick={goToNextMonth} className="h-9 w-9">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSelectedMonth(new Date())} className="gap-1.5 ml-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Current
        </Button>
        <ExportCsvButton url={`/api/export/sales-csv?fromDate=${format(startOfMonth(selectedMonth), 'yyyy-MM-dd')}&toDate=${format(endOfMonth(selectedMonth), 'yyyy-MM-dd')}`} label="Monthly Sales" />
        <ExportPdfButton url={`/api/export/sales-pdf?type=monthly&month=${monthStr}`} />
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="section-gap-lg grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-destructive">Failed to load data.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : data ? (
        <div className="section-gap-lg grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Sales"
            value={data.totalSales}
            icon={IndianRupee}
            isCurrency
            colorClass="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
          />
          <StatCard
            label="Total GST"
            value={data.totalGst}
            icon={TrendingUp}
            isCurrency
            colorClass="text-teal-600 dark:text-teal-400"
            iconBg="bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400"
          />
          <StatCard
            label="Total Items"
            value={data.totalItems}
            icon={Package}
            colorClass="text-violet-600 dark:text-violet-400"
            iconBg="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
          />
          <StatCard
            label="Avg Daily Sales"
            value={data.avgDailySales}
            icon={ArrowUpDown}
            isCurrency
            colorClass="text-sky-600 dark:text-sky-400"
            iconBg="bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400"
          />
        </div>
      ) : null}

      {/* Sales Trend Chart */}
      <div className="rounded-xl border bg-muted/20 dark:bg-muted/10 p-4 dark:p-5 card-spotlight overflow-hidden transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <CardTitle className="text-base">Sales Trend</CardTitle>
            <CardDescription className="mt-0.5">Daily sales for {format(selectedMonth, 'MMMM yyyy')}</CardDescription>
          </div>
          <div className="flex items-center justify-center rounded-lg bg-primary/10 w-8 h-8">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
        </div>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                />
                <Tooltip content={<SalesChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value: string) => (
                    <span className="text-muted-foreground">
                      {value === 'sales' ? 'Sales' : 'GST'}
                    </span>
                  )}
                />
                <Bar dataKey="sales" name="sales" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="gst" name="gst" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
              No sales data for this month
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Table */}
      <div className="rounded-xl border bg-muted/20 dark:bg-muted/10 p-4 dark:p-5 card-spotlight overflow-hidden transition-all duration-200">
        <CardTitle className="text-base">Daily Breakdown</CardTitle>
        <CardDescription className="mb-3">
            {data ? `${data.dailyBreakdown.length} day${data.dailyBreakdown.length !== 1 ? 's' : ''} with sales` : ''}
          </CardDescription>
        </div>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <TableSkeleton rows={8} />
          ) : data && data.dailyBreakdown.length > 0 ? (
            <ScrollArea className="scroll-container max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Date</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Items</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right pr-6">GST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dailyBreakdown.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="pl-6 text-sm font-medium">
                        {format(parseISO(d.date), 'dd MMM yyyy (EEE)')}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        <Badge variant="outline" className="text-xs">{d.items}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatCurrency(d.amount)}
                      </TableCell>
                      <TableCell className="text-right pr-6 text-sm text-muted-foreground">
                        {formatCurrency(d.gst)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <EmptyState icon={FileBarChart} message="No sales data for this month" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Profit Report Tab ───────────────────────────────────────────────────────

function ProfitReportTab() {
  const now = new Date()
  const [fromDate, setFromDate] = useState<Date>(startOfMonth(now))
  const [toDate, setToDate] = useState<Date>(endOfMonth(now))

  const fromStr = format(fromDate, 'yyyy-MM-dd')
  const toStr = format(toDate, 'yyyy-MM-dd')
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<ProfitData>({
    queryKey: ['report-profit', fromStr, toStr],
    queryFn: () => fetch(`/api/reports/profit?fromDate=${fromStr}&toDate=${toStr}`).then((r) => r.json()),
  })

  const chartData = useMemo(() => {
    if (!data) return []
    return data.items.slice(0, 15).map((item) => ({
      name: item.medicineName.length > 20 ? item.medicineName.slice(0, 20) + '...' : item.medicineName,
      revenue: item.revenue,
      cost: item.cost,
      profit: item.profit,
    }))
  }, [data])

  return (
    <div className="space-y-4">
      {/* Date Range Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <DatePickerField label="From" date={fromDate} onDateChange={(d) => d && setFromDate(d)} />
        <DatePickerField label="To" date={toDate} onDateChange={(d) => d && setToDate(d)} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFromDate(startOfMonth(now))
            setToDate(endOfMonth(now))
          }}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          This Month
        </Button>
        <ExportCsvButton url={`/api/export/sales-csv?fromDate=${fromStr}&toDate=${toStr}`} label="Profit Data" />
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="section-gap-lg grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-destructive">Failed to load data.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : data ? (
        <div className="section-gap-lg grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={data.totalRevenue}
            icon={IndianRupee}
            isCurrency
            colorClass="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
          />
          <StatCard
            label="Total Cost"
            value={data.totalCost}
            icon={ShoppingCart}
            isCurrency
            colorClass="text-orange-600 dark:text-orange-400"
            iconBg="bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
          />
          <StatCard
            label="Total Profit"
            value={data.totalProfit}
            icon={TrendingUp}
            isCurrency
            colorClass={data.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
            iconBg={data.totalProfit >= 0
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
              : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'}
          />
          <StatCard
            label="Profit Margin"
            value={data.profitMargin.toFixed(1)}
            icon={ArrowUpDown}
            colorClass={data.profitMargin >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-red-600 dark:text-red-400'}
            iconBg={data.profitMargin >= 0
              ? 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400'
              : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'}
            suffix="%"
          />
        </div>
      ) : null}

      {/* Profit Chart */}
      <div className="rounded-xl border bg-muted/20 dark:bg-muted/10 p-4 dark:p-5 card-spotlight overflow-hidden transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <CardTitle className="text-base">Revenue vs Cost vs Profit</CardTitle>
            <CardDescription className="mt-0.5">Top 15 medicines by profit</CardDescription>
          </div>
          <div className="flex items-center justify-center rounded-lg bg-primary/10 w-8 h-8">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                />
                <Tooltip content={<ProfitChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={28} />
                <Bar dataKey="cost" name="Cost" fill="#f97316" radius={[2, 2, 0, 0]} maxBarSize={28} />
                <Bar dataKey="profit" name="Profit" fill="#06b6d4" radius={[2, 2, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
              No sales data for the selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Table */}
      <div className="rounded-xl border bg-muted/20 dark:bg-muted/10 p-4 dark:p-5 card-spotlight overflow-hidden transition-all duration-200">
        <CardTitle className="text-base">Medicine-wise Profit</CardTitle>
        <CardDescription className="mb-3">
            {data ? `${data.items.length} medicine${data.items.length !== 1 ? 's' : ''} sold` : ''}
          </CardDescription>
        </div>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : data && data.items.length > 0 ? (
            <ScrollArea className="scroll-container max-h-[440px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Medicine</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Qty Sold</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Revenue</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right pr-6">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6 text-sm font-medium">
                        {item.medicineName}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        <Badge variant="outline" className="text-xs">{item.qtySold}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-sm">
                        {formatCurrency(item.revenue)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-sm text-muted-foreground">
                        {formatCurrency(item.cost)}
                      </TableCell>
                      <TableCell className={`text-right font-semibold text-sm ${item.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(item.profit)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            item.margin >= 30
                              ? 'border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400'
                              : item.margin >= 15
                              ? 'border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400'
                              : 'border-red-300 text-red-600 dark:border-red-800 dark:text-red-400'
                          }`}
                        >
                          {item.margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <EmptyState icon={TrendingUp} message="No sales data for the selected period" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Expiry Report Tab ───────────────────────────────────────────────────────

function ExpiryReportTab() {
  const { data, isLoading, error, refetch } = useQuery<ExpiryData>({
    queryKey: ['report-expiry'],
    queryFn: () => fetch('/api/reports/expiry').then((r) => r.json()),
    refetchInterval: 60000,
  })

  const totalExpired = data?.expired.length ?? 0
  const totalExpiring7d = data?.expiring7d.length ?? 0
  const totalExpiring30d = data?.expiring30d.length ?? 0
  const totalExpiring90d = data?.expiring90d.length ?? 0

  return (
    <div className="space-y-4">
      {/* Header with export */}
      <div className="flex items-center justify-end">
        <ExportCsvButton url="/api/export/stock-csv?expiryFilter=all" label="Expiry Stock" />
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="section-gap-lg grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-destructive">Failed to load data.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="section-gap-lg grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Expired"
            value={totalExpired}
            icon={XCircle}
            colorClass="text-red-600 dark:text-red-400"
            iconBg="bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
          />
          <StatCard
            label="Expiring 7d"
            value={totalExpiring7d}
            icon={AlertTriangle}
            colorClass="text-red-500 dark:text-red-400"
            iconBg="bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400"
          />
          <StatCard
            label="Expiring 30d"
            value={totalExpiring30d}
            icon={Clock}
            colorClass="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
          />
          <StatCard
            label="Expiring 90d"
            value={totalExpiring90d}
            icon={Clock}
            colorClass="text-orange-600 dark:text-orange-400"
            iconBg="bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
          />
        </div>
      )}

      {/* Tables */}
      {isLoading ? (
        <div className="space-y-4">
          <Card><CardContent className="p-4"><TableSkeleton rows={4} /></CardContent></Card>
          <Card><CardContent className="p-4"><TableSkeleton rows={3} /></CardContent></Card>
        </div>
      ) : data && totalExpired + totalExpiring7d + totalExpiring30d + totalExpiring90d === 0 ? (
        <EmptyState icon={Clock} message="No expiring or expired stock found" />
      ) : (
        <div className="space-y-4">
          <ExpiryTable items={data?.expired ?? []} title="Expired" />
          <ExpiryTable items={data?.expiring7d ?? []} title="Expiring Within 7 Days" />
          <ExpiryTable items={data?.expiring30d ?? []} title="Expiring Within 30 Days" />
          <ExpiryTable items={data?.expiring90d ?? []} title="Expiring Within 90 Days" />
        </div>
      )}
    </div>
  )
}

// ── Low Stock Tab ───────────────────────────────────────────────────────────

function LowStockTab() {
  const { setCurrentPage } = useAppStore()
  const { data, isLoading, error, refetch } = useQuery<LowStockData>({
    queryKey: ['report-low-stock'],
    queryFn: () => fetch('/api/reports/low-stock').then((r) => r.json()),
    refetchInterval: 60000,
  })

  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      {/* Header with export */}
      <div className="flex items-center justify-end">
        <ExportCsvButton url="/api/export/stock-csv?lowStock=true" label="Low Stock" />
      </div>

      {/* Summary Card */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-destructive">Failed to load data.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Low Stock Items"
            value={items.length}
            icon={AlertTriangle}
            colorClass="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
          />
          <StatCard
            label="Out of Stock"
            value={items.filter((m) => m.totalStock === 0).length}
            icon={XCircle}
            colorClass="text-red-600 dark:text-red-400"
            iconBg="bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
          />
          <StatCard
            label="Critical Stock"
            value={items.filter((m) => m.totalStock > 0 && m.totalStock <= 5).length}
            icon={Clock}
            colorClass="text-orange-600 dark:text-orange-400"
            iconBg="bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
          />
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Low Stock Items</CardTitle>
              <CardDescription>Items with less than 10 units in stock</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setCurrentPage('purchases')}
              className="gap-1.5"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Order Now
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <TableSkeleton rows={8} />
          ) : items.length > 0 ? (
            <ScrollArea className="scroll-container max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Medicine</TableHead>
                    <TableHead className="hidden md:table-cell">Composition</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead className="hidden sm:table-cell">Unit Type</TableHead>
                    <TableHead className="text-right pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6 text-sm font-medium">
                        {item.medicineName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {item.composition || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold ${
                            item.totalStock === 0
                              ? 'border-red-300 text-red-600 dark:border-red-800 dark:text-red-400'
                              : item.totalStock <= 5
                              ? 'border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400'
                              : 'border-orange-300 text-orange-600 dark:border-orange-800 dark:text-orange-400'
                          }`}
                        >
                          {item.totalStock}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs capitalize">
                        {item.unitType}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {item.totalStock === 0 ? (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">
                            Out of Stock
                          </Badge>
                        ) : item.totalStock <= 5 ? (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                            Critical
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400">
                            Low
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <EmptyState icon={Package} message="All items are sufficiently stocked" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Expiry Helpers (outside components) ─────────────────────────────────────

function expiryDaysBadge(days: number) {
  if (days < 0) return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">Expired</Badge>
  if (days <= 7) return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">{days}d</Badge>
  if (days <= 30) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">{days}d</Badge>
  if (days <= 90) return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400">{days}d</Badge>
  return <Badge variant="outline">{days}d</Badge>
}

function expiryRowBg(days: number) {
  if (days < 0) return 'bg-red-50/60 dark:bg-red-950/20'
  if (days <= 7) return 'bg-red-50/40 dark:bg-red-950/10'
  if (days <= 30) return 'bg-amber-50/40 dark:bg-amber-950/10'
  return ''
}

function ExpiryTable({ items, title }: { items: ExpiryItem[]; title: string }) {
  if (items.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{items.length} batch{items.length !== 1 ? 'es' : ''}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ScrollArea className="scroll-container max-h-[360px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Medicine</TableHead>
                <TableHead className="hidden md:table-cell">Batch #</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="hidden sm:table-cell">Expiry Date</TableHead>
                <TableHead className="text-center">Days Left</TableHead>
                <TableHead className="text-right pr-6">Value at Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className={expiryRowBg(item.daysLeft)}>
                  <TableCell className="pl-6">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{item.medicineName}</span>
                      {item.composition && (
                        <span className="text-xs text-muted-foreground">{item.composition}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs">
                    {item.batchNumber}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {item.quantity} {item.unitType}{item.quantity !== 1 ? 's' : ''}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {format(parseISO(item.expiryDate), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="text-center">{expiryDaysBadge(item.daysLeft)}</TableCell>
                  <TableCell className="text-right pr-6 font-semibold text-sm text-red-600 dark:text-red-400">
                    {formatCurrency(item.valueAtRisk)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ── Main Reports Page ───────────────────────────────────────────────────────

export function ReportsPage() {
  return (
    <div className="page-enter p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-sm text-muted-foreground">
            Analyze sales, profit, stock expiry, and inventory levels.
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileBarChart className="h-4 w-4" />
          <span className="text-xs">Auto-refreshing data</span>
        </div>
      </div>

      {/* Tabbed Navigation */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="daily" className="tab-hover gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Daily Sales</span>
            <span className="sm:hidden">Daily</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="tab-hover gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Monthly Sales</span>
            <span className="sm:hidden">Monthly</span>
          </TabsTrigger>
          <TabsTrigger value="profit" className="tab-hover gap-1.5">
            <IndianRupee className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Profit Report</span>
            <span className="sm:hidden">Profit</span>
          </TabsTrigger>
          <TabsTrigger value="expiry" className="tab-hover gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Expiry Report</span>
            <span className="sm:hidden">Expiry</span>
          </TabsTrigger>
          <TabsTrigger value="lowstock" className="tab-hover gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Low Stock</span>
            <span className="sm:hidden">Stock</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <div className="section-fade-in">
          <DailySalesTab />
          </div>
        </TabsContent>
        <TabsContent value="monthly">
          <div className="section-fade-in">
          <MonthlySalesTab />
          </div>
        </TabsContent>
        <TabsContent value="profit">
          <div className="section-fade-in">
          <ProfitReportTab />
          </div>
        </TabsContent>
        <TabsContent value="expiry">
          <div className="section-fade-in">
          <ExpiryReportTab />
          </div>
        </TabsContent>
        <TabsContent value="lowstock">
          <div className="section-fade-in">
          <LowStockTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
