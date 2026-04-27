'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Search,
  Eye,
  Pencil,
  Ban,
  CheckCircle2,
  Trash2,
  Users,
  RefreshCw,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  KeyRound,
  SlidersHorizontal,
  ShieldAlert,
  MoreHorizontal,
  EyeOff,
  Loader2,
  UserCheck,
  Activity,
  ShieldCheck,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface Tenant {
  id: string
  name: string
  email: string
  phone: string | null
  businessName: string
  businessPhone: string | null
  businessAddress: string | null
  gstNumber: string | null
  plan: string
  status: string
  createdAt: string
  updatedAt: string
}

interface TenantLimits {
  maxMedicines?: number | null
  maxBillsPerDay?: number | null
  maxStaffUsers?: number | null
  featuresDisabled?: string[]
}

interface SystemLogEntry {
  id: string
  action: string
  details: string | null
  createdAt: string
}

const FEATURES_LIST = [
  { id: 'ai_scan', label: 'AI Scan' },
  { id: 'export_reports', label: 'Export Reports' },
  { id: 'bulk_import', label: 'Bulk Import' },
  { id: 'custom_branding', label: 'Custom Branding' },
  { id: 'api_access', label: 'API Access' },
]

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (password.length < 6) return { label: 'Too short', color: 'bg-red-500', width: 'w-1/4' }
  if (password.length < 10) return { label: 'Weak', color: 'bg-orange-500', width: 'w-2/4' }
  if (password.length < 14) return { label: 'Medium', color: 'bg-amber-500', width: 'w-3/4' }
  return { label: 'Strong', color: 'bg-emerald-500', width: 'w-full' }
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

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    active: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'Active' },
    suspended: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Suspended' },
    trial: { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'Trial' },
  }
  const c = config[status] ?? { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: status }
  return (
    <Badge className={cn(c.color, 'hover:opacity-80')}>{c.label}</Badge>
  )
}

