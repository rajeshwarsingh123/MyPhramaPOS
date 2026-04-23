'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  Package,
  IndianRupee,
  Clock,
  AlertTriangle,
  AlertCircle,
  Search,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  X,
  Calendar,
  TrendingDown,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ── Types ───────────────────────────────────────────────────────────────────

type ExpiryStatus = 'expired' | 'expiring_7d' | 'expiring_30d' | 'expiring_90d' | 'safe'

interface BatchInfo {
  id: string
  batchNumber: string
  expiryDate: string
  mfgDate: string | null
  purchasePrice: number
  mrp: number
  quantity: number
  initialQuantity: number
  expiryStatus: ExpiryStatus
  daysUntilExpiry: number
  valueAtRisk: number
}

interface StockItem {
  id: string
  name: string
  genericName: string | null
  companyName: string | null
  composition: string | null
  strength: string | null
  unitType: string
  totalStock: number
  minMrp: number
  maxMrp: number
  totalValue: number
  valueAtRisk: number
  worstExpiryStatus: ExpiryStatus
  batchCount: number
  batches: BatchInfo[]
}

interface StockOverview {
  totalMedicines: number
  totalStock: number
  totalValue: number
  expiring30Items: number
  expiring30Value: number
  expiredItems: number
  expiredValue: number
  lowStockItems: number
}

interface StockData {
  overview: StockOverview
  items: StockItem[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

type ExpiryFilter = 'all' | 'expiring_soon' | 'expired' | 'safe'

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-IN')
}

function expiryBadge(status: ExpiryStatus) {
  const map: Record<ExpiryStatus, { label: string; className: string }> = {
    expired: {
      label: 'Expired',
      className:
        'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800',
    },
    expiring_7d: {
      label: '7 days',
      className:
        'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    },
    expiring_30d: {
      label: '30 days',
      className:
        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800',
    },
    expiring_90d: {
      label: '90 days',
      className:
        'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-400 dark:border-yellow-800',
    },
    safe: {
      label: 'OK',
      className:
        'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800',
    },
  }
  const info = map[status]
  return (
    <Badge variant="outline" className={cn('text-[11px] px-1.5 h-5 font-semibold', info.className)}>
      {info.label}
    </Badge>
  )
}

function stockLevelIndicator(quantity: number) {
  const color =
    quantity >= 10
      ? 'text-emerald-600 dark:text-emerald-400'
      : quantity >= 5
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'
  const dot =
    quantity >= 10
      ? 'bg-emerald-500'
      : quantity >= 5
        ? 'bg-amber-500'
        : 'bg-red-500'
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-medium text-sm', color)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {formatNumber(quantity)}
    </span>
  )
}

// ── Overview Stat Card ─────────────────────────────────────────────────────

function OverviewCard({
  label,
  value,
  subtext,
  icon: Icon,
  isCurrency,
  colorClass,
  iconBg,
}: {
  label: string
  value: number
  subtext?: string
  icon: React.ElementType
  isCurrency?: boolean
  colorClass: string
  iconBg: string
}) {
  return (
    <Card className="card-elevated group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className={cn('text-xl lg:text-2xl font-bold tracking-tight', colorClass)}>
              {isCurrency ? formatCurrency(value) : formatNumber(value)}
            </p>
            {subtext && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{subtext}</p>
            )}
          </div>
          <div className={cn('flex items-center justify-center rounded-xl p-2.5 shrink-0', iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-0.5 opacity-40',
          colorClass.replace('text-', 'bg-')
        )}
      />
    </Card>
  )
}

// ── Skeletons ───────────────────────────────────────────────────────────────

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-20" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Batch Sub-table ─────────────────────────────────────────────────────────

