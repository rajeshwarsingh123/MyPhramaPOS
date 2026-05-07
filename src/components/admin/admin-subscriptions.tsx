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
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'

interface Subscription {
  id: string
  tenantId: string
  tenant: { id: string; name: string; businessName: string; email: string }
  plan: string
  amount: number
  status: string
  startDate: string
  expiryDate: string
  renewalCount: number
  paymentStatus: string
  createdAt: string
  updatedAt: string
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    active: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'Active' },
    expired: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Expired' },
    suspended: { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'Suspended' },
  }
  const c = config[status] ?? { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: status }
  return (
    <Badge className={cn(c.color, 'hover:opacity-80')}>{c.label}</Badge>
  )
}

const PAGE_SIZE = 10

export function AdminSubscriptions() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-subscriptions', statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      return fetch(`/api/admin/subscriptions?${params}`).then((r) => r.json())
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Status update failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Status updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const extendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend' }),
      })
      if (!res.ok) throw new Error('Extension failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Subscription extended by 1 year')
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
    },
    onError: () => toast.error('Failed to extend subscription'),
  })

  const subscriptions: Subscription[] = data?.subscriptions ?? []

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return subscriptions
    const q = searchQuery.toLowerCase()
    return subscriptions.filter(
      (s) =>
        s.tenant?.name?.toLowerCase().includes(q) ||
        s.tenant?.businessName?.toLowerCase().includes(q) ||
        s.tenant?.email?.toLowerCase().includes(q)
    )
  }, [subscriptions, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const activeCount = subscriptions.filter((s) => s.status === 'active').length
  const expiredCount = subscriptions.filter((s) => s.status === 'expired').length
  const suspendedCount = subscriptions.filter((s) => s.status === 'suspended').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-purple-400" />
            Subscription Management
          </h1>
          <p className="text-white/50 mt-1">Single yearly plan tracking and renewals</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{subscriptions.length}</p>
          <p className="text-xs text-white/40 mt-0.5">Total Users</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4 border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
          <p className="text-xs text-white/40 mt-0.5">Active</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4 border-red-500/20">
          <p className="text-2xl font-bold text-red-400">{expiredCount}</p>
          <p className="text-xs text-white/40 mt-0.5">Expired</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4 border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{suspendedCount}</p>
          <p className="text-xs text-white/40 mt-0.5">Suspended</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
          <Input
            placeholder="Search pharmacies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-sm text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-10 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center"><RefreshCw className="h-8 w-8 text-purple-500 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-white/40 text-xs py-4">Pharmacy Details</TableHead>
                  <TableHead className="text-white/40 text-xs">Status</TableHead>
                  <TableHead className="text-white/40 text-xs">Dates</TableHead>
                  <TableHead className="text-white/40 text-xs text-center">Remaining Days</TableHead>
                  <TableHead className="text-white/40 text-xs text-center">Renewals</TableHead>
                  <TableHead className="text-white/40 text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((sub) => {
                  const daysLeft = Math.ceil((new Date(sub.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  return (
                    <TableRow key={sub.id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <p className="text-white font-semibold">{sub.tenant?.businessName || sub.tenant?.name}</p>
                        <p className="text-xs text-white/40">{sub.tenant?.email}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={sub.status} /></TableCell>
                      <TableCell className="text-xs text-white/50">
                        <p>S: {new Date(sub.startDate).toLocaleDateString()}</p>
                        <p>E: {new Date(sub.expiryDate).toLocaleDateString()}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-bold",
                          daysLeft <= 0 ? "text-red-400 bg-red-400/10" : 
                          daysLeft <= 30 ? "text-amber-400 bg-amber-400/10" : 
                          "text-emerald-400 bg-emerald-400/10"
                        )}>
                          {daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-white font-medium">{sub.renewalCount || 0}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[10px] bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                          onClick={() => extendMutation.mutate(sub.id)}
                          disabled={extendMutation.isPending}
                        >
                          Extend +1y
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn(
                            "h-8 text-[10px]",
                            sub.status === 'suspended' 
                              ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" 
                              : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          )}
                          onClick={() => updateStatusMutation.mutate({ 
                            id: sub.id, 
                            status: sub.status === 'suspended' ? 'active' : 'suspended' 
                          })}
                        >
                          {sub.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
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