export function AdminUsers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-tenants', search, planFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: String(limit),
      })
      if (planFilter !== 'all') params.set('plan', planFilter)
      return fetch(`/api/admin/tenants?${params}`).then((r) => r.json())
    },
  })

  const [selectedUser, setSelectedUser] = useState<Tenant | null>(null)
  const [viewDialog, setViewDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [resetPwdDialog, setResetPwdDialog] = useState(false)
  const [banDialog, setBanDialog] = useState(false)
  const [limitsDialog, setLimitsDialog] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', businessName: '', plan: 'free', status: 'active' })

  // Reset password form state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Ban form state
  const [banAction, setBanAction] = useState<'ban' | 'unban'>('ban')
  const [banReason, setBanReason] = useState('')

  // Limits form state
  const [limitsForm, setLimitsForm] = useState<TenantLimits>({
    maxMedicines: 50,
    maxBillsPerDay: 100,
    maxStaffUsers: 1,
    featuresDisabled: [],
  })
  const [limitsLoading, setLimitsLoading] = useState(false)

  // Fetch system logs for selected tenant when view dialog opens
  const { data: logsData } = useQuery({
    queryKey: ['tenant-logs', selectedUser?.id],
    queryFn: () =>
      fetch(`/api/admin/tenants/${selectedUser!.id}`).then((r) => r.json()),
    enabled: !!selectedUser && viewDialog,
    select: (data) => data?.systemLogs as SystemLogEntry[] | undefined,
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const res = await fetch(`/api/admin/tenants/${selectedUser?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Update failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('User updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      setEditDialog(false)
      setSelectedUser(null)
    },
    onError: () => toast.error('Failed to update user'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/tenants/${selectedUser?.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('User deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      setDeleteDialog(false)
      setSelectedUser(null)
    },
    onError: () => toast.error('Failed to delete user'),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async (tenant: Tenant) => {
      const newStatus = tenant.status === 'active' ? 'suspended' : 'active'
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Toggle failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('User status updated')
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: { newPassword: string }) => {
      const res = await fetch(`/api/admin/tenants/${selectedUser?.id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Reset failed')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Password reset successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      setResetPwdDialog(false)
      setSelectedUser(null)
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to reset password'),
  })

  const banMutation = useMutation({
    mutationFn: async (payload: { banned: boolean; reason?: string }) => {
      const res = await fetch(`/api/admin/tenants/${selectedUser?.id}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Ban update failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success(banAction === 'ban' ? 'User banned successfully' : 'User activated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      setBanDialog(false)
      setSelectedUser(null)
      setBanReason('')
    },
    onError: () => toast.error('Failed to update ban status'),
  })

  const limitsMutation = useMutation({
    mutationFn: async (payload: TenantLimits) => {
      const res = await fetch(`/api/admin/tenants/${selectedUser?.id}/limits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Limits update failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Usage limits saved successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      setLimitsDialog(false)
      setSelectedUser(null)
    },
    onError: () => toast.error('Failed to update usage limits'),
  })

  const handleView = (user: Tenant) => {
    setSelectedUser(user)
    setViewDialog(true)
  }

  const handleEdit = (user: Tenant) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name,
      businessName: user.businessName,
      plan: user.plan,
      status: user.status,
    })
    setEditDialog(true)
  }

  const handleDelete = (user: Tenant) => {
    setSelectedUser(user)
    setDeleteDialog(true)
  }

  const handleResetPassword = (user: Tenant) => {
    setSelectedUser(user)
    setNewPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setResetPwdDialog(true)
  }

  const handleBan = (user: Tenant) => {
    setSelectedUser(user)
    setBanAction(user.status === 'suspended' ? 'unban' : 'ban')
    setBanReason('')
    setBanDialog(true)
  }

  const handleLimits = async (user: Tenant) => {
    setSelectedUser(user)
    setLimitsForm({
      maxMedicines: user.plan === 'pro' ? null : 50,
      maxBillsPerDay: 100,
      maxStaffUsers: 1,
      featuresDisabled: [],
    })
    setLimitsLoading(true)
    setLimitsDialog(true)
    try {
      const res = await fetch(`/api/admin/tenants/${user.id}/limits`)
      const data = await res.json()
      if (data?.limits) {
        setLimitsForm({
          maxMedicines: data.limits.maxMedicines ?? (user.plan === 'pro' ? null : 50),
          maxBillsPerDay: data.limits.maxBillsPerDay ?? 100,
          maxStaffUsers: data.limits.maxStaffUsers ?? 1,
          featuresDisabled: data.limits.featuresDisabled ?? [],
        })
      }
    } catch {
      // Keep defaults on error
    } finally {
      setLimitsLoading(false)
    }
  }

  const handleEditSave = () => {
    updateMutation.mutate(editForm)
  }

  const handleResetPasswordSave = useCallback(() => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    resetPasswordMutation.mutate({ newPassword })
  }, [newPassword, confirmPassword, resetPasswordMutation])

  const handleBanSave = useCallback(() => {
    if (banAction === 'ban' && !banReason.trim()) {
      toast.error('Please provide a reason for banning')
      return
    }
    banMutation.mutate({
      banned: banAction === 'ban',
      reason: banAction === 'ban' ? banReason : undefined,
    })
  }, [banAction, banReason, banMutation])

  const handleLimitsSave = useCallback(() => {
    limitsMutation.mutate(limitsForm)
  }, [limitsForm, limitsMutation])

  const toggleFeature = useCallback((featureId: string) => {
    setLimitsForm((prev) => {
      const current = prev.featuresDisabled ?? []
      const updated = current.includes(featureId)
        ? current.filter((f) => f !== featureId)
        : [...current, featureId]
      return { ...prev, featuresDisabled: updated }
    })
  }, [])

  const users: Tenant[] = data?.tenants ?? []
  const total: number = data?.pagination?.total ?? data?.total ?? 0
  const totalPages = Math.ceil(total / limit)
  const lastLog = logsData?.[0]

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load users</p>
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
            <Users className="h-7 w-7 text-purple-400" />
            User Management
          </h1>
          <p className="text-white/50 mt-1">{total} total tenants</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search by name, email, or business..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
            <Filter className="h-4 w-4 mr-2 text-white/40" />
            <SelectValue placeholder="Plan Filter" />
          </SelectTrigger>
          <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <UsersSkeleton />
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <Users className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium">No users found</p>
              <p className="text-xs mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-white/40 text-xs font-medium">Name</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium">Email</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium hidden md:table-cell">Business</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium">Plan</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium">Status</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="text-white font-medium">{user.name}</TableCell>
                      <TableCell className="text-white/60 text-sm">{user.email}</TableCell>
                      <TableCell className="text-white/60 text-sm hidden md:table-cell">{user.businessName}</TableCell>
                      <TableCell>
                        <PlanBadge plan={user.plan} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={user.status} />
                      </TableCell>
                      <TableCell className="text-white/40 text-xs hidden lg:table-cell">
                        {new Date(user.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider delayDuration={300}>
                            {/* View */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleView(user)}
                                  className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/5"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-white/10 text-white border-white/20 text-xs">
                                View Details
                              </TooltipContent>
                            </Tooltip>

                            {/* Edit */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(user)}
                                  className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/5"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-white/10 text-white border-white/20 text-xs">
                                Edit User
                              </TooltipContent>
                            </Tooltip>

                            {/* Reset Password */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResetPassword(user)}
                                  className="h-8 w-8 p-0 text-white/40 hover:text-amber-400 hover:bg-amber-500/10"
                                >
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-white/10 text-white border-white/20 text-xs">
                                Reset Password
                              </TooltipContent>
                            </Tooltip>

                            {/* Ban/Unban */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleBan(user)}
                                  className={cn(
                                    'h-8 w-8 p-0',
                                    user.status === 'suspended'
                                      ? 'text-red-400/60 hover:text-emerald-400 hover:bg-emerald-500/10'
                                      : 'text-white/40 hover:text-red-400 hover:bg-red-500/10',
                                  )}
                                >
                                  {user.status === 'suspended' ? (
                                    <UserCheck className="h-4 w-4" />
                                  ) : (
                                    <ShieldAlert className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-white/10 text-white border-white/20 text-xs">
                                {user.status === 'suspended' ? 'Unban User' : 'Ban User'}
                              </TooltipContent>
                            </Tooltip>

                            {/* More dropdown - hidden on desktop when we have enough space */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/5"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white min-w-[180px]"
                              >
                                <DropdownMenuLabel className="text-white/50 text-xs">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem onClick={() => handleView(user)} className="text-white/70 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(user)} className="text-white/70 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer">
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResetPassword(user)} className="text-amber-400/80 hover:text-amber-400 hover:bg-amber-500/10 focus:text-amber-400 focus:bg-amber-500/10 cursor-pointer">
                                  <KeyRound className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBan(user)} className={cn(
                                  user.status === 'suspended'
                                    ? 'text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-500/10 focus:text-emerald-400 focus:bg-emerald-500/10'
                                    : 'text-red-400/80 hover:text-red-400 hover:bg-red-500/10 focus:text-red-400 focus:bg-red-500/10',
                                  'cursor-pointer',
                                )}>
                                  {user.status === 'suspended' ? (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Activate User
                                    </>
                                  ) : (
                                    <>
                                      <ShieldAlert className="h-4 w-4 mr-2" />
                                      Ban User
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleLimits(user)} className="text-blue-400/80 hover:text-blue-400 hover:bg-blue-500/10 focus:text-blue-400 focus:bg-blue-500/10 cursor-pointer">
                                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                                  Set Limits
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem onClick={() => toggleStatusMutation.mutate(user)} className="text-white/70 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer">
                                  {user.status === 'active' ? (
                                    <>
                                      <Ban className="h-4 w-4 mr-2" />
                                      Suspend
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(user)} className="text-red-400 hover:text-red-400 hover:bg-red-500/10 focus:text-red-400 focus:bg-red-500/10 cursor-pointer">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-xs text-white/40">
              Page {page} of {totalPages} ({total} users)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 border-white/10 text-white/60 hover:bg-white/5"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 border-white/10 text-white/60 hover:bg-white/5"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ============ VIEW DIALOG ============ */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-lg max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-white">User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">Full Name</p>
                  <p className="text-sm text-white font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Email</p>
                  <p className="text-sm text-white/70">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Phone</p>
                  <p className="text-sm text-white/70">{selectedUser.phone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Business</p>
                  <p className="text-sm text-white/70">{selectedUser.businessName}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Business Phone</p>
                  <p className="text-sm text-white/70">{selectedUser.businessPhone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">GST Number</p>
                  <p className="text-sm text-white/70">{selectedUser.gstNumber ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Plan</p>
                  <PlanBadge plan={selectedUser.plan} />
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'inline-block h-2 w-2 rounded-full',
                      selectedUser.status === 'active' ? 'bg-emerald-400' : selectedUser.status === 'suspended' ? 'bg-red-400' : 'bg-amber-400',
                    )} />
                    <StatusBadge status={selectedUser.status} />
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-white/10">
                <p className="text-xs text-white/40 mb-1">Business Address</p>
                <p className="text-sm text-white/70">{selectedUser.businessAddress ?? '—'}</p>
              </div>

              {/* Last Activity */}
              {lastLog && (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-white/40 mb-1">Last Activity</p>
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-white/30" />
                    <p className="text-sm text-white/70">{lastLog.action}</p>
                    <span className="text-xs text-white/30">
                      {new Date(lastLog.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 text-xs text-white/30">
                <span>Created: {new Date(selectedUser.createdAt).toLocaleString('en-IN')}</span>
                <span>•</span>
                <span>Updated: {new Date(selectedUser.updatedAt).toLocaleString('en-IN')}</span>
              </div>

              {/* Account Controls Card */}
              <Card className="bg-[oklch(0.14_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-lg">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm text-white/70 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-white/40" />
                    Account Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewDialog(false)
                        setTimeout(() => handleResetPassword(selectedUser), 200)
                      }}
                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-xs h-8"
                    >
                      <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                      Reset Password
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewDialog(false)
                        setTimeout(() => handleLimits(selectedUser), 200)
                      }}
                      className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 text-xs h-8"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                      Set Limits
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewDialog(false)
                        setTimeout(() => handleBan(selectedUser), 200)
                      }}
                      className={cn(
                        'text-xs h-8',
                        selectedUser.status === 'suspended'
                          ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                          : 'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300',
                      )}
                    >
                      {selectedUser.status === 'suspended' ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                          Activate User
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                          Ban User
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ EDIT DIALOG ============ */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Business Name</Label>
                <Input
                  value={editForm.businessName}
                  onChange={(e) => setEditForm((f) => ({ ...f, businessName: e.target.value }))}
                  className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Plan</Label>
                <Select value={editForm.plan} onValueChange={(v) => setEditForm((f) => ({ ...f, plan: v }))}>
                  <SelectTrigger className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditDialog(false)} className="border-white/10 text-white/60 hover:bg-white/5">
                  Cancel
                </Button>
                <Button
                  onClick={handleEditSave}
                  disabled={updateMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ DELETE DIALOG ============ */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete User
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <p className="text-sm text-white/70">
                Are you sure you want to delete <span className="text-white font-medium">{selectedUser.name}</span>? This action
                cannot be undone. All associated data including subscriptions, tickets, and logs will be permanently removed.
              </p>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDeleteDialog(false)} className="border-white/10 text-white/60 hover:bg-white/5">
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ RESET PASSWORD DIALOG ============ */}
      <Dialog open={resetPwdDialog} onOpenChange={setResetPwdDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-400" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-white/40 text-sm">
              Set a new password for this user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[oklch(0.14_0.02_250)] border border-[oklch(0.28_0.03_250)]">
                <div className="h-9 w-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-sm font-bold">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{selectedUser.name}</p>
                  <p className="text-xs text-white/40">{selectedUser.email}</p>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password strength */}
                {newPassword.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-300', getPasswordStrength(newPassword).color, getPasswordStrength(newPassword).width)} />
                    </div>
                    <p className="text-xs text-white/30">{getPasswordStrength(newPassword).label}</p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Confirm Password</Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30"
                />
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400">Passwords do not match</p>
                )}
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setResetPwdDialog(false)} className="border-white/10 text-white/60 hover:bg-white/5">
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPasswordSave}
                  disabled={resetPasswordMutation.isPending || !newPassword || newPassword !== confirmPassword}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ BAN / UNBAN DIALOG ============ */}
      <Dialog open={banDialog} onOpenChange={setBanDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-md">
          {banAction === 'ban' ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-400" />
                  Ban User
                </DialogTitle>
                <DialogDescription className="text-white/40 text-sm">
                  This will immediately suspend the user&apos;s account.
                </DialogDescription>
              </DialogHeader>
              {selectedUser && (
                <div className="space-y-4">
                  {/* Warning banner */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-red-300 font-medium">
                        This will suspend {selectedUser.name}&apos;s account
                      </p>
                      <p className="text-xs text-red-300/60 mt-1">
                        The user will lose access to all features immediately. They will need to be unbanned to regain access.
                      </p>
                    </div>
                  </div>

                  {/* User info */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[oklch(0.14_0.02_250)] border border-[oklch(0.28_0.03_250)]">
                    <div className="h-9 w-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-sm font-bold">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{selectedUser.name}</p>
                      <p className="text-xs text-white/40">{selectedUser.email}</p>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm">
                      Reason <span className="text-red-400">*</span>
                    </Label>
                    <Textarea
                      placeholder="Provide a reason for banning this user..."
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      rows={3}
                      className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30 resize-none"
                    />
                  </div>

                  <DialogFooter className="gap-2 pt-2">
                    <Button variant="outline" onClick={() => setBanDialog(false)} className="border-white/10 text-white/60 hover:bg-white/5">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBanSave}
                      disabled={banMutation.isPending || !banReason.trim()}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {banMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Banning...
                        </>
                      ) : (
                        'Ban User'
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                  Activate User
                </DialogTitle>
              </DialogHeader>
              {selectedUser && (
                <div className="space-y-4">
                  <p className="text-sm text-white/70">
                    Are you sure you want to activate <span className="text-white font-medium">{selectedUser.name}</span>&apos;s account? They will regain full access to all features.
                  </p>

                  {/* User info */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[oklch(0.14_0.02_250)] border border-[oklch(0.28_0.03_250)]">
                    <div className="h-9 w-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-sm font-bold">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{selectedUser.name}</p>
                      <p className="text-xs text-white/40">{selectedUser.email}</p>
                    </div>
                  </div>

                  <DialogFooter className="gap-2 pt-2">
                    <Button variant="outline" onClick={() => setBanDialog(false)} className="border-white/10 text-white/60 hover:bg-white/5">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBanSave}
                      disabled={banMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {banMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Activating...
                        </>
                      ) : (
                        'Activate User'
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ USER LIMITS DIALOG ============ */}
      <Dialog open={limitsDialog} onOpenChange={(open) => {
        setLimitsDialog(open)
        if (!open) {
          setSelectedUser(null)
        }
      }}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-md max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-blue-400" />
              Set Usage Limits
            </DialogTitle>
            <DialogDescription className="text-white/40 text-sm">
              Configure usage limits for this tenant.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[oklch(0.14_0.02_250)] border border-[oklch(0.28_0.03_250)]">
                <div className="h-9 w-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-sm font-bold">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{selectedUser.name}</p>
                  <p className="text-xs text-white/40">{selectedUser.email} · <PlanBadge plan={selectedUser.plan} /></p>
                </div>
              </div>

              {limitsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full bg-white/5 rounded" />
                  <Skeleton className="h-10 w-full bg-white/5 rounded" />
                  <Skeleton className="h-10 w-full bg-white/5 rounded" />
                </div>
              ) : (
                <>
                  {/* Max Medicines */}
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm">Max Medicines</Label>
                    <Input
                      type="number"
                      value={limitsForm.maxMedicines ?? ''}
                      onChange={(e) => setLimitsForm((f) => ({
                        ...f,
                        maxMedicines: e.target.value === '' ? null : Number(e.target.value),
                      }))}
                      placeholder="Unlimited"
                      className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30"
                    />
                    <p className="text-xs text-white/30">
                      {selectedUser.plan === 'pro' ? 'Pro plan: unlimited by default' : 'Free plan: default 50'}
                      · Leave empty for unlimited
                    </p>
                  </div>

                  {/* Max Bills Per Day */}
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm">Max Bills Per Day</Label>
                    <Input
                      type="number"
                      value={limitsForm.maxBillsPerDay ?? ''}
                      onChange={(e) => setLimitsForm((f) => ({
                        ...f,
                        maxBillsPerDay: e.target.value === '' ? null : Number(e.target.value),
                      }))}
                      placeholder="Unlimited"
                      className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30"
                    />
                    <p className="text-xs text-white/30">Default: 100 · Leave empty for unlimited</p>
                  </div>

                  {/* Max Staff Users */}
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm">Max Staff Users</Label>
                    <Input
                      type="number"
                      value={limitsForm.maxStaffUsers ?? ''}
                      onChange={(e) => setLimitsForm((f) => ({
                        ...f,
                        maxStaffUsers: e.target.value === '' ? null : Number(e.target.value),
                      }))}
                      placeholder="Unlimited"
                      className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30"
                    />
                    <p className="text-xs text-white/30">Default: 1 · Leave empty for unlimited</p>
                  </div>

                  {/* Disabled Features */}
                  <div className="space-y-3">
                    <Label className="text-white/70 text-sm">Disabled Features</Label>
                    <div className="space-y-2.5">
                      {FEATURES_LIST.map((feature) => (
                        <div
                          key={feature.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg bg-[oklch(0.14_0.02_250)] border border-[oklch(0.28_0.03_250)] cursor-pointer hover:bg-[oklch(0.16_0.02_250)] transition-colors"
                          onClick={() => toggleFeature(feature.id)}
                        >
                          <Checkbox
                            checked={limitsForm.featuresDisabled?.includes(feature.id) ?? false}
                            onCheckedChange={() => toggleFeature(feature.id)}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-white/20"
                          />
                          <span className={cn(
                            'text-sm transition-colors',
                            limitsForm.featuresDisabled?.includes(feature.id) ? 'text-white/30 line-through' : 'text-white/70',
                          )}>
                            {feature.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setLimitsDialog(false)} className="border-white/10 text-white/60 hover:bg-white/5">
                  Cancel
                </Button>
                <Button
                  onClick={handleLimitsSave}
                  disabled={limitsMutation.isPending || limitsLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {limitsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Limits'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UsersSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-4 w-28 bg-white/5" />
          <Skeleton className="h-4 w-40 bg-white/5" />
          <Skeleton className="h-4 w-32 bg-white/5 hidden md:block" />
          <Skeleton className="h-5 w-12 rounded-full bg-white/5" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/5" />
          <div className="flex-1" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded bg-white/5" />
            <Skeleton className="h-8 w-8 rounded bg-white/5" />
            <Skeleton className="h-8 w-8 rounded bg-white/5" />
            <Skeleton className="h-8 w-8 rounded bg-white/5" />
            <Skeleton className="h-8 w-8 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  )
}
