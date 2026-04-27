'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Wallet,
  RefreshCw,
  AlertTriangle,
  Filter,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Clock,
  XCircle,
  CheckCircle2,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'

interface Payment {
  id: string
  tenantId: string
  tenantName: string
  tenantEmail: string
  plan: string
  amount: number
  status: string
  startDate: string
  endDate: string
  paymentMode: string | null
  createdAt: string
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    active: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'Active' },
    expired: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Expired' },
    cancelled: { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: 'Cancelled' },
  }
  const c = config[status] ?? { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: status }
  return <Badge className={cn(c.color, 'hover:opacity-80')}>{c.label}</Badge>
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'pro') {
    return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30">Pro</Badge>
  }
  return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30">Free</Badge>
}

export function AdminPayments() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (planFilter !== 'all') params.set('plan', planFilter)
    if (fromDate) params.set('fromDate', fromDate)
    if (toDate) params.set('toDate', toDate)
    params.set('page', String(page))
    params.set('limit', '20')
    return params.toString()
  }, [statusFilter, planFilter, fromDate, toDate, page])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-payments', queryParams],
    queryFn: () => fetch(`/api/admin/payments?${queryParams}`).then((r) => r.json()),
  })

  const payments: Payment[] = data?.payments ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)
  const activeRevenue = payments.filter((p) => p.status === 'active').reduce((sum, p) => sum + p.amount, 0)
  const pendingCount = payments.filter((p) => p.status === 'active').length
  const failedCount = payments.filter((p) => p.status === 'cancelled').length

  const handleExportCSV = () => {
    if (payments.length === 0) {
      toast.error('No data to export')
      return
    }
    const headers = ['Tenant', 'Email', 'Plan', 'Amount', 'Status', 'Start Date', 'End Date', 'Payment Mode', 'Created']
    const rows = payments.map((p) => [
      p.tenantName,
      p.tenantEmail,
      p.plan,
      p.amount,
      p.status,
      new Date(p.startDate).toLocaleDateString('en-IN'),
      new Date(p.endDate).toLocaleDateString('en-IN'),
      p.paymentMode || 'N/A',
      new Date(p.createdAt).toLocaleDateString('en-IN'),
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payments-export-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported successfully')
  }

  const resetFilters = () => {
    setStatusFilter('all')
    setPlanFilter('all')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  const hasFilters = statusFilter !== 'all' || planFilter !== 'all' || fromDate || toDate

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load payments data</p>
        <Button onClick={() => refetch()} className="bg-purple-600 hover:bg-purple-700 text-white">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Wallet className="h-7 w-7 text-purple-400" />
            Payments
          </h1>
          <p className="text-white/50 mt-1">
            {data?.total ?? 0} total payments tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => refetch()} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-xs text-white/40">Total Payments</p>
          </div>
          <p className="text-2xl font-bold text-white">₹{totalPayments.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-xs text-white/40">Active Revenue</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">₹{activeRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-xs text-white/40">Active (Pending)</p>
          </div>
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-xs text-white/40">Failed / Cancelled</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{failedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
            <Filter className="h-4 w-4 mr-2 text-white/40" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1) }}>
          <SelectTrigger className="w-36 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
          className="w-40 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
          placeholder="From"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1) }}
          className="w-40 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
          placeholder="To"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-white/40 hover:text-white/70">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <PaymentsSkeleton />
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <Wallet className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium">No payments found</p>
              <p className="text-xs mt-1">Adjust the filters to see more results</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-white/40 text-xs font-medium">Tenant</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium">Plan</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium">Amount</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium">Status</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium hidden md:table-cell">Start Date</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium hidden md:table-cell">End Date</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium hidden lg:table-cell">Payment Mode</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium hidden xl:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <div>
                          <p className="text-white font-medium text-sm">{p.tenantName}</p>
                          <p className="text-white/40 text-xs">{p.tenantEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell><PlanBadge plan={p.plan} /></TableCell>
                      <TableCell className="text-white font-medium">
                        {p.amount > 0 ? `₹${p.amount.toLocaleString('en-IN')}` : '—'}
                      </TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-white/50 text-xs hidden md:table-cell">
                        {new Date(p.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-white/50 text-xs hidden md:table-cell">
                        {new Date(p.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {p.paymentMode ? (
                          <span className="text-xs text-white/60 capitalize">{p.paymentMode.replace('_', ' ')}</span>
                        ) : (
                          <span className="text-white/30 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-white/50 text-xs hidden xl:table-cell">
                        {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-white/10 text-white/70 hover:bg-white/5"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-white/10 text-white/70 hover:bg-white/5"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentsSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <div className="flex-1">
            <Skeleton className="h-4 w-32 bg-white/5" />
            <Skeleton className="h-3 w-24 mt-1 bg-white/5" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full bg-white/5" />
          <Skeleton className="h-4 w-16 bg-white/5" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/5" />
          <Skeleton className="h-4 w-24 bg-white/5 hidden md:block" />
          <Skeleton className="h-4 w-24 bg-white/5 hidden md:block" />
          <Skeleton className="h-4 w-20 bg-white/5 hidden lg:block" />
        </div>
      ))}
    </div>
  )
}