function BatchSubTable({ batches }: { batches: BatchInfo[] }) {
  return (
    <div className="mx-4 mb-4 rounded-lg border bg-muted/30 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="text-xs font-semibold">Batch #</TableHead>
            <TableHead className="text-xs font-semibold">Qty</TableHead>
            <TableHead className="text-xs font-semibold hidden sm:table-cell">Purchase Price</TableHead>
            <TableHead className="text-xs font-semibold">MRP</TableHead>
            <TableHead className="text-xs font-semibold hidden md:table-cell">Expiry Date</TableHead>
            <TableHead className="text-xs font-semibold hidden md:table-cell">Days Left</TableHead>
            <TableHead className="text-xs font-semibold text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.id} className="text-sm">
              <TableCell className="font-mono text-xs font-medium">{batch.batchNumber}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className={cn(
                    'font-medium',
                    batch.quantity < 5
                      ? 'text-red-600 dark:text-red-400'
                      : batch.quantity < 10
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-foreground'
                  )}>
                    {batch.quantity}
                  </span>
                  <span className="text-[11px] text-muted-foreground">/ {batch.initialQuantity}</span>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                {formatCurrency(batch.purchasePrice)}
              </TableCell>
              <TableCell className="text-xs font-medium">{formatCurrency(batch.mrp)}</TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                {format(parseISO(batch.expiryDate), 'dd MMM yyyy')}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className={cn(
                  'text-xs font-medium',
                  batch.daysUntilExpiry <= 0
                    ? 'text-red-600 dark:text-red-400'
                    : batch.daysUntilExpiry <= 7
                      ? 'text-red-600 dark:text-red-400'
                      : batch.daysUntilExpiry <= 30
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-foreground'
                )}>
                  {batch.daysUntilExpiry <= 0 ? 'Expired' : `${batch.daysUntilExpiry}d`}
                </span>
              </TableCell>
              <TableCell className="text-right">{expiryBadge(batch.expiryStatus)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Pagination ──────────────────────────────────────────────────────────────

function PaginationControls({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (p: number) => void
}) {
  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
      <p className="text-xs text-muted-foreground">
        Showing page <span className="font-medium text-foreground">{page}</span> of{' '}
        <span className="font-medium text-foreground">{totalPages}</span>{' '}
        ({formatNumber(totalItems)} items)
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          className="h-8 text-xs px-2"
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 text-xs px-2"
        >
          Prev
        </Button>
        {start > 1 && <span className="px-1 text-xs text-muted-foreground">...</span>}
        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(p)}
            className="h-8 w-8 text-xs p-0"
          >
            {p}
          </Button>
        ))}
        {end < totalPages && <span className="px-1 text-xs text-muted-foreground">...</span>}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 text-xs px-2"
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="h-8 text-xs px-2"
        >
          Last
        </Button>
      </div>
    </div>
  )
}

// ── Main Stock Page ─────────────────────────────────────────────────────────

