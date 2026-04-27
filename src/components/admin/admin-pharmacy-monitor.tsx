'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Hash,
} from 'lucide-react'

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

function ProgressBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">{label}</span>
        <span className={cn('text-xs font-semibold', color)}>{value}%</span>
      </div>
      <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  )
}

export function AdminPharmacyMonitor() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-pharmacy-monitor'],
    queryFn: () => fetch('/api/admin/pharmacy-monitor').then((r) => r.json()),
    refetchInterval: 30000,
  })

  const monitor: MonitorData | null = data ?? null

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load pharmacy monitor data</p>
        <Button onClick={() => refetch()} className="bg-purple-600 hover:bg-purple-700 text-white">
          Try Again
        </Button>
      </div>
    )
  }

  if (isLoading || !monitor) {
    return <MonitorSkeleton />
  }

  const maxSold = monitor.topMedicines.length > 0 ? monitor.topMedicines[0].totalSold : 1

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Building2 className="h-7 w-7 text-purple-400" />
            Pharmacy Data Monitor
          </h1>
          <p className="text-white/50 mt-1">Platform-wide data overview (read-only)</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-xs text-white/40">Medicines</p>
          </div>
          <p className="text-2xl font-bold text-white">{monitor.totalMedicines.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Hash className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-xs text-white/40">Stock Units</p>
          </div>
          <p className="text-2xl font-bold text-white">{monitor.totalStock.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-xs text-white/40">Stock Value</p>
          </div>
          <p className="text-xl font-bold text-emerald-400">₹{monitor.totalStockValue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-orange-400" />
            </div>
            <p className="text-xs text-white/40">Low Stock</p>
          </div>
          <p className="text-2xl font-bold text-orange-400">{monitor.lowStockCount.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-xs text-white/40">Expired</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{monitor.expiredCount.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-xs text-white/40">Expiring Soon</p>
          </div>
          <p className="text-2xl font-bold text-amber-400">{monitor.expiringCount.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Middle Row: Top Medicines + Platform Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Medicines */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              Top 10 Medicines by Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monitor.topMedicines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/30">
                <Package className="h-8 w-8 mb-2" />
                <p className="text-sm">No sales data available</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {monitor.topMedicines.map((med, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-white/30 w-5 text-right">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white/80 truncate max-w-[200px]">{med.name}</span>
                        <span className="text-xs text-white/50 ml-2 shrink-0">
                          {med.totalSold} sold &middot; ₹{med.revenue.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-700"
                          style={{ width: `${maxSold > 0 ? (med.totalSold / maxSold) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Health */}
        <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-purple-400" />
              Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stock Health */}
            <div>
              <p className="text-xs text-white/40 mb-2">Stock Health</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-white/50">Healthy</span>
                </div>
                <span className="text-xs text-white/30">
                  ({monitor.stockHealth.healthyStock})
                </span>
              </div>
              <ProgressBar
                value={monitor.stockHealth.percentage}
                color={monitor.stockHealth.percentage >= 80 ? 'text-emerald-400' : monitor.stockHealth.percentage >= 50 ? 'text-amber-400' : 'text-red-400'}
                label={`${monitor.stockHealth.percentage}% healthy`}
              />
              {monitor.stockHealth.lowOrExpired > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-xs text-red-300">
                    {monitor.stockHealth.lowOrExpired} items need attention
                  </span>
                </div>
              )}
            </div>

            {/* Data Quality */}
            <div className="pt-4 border-t border-white/5">
              <p className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                Data Quality
              </p>
              <div className="bg-white/[0.03] rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Total Medicines</span>
                  <span className="text-white font-medium">{monitor.dataQuality.totalMedicines}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Complete Info</span>
                  <span className="text-emerald-400 font-medium">{monitor.dataQuality.completeInfo}</span>
                </div>
                <ProgressBar
                  value={monitor.dataQuality.percentage}
                  color={monitor.dataQuality.percentage >= 80 ? 'text-emerald-400' : monitor.dataQuality.percentage >= 50 ? 'text-amber-400' : 'text-red-400'}
                  label="Completion rate"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="pt-4 border-t border-white/5 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Expired Items</span>
                <span className={cn('font-medium', monitor.expiredCount > 0 ? 'text-red-400' : 'text-emerald-400')}>
                  {monitor.expiredCount}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Expiring in 30 days</span>
                <span className={cn('font-medium', monitor.expiringCount > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                  {monitor.expiringCount}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Low Stock Items</span>
                <span className={cn('font-medium', monitor.lowStockCount > 0 ? 'text-orange-400' : 'text-emerald-400')}>
                  {monitor.lowStockCount}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            Recent Sales (Latest 10)
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
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-white/40 text-xs font-medium">Invoice #</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium">Customer</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitor.recentSales.map((sale, idx) => (
                    <TableRow key={idx} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <span className="text-white font-medium text-sm font-mono">{sale.invoiceNo}</span>
                      </TableCell>
                      <TableCell className="text-white/80 text-sm">{sale.customer}</TableCell>
                      <TableCell className="text-white/50 text-xs hidden sm:table-cell">
                        {new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-emerald-400 font-medium text-sm text-right">
                        ₹{sale.amount.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MonitorSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 bg-white/5" />
        <Skeleton className="h-4 w-48 mt-2 bg-white/5" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="w-9 h-9 rounded-lg bg-white/5" />
              <Skeleton className="h-3 w-16 bg-white/5" />
            </div>
            <Skeleton className="h-7 w-20 bg-white/5" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4 lg:col-span-2">
          <Skeleton className="h-5 w-40 mb-4 bg-white/5" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <Skeleton className="h-4 w-5 bg-white/5" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1 bg-white/5" />
                <Skeleton className="h-2 w-full bg-white/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <Skeleton className="h-5 w-32 mb-4 bg-white/5" />
          <Skeleton className="h-2 w-full mb-2 bg-white/5 rounded-full" />
          <Skeleton className="h-2 w-3/4 mb-4 bg-white/5 rounded-full" />
          <Skeleton className="h-3 w-24 mb-2 bg-white/5" />
          <Skeleton className="h-3 w-20 bg-white/5" />
        </div>
      </div>
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
