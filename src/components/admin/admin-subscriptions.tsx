'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  CreditCard,
  RefreshCw,
  AlertTriangle,
  Filter,
  CalendarDays,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface Subscription {
  id: string
  tenantId: string
  tenant: { id: string; name: string; businessName: string; email: string }
  plan: string
  amount: number
  status: string
  startDate: string
  endDate: string
  paymentMode: string | null
  createdAt: string
  updatedAt: string
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    active: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'Active' },
    expired: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Expired' },
    cancelled: { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: 'Cancelled' },
  }
  const c = config[status] ?? { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: status }
  return (
    <Badge className={cn(c.color, 'hover:opacity-80')}>{c.label}</Badge>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'pro') {
    return (
      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30">
        Pro
      </Badge>
    )
  }
  return (
    <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30">
      Free
    </Badge>
  )
}

function PaymentModeBadge({ mode }: { mode: string | null }) {
  if (!mode) return <span className="text-white/30 text-xs">—</span>
  const config: Record<string, { color: string; label: string }> = {
    upi: { color: 'text-violet-300', label: 'UPI' },
    card: { color: 'text-blue-300', label: 'Card' },
    bank_transfer: { color: 'text-amber-300', label: 'Bank Transfer' },
  }
  const c = config[mode] ?? { color: 'text-white/60', label: mode }
  return <span className={cn('text-xs font-medium', c.color)}>{c.label}</span>
}

export function AdminSubscriptions() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planChangeId, setPlanChangeId] = useState<string | null>(null)
  const [newPlan, setNewPlan] = useState<string>('free')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-subscriptions', statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      return fetch(`/api/admin/subscriptions?${params}`).then((r) => r.json())
    },
  })

  const changePlanMutation = useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: string }) => {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error('Plan change failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Plan updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      setPlanChangeId(null)
      setNewPlan('free')
    },
    onError: () => toast.error('Failed to update plan'),
  })

  const subscriptions: Subscription[] = data?.subscriptions ?? []

  const activeCount = subscriptions.filter((s) => s.status === 'active').length
  const expiredCount = subscriptions.filter((s) => s.status === 'expired').length
  const totalRevenue = subscriptions.reduce((sum, s) => sum + s.amount, 0)
  const proRevenue = subscriptions.filter((s) => s.plan === 'pro' && s.status === 'active').reduce((sum, s) => sum + s.amount, 0)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load subscriptions</p>
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
            <CreditCard className="h-7 w-7 text-purple-400" />
            Subscriptions
          </h1>
          <p className="text-white/50 mt-1">Manage all tenant subscriptions</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Total Subscriptions</p>
          <p className="text-2xl font-bold text-white">{subscriptions.length}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Expired</p>
          <p className="text-2xl font-bold text-red-400">{expiredCount}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Pro Revenue (Active)</p>
          <p className="text-2xl font-bold text-purple-400">₹{proRevenue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')} className="text-white/40 hover:text-white/70">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <SubscriptionsSkeleton />
          ) : subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <CreditCard className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium">No subscriptions found</p>
              <p className="text-xs mt-1">Adjust the filter to see more results</p>
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
                    <TableHead className="text-white/40 text-xs font-medium text-right">Change Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <div>
                          <p className="text-white font-medium text-sm">{sub.tenant?.name ?? 'Unknown'}</p>
                          <p className="text-white/40 text-xs">{sub.tenant?.businessName ?? sub.tenant?.email ?? ''}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {planChangeId === sub.id ? (
                          <Select value={newPlan} onValueChange={setNewPlan}>
                            <SelectTrigger className="w-24 h-7 text-xs bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <PlanBadge plan={sub.plan} />
                        )}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {sub.amount > 0 ? `₹${sub.amount.toLocaleString('en-IN')}` : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sub.status} />
                      </TableCell>
                      <TableCell className="text-white/50 text-xs hidden md:table-cell">
                        {new Date(sub.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-white/50 text-xs hidden md:table-cell">
                        {new Date(sub.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <PaymentModeBadge mode={sub.paymentMode} />
                      </TableCell>
                      <TableCell className="text-right">
                        {planChangeId === sub.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => changePlanMutation.mutate({ id: sub.id, plan: newPlan })}
                              disabled={changePlanMutation.isPending}
                            >
                              {changePlanMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-white/40 hover:text-white/70"
                              onClick={() => { setPlanChangeId(null); setNewPlan('free') }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                            onClick={() => { setPlanChangeId(sub.id); setNewPlan(sub.plan) }}
                          >
                            Change
                          </Button>
                        )}
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

function SubscriptionsSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-4 w-28 bg-white/5" />
          <Skeleton className="h-5 w-12 rounded-full bg-white/5" />
          <Skeleton className="h-4 w-20 bg-white/5" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/5" />
          <Skeleton className="h-4 w-24 bg-white/5 hidden md:block" />
          <Skeleton className="h-4 w-24 bg-white/5 hidden md:block" />
          <Skeleton className="h-4 w-20 bg-white/5 hidden lg:block" />
          <div className="flex-1" />
          <Skeleton className="h-7 w-16 rounded bg-white/5" />
        </div>
      ))}
    </div>
  )
}