export function StockPage() {
  const [search, setSearch] = useState('')
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showTimeline, setShowTimeline] = useState(false)
  const limit = 15

  // Debounced search — use search directly with queryKey for simplicity
  const searchDebounced = search

  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const resetFilters = useCallback(() => {
    setSearch('')
    setExpiryFilter('all')
    setLowStockOnly(false)
    setPage(1)
    setExpandedRows(new Set())
  }, [])

  // Build query params
  const queryParams = new URLSearchParams()
  if (searchDebounced) queryParams.set('search', searchDebounced)
  if (expiryFilter !== 'all') queryParams.set('expiryFilter', expiryFilter)
  if (lowStockOnly) queryParams.set('lowStock', 'true')
  queryParams.set('page', String(page))
  queryParams.set('limit', String(limit))

  const queryString = queryParams.toString()

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<StockData>({
    queryKey: ['stock', queryString],
    queryFn: () => fetch(`/api/stock?${queryString}`).then((r) => r.json()),
    refetchInterval: 30000,
  })

  const overview = data?.overview
  const items = data?.items ?? []
  const pagination = data?.pagination

  // Reset page on filter change
  const handleExpiryFilterChange = (val: string) => {
    setExpiryFilter(val as ExpiryFilter)
    setPage(1)
  }
  const handleLowStockChange = (checked: boolean) => {
    setLowStockOnly(checked)
    setPage(1)
  }
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }
  const handleSearchClear = () => {
    setSearch('')
    setPage(1)
  }

  const filterActive = search || expiryFilter !== 'all' || lowStockOnly

  // Build expiry timeline data from all items across pages
  const { data: allStockData } = useQuery<StockData>({
    queryKey: ['stock-all', 'all'],
    queryFn: () => fetch('/api/stock?limit=999').then((r) => r.json()),
    enabled: showTimeline,
    refetchOnWindowFocus: false,
  })

  const expiryTimeline = useMemo(() => {
    if (!allStockData?.items) return []
    const groups: Record<string, { month: string; items: Array<{ name: string; batchNumber: string; expiryDate: string; daysLeft: number; qty: number; mrp: number; status: ExpiryStatus }> }> = {}
    for (const item of allStockData.items) {
      for (const batch of item.batches) {
      if (batch.daysUntilExpiry > 0 && batch.daysUntilExpiry <= 90 && batch.quantity > 0) {
        const monthKey = format(parseISO(batch.expiryDate), 'MMMM yyyy')
        if (!groups[monthKey]) {
          groups[monthKey] = { month: monthKey, items: [] }
        }
        groups[monthKey].items.push({
          name: item.name,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          daysLeft: batch.daysUntilExpiry,
          qty: batch.quantity,
          mrp: batch.mrp,
          status: batch.expiryStatus,
        })
      }
      }
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [allStockData])

  return (
    <div className="page-enter p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Stock Management</h2>
          <p className="text-sm text-muted-foreground">
            Monitor inventory levels, expiry dates, and batch details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTimeline(!showTimeline)}
            className={cn('gap-1.5', showTimeline && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800')}
          >
            <Calendar className="h-3.5 w-3.5" />
            Expiry Timeline
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {isLoading ? (
        <OverviewSkeleton />
      ) : isError ? (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-destructive">Failed to load stock overview.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <OverviewCard
            label="Total Medicines"
            value={overview.totalMedicines}
            icon={Package}
            colorClass="text-teal-600 dark:text-teal-400"
            iconBg="bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400"
          />
          <OverviewCard
            label="Total Stock Value"
            value={overview.totalValue}
            icon={IndianRupee}
            isCurrency
            colorClass="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
          />
          <OverviewCard
            label="Expiring in 30 Days"
            value={overview.expiring30Items}
            subtext={`Value at risk: ${formatCurrency(overview.expiring30Value)}`}
            icon={Clock}
            colorClass="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
          />
          <OverviewCard
            label="Expired Items"
            value={overview.expiredItems}
            subtext={`Value lost: ${formatCurrency(overview.expiredValue)}`}
            icon={AlertTriangle}
            colorClass="text-red-600 dark:text-red-400"
            iconBg="bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
          />
          <OverviewCard
            label="Low Stock Items"
            value={overview.lowStockItems}
            icon={AlertCircle}
            colorClass="text-orange-600 dark:text-orange-400"
            iconBg="bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
          />
        </div>
      ) : null}

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search medicines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 h-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>

            {/* Expiry Filter Tabs */}
            <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
              {[
                { value: 'all', label: 'All' },
                { value: 'expiring_soon', label: 'Expiring Soon' },
                { value: 'expired', label: 'Expired' },
                { value: 'safe', label: 'Safe' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleExpiryFilterChange(tab.value)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
                    expiryFilter === tab.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Low Stock Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="low-stock-toggle"
                checked={lowStockOnly}
                onCheckedChange={handleLowStockChange}
              />
              <Label
                htmlFor="low-stock-toggle"
                className="text-xs font-medium cursor-pointer select-none"
              >
                Low Stock Only
              </Label>
            </div>

            {/* Reset */}
            {filterActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expiry Timeline */}
      {showTimeline && (
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center rounded-lg w-8 h-8 bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Expiry Timeline</CardTitle>
                  <CardDescription>Batches expiring within 90 days, grouped by month</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowTimeline(false)} className="gap-1.5">
                <X className="h-3.5 w-3.5" />
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!expiryTimeline.length ? (
              <div className="py-8 text-center text-muted-foreground">
                <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No batches expiring within 90 days</p>
              </div>
            ) : (
              <div className="space-y-6">
                {expiryTimeline.map(([monthKey, group]) => {
                  const totalItems = group.items.reduce((s, i) => s + i.qty, 0)
                  const totalValue = group.items.reduce((s, i) => s + i.qty * i.mrp, 0)
                  return (
                    <div key={monthKey} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          <h4 className="text-sm font-semibold">{monthKey}</h4>
                          <span className="text-xs text-muted-foreground">
                            {group.items.length} batches · {formatNumber(totalItems)} units · {formatCurrency(totalValue)} at risk
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {group.items.map((batch) => (
                          <div
                            key={batch.batchNumber}
                            className={cn(
                              'flex items-center justify-between rounded-lg border px-3 py-2 text-xs',
                              batch.daysLeft <= 7
                                ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30'
                                : batch.daysLeft <= 30
                                  ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30'
                                  : 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/30'
                            )}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">{batch.name}</span>
                              <span className="text-muted-foreground text-[11px]">
                                {batch.batchNumber} · {format(parseISO(batch.expiryDate), 'dd MMM')}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-muted-foreground">{formatNumber(batch.qty)} pcs</span>
                              {expiryBadge(batch.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stock Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <Card className="border-destructive/50">
          <CardContent className="py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="text-sm text-destructive font-medium">Failed to load stock data</p>
            <p className="text-xs text-muted-foreground mt-1">
              Please check your connection and try again
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No medicines found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filterActive
                ? 'Try adjusting your filters or search terms'
                : 'Add medicines through the purchases section to see stock here'}
            </p>
            {filterActive && (
              <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Medicine Stock</CardTitle>
                <CardDescription>
                  {pagination
                    ? `${formatNumber(pagination.totalItems)} medicines across ${formatNumber(overview?.totalStock ?? 0)} units`
                    : 'Loading...'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isFetching && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Updating...
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 pl-6" />
                    <TableHead className="min-w-[200px]">Medicine Name</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[140px]">Composition</TableHead>
                    <TableHead className="hidden md:table-cell">Company</TableHead>
                    <TableHead className="hidden sm:table-cell">Unit</TableHead>
                    <TableHead className="text-right">Total Stock</TableHead>
                    <TableHead className="hidden md:table-cell text-center">Batches</TableHead>
                    <TableHead className="hidden lg:table-cell">MRP Range</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Value</TableHead>
                    <TableHead className="text-center">Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isExpanded = expandedRows.has(item.id)
                    return (
                      <Collapsible
                        key={item.id}
                        open={isExpanded}
                        onOpenChange={() => toggleRow(item.id)}
                      >
                        <TableRow
                          className={cn(
                            'table-row-hover cursor-pointer transition-colors',
                            isExpanded && 'bg-muted/30'
                          )}
                        >
                          <CollapsibleTrigger asChild>
                            <TableCell className="pl-6 pr-1 w-8">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                          </CollapsibleTrigger>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{item.name}</span>
                              {item.genericName && (
                                <span className="text-[11px] text-muted-foreground">
                                  {item.genericName}
                                </span>
                              )}
                              {item.strength && (
                                <span className="text-[11px] text-muted-foreground">
                                  {item.strength}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[180px] truncate">
                            {item.composition || '—'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[140px] truncate">
                            {item.companyName || '—'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary" className="text-[11px] h-5 font-normal">
                              {item.unitType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {stockLevelIndicator(item.totalStock)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-center">
                            <Badge variant="outline" className="text-[11px] h-5 font-mono">
                              {item.batchCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                            {item.minMrp === item.maxMrp
                              ? formatCurrency(item.minMrp)
                              : `${formatCurrency(item.minMrp)} – ${formatCurrency(item.maxMrp)}`}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right text-xs font-medium">
                            {formatCurrency(item.totalValue)}
                            {item.valueAtRisk > 0 && (
                              <div className="text-[10px] text-red-500 dark:text-red-400 font-normal">
                                -{formatCurrency(item.valueAtRisk)} at risk
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {expiryBadge(item.worstExpiryStatus)}
                          </TableCell>
                        </TableRow>
                        <TableRow className={cn(isExpanded || 'hidden')}>
                          <TableCell colSpan={10} className="p-0">
                            <CollapsibleContent>
                              <BatchSubTable batches={item.batches} />
                            </CollapsibleContent>
                          </TableCell>
                        </TableRow>
                      </Collapsible>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="p-4 border-t">
                <PaginationControls
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.totalItems}
                  onPageChange={setPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
