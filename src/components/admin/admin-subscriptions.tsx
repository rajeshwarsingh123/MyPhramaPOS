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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
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
  Crown,
  Save,
  RotateCcw,
  Info,
  Loader2,
} from 'lucide-react'
import { useState, useMemo, useEffect, useCallback } from 'react'
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

const PRO_FEATURE_OPTIONS = [
  { id: 'billing', label: 'Billing & POS' },
  { id: 'inventory', label: 'Inventory Management' },
  { id: 'advanced_reports', label: 'Advanced Reports & Analytics' },
  { id: 'ai_scan', label: 'AI Prescription Scan' },
  { id: 'bulk_import', label: 'Bulk Import' },
  { id: 'export_reports', label: 'Export Reports (PDF/Excel)' },
  { id: 'custom_branding', label: 'Custom Branding' },
  { id: 'api_access', label: 'API Access' },
  { id: 'multi_user', label: 'Multi User (Unlimited)' },
  { id: 'priority_support', label: 'Priority Support' },
]

function parseFeaturesList(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function AdminSubscriptions() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  // --- Plan Configuration State ---
  const [planPrice, setPlanPrice] = useState('4999')
  const [proFeatures, setProFeatures] = useState<string[]>([])
  const [isPlanDirty, setIsPlanDirty] = useState(false)

  // Fetch all settings to get the plan configuration
  const { data: settingsData, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => fetch('/api/admin/settings').then((r) => r.json()),
  })

  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings
      setPlanPrice(s.pro_plan_price_yearly || '4999')
      setProFeatures(parseFeaturesList(s.pro_plan_features || '[]'))
      setIsPlanDirty(false)
    }
  }, [settingsData])

  const savePlanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            pro_plan_price_yearly: planPrice,
            pro_plan_features: JSON.stringify(proFeatures),
          },
        }),
      })
      if (!res.ok) throw new Error('Failed to save plan')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Subscription plan updated successfully')
      setIsPlanDirty(false)
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] })
    },
    onError: () => toast.error('Failed to update plan configuration'),
  })

  const toggleFeature = useCallback((id: string) => {
    setProFeatures((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      setIsPlanDirty(true)
      return next
    })
  }, [])

  const handlePriceChange = (v: string) => {
    setPlanPrice(v)
    setIsPlanDirty(true)
  }

  const resetPlan = () => {
    if (settingsData?.settings) {
      const s = settingsData.settings
      setPlanPrice(s.pro_plan_price_yearly || '4999')
      setProFeatures(parseFeaturesList(s.pro_plan_features || '[]'))
      setIsPlanDirty(false)
    }
  }

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
            <CreditCard className="h-7 w-7 text-primary" />
            Subscription Management
          </h1>
          <p className="text-white/50 mt-1">Single yearly plan tracking and renewals</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh List
          </Button>
        </div>
      </div>

      {/* ========== GLOBAL PLAN CONFIGURATION ========== */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-primary/20 rounded-xl overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-white">Yearly Professional Plan</h2>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase tracking-wider px-2">
                  Active Plan
                </Badge>
              </div>
              <p className="text-sm text-white/40">Configure the price and features for all pharmacies</p>
            </div>

            <div className="flex items-center gap-3">
              {isPlanDirty && (
                <Button 
                  onClick={resetPlan} 
                  variant="ghost" 
                  size="sm" 
                  className="text-white/40 hover:text-white/60"
                  disabled={savePlanMutation.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Discard
                </Button>
              )}
              <Button 
                onClick={() => savePlanMutation.mutate()} 
                disabled={!isPlanDirty || savePlanMutation.isPending}
                className={cn(
                  "h-10 px-6 font-bold transition-all",
                  isPlanDirty 
                    ? "bg-primary text-white hover:bg-primary/80 shadow-lg shadow-primary/20" 
                    : "bg-white/5 text-white/40 cursor-not-allowed"
                )}
              >
                {savePlanMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isPlanDirty ? 'Save Plan Changes' : 'Plan is Up-to-date'}
              </Button>
            </div>
          </div>

          <Separator className="bg-white/5 my-6" />

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Price Setting */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm font-medium">Yearly Subscription Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                    ₹
                  </span>
                  <Input
                    type="number"
                    value={planPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="pl-7 h-11 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white text-lg font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">
                    per year
                  </span>
                </div>
                <p className="text-[11px] text-white/30 flex items-center gap-1.5 pt-1">
                  <Info className="h-3 w-3" />
                  This price will be shown on the landing page and tenant portal.
                </p>
              </div>
            </div>

            {/* Features Selection */}
            <div className="lg:col-span-2 space-y-4">
              <Label className="text-white/70 text-sm font-medium">Included Features</Label>
              <div className="grid sm:grid-cols-2 gap-3">
                {PRO_FEATURE_OPTIONS.map((feat) => (
                  <label
                    key={feat.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      proFeatures.includes(feat.id)
                        ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]',
                    )}
                  >
                    <Checkbox
                      checked={proFeatures.includes(feat.id)}
                      onCheckedChange={() => toggleFeature(feat.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span
                      className={cn(
                        'text-xs font-medium',
                        proFeatures.includes(feat.id) ? 'text-white' : 'text-white/40',
                      )}
                    >
                      {feat.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
            <SelectItem value="all" className="focus:bg-white/10 focus:text-white text-white">All Status</SelectItem>
            <SelectItem value="active" className="focus:bg-white/10 focus:text-white text-white">Active</SelectItem>
            <SelectItem value="expired" className="focus:bg-white/10 focus:text-white text-white">Expired</SelectItem>
            <SelectItem value="suspended" className="focus:bg-white/10 focus:text-white text-white">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center"><RefreshCw className="h-8 w-8 text-primary animate-spin" /></div>
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
                          className="h-8 text-[10px] bg-primary/10 text-primary hover:bg-primary/20"
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
