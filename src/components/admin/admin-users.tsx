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

function PlanBadge() {
  return (
    <Badge className="bg-primary/20 text-primary border-primary/30">
      Yearly
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
  const [activeTab, setActiveTab] = useState<'tenants' | 'admins'>('tenants')
  const [search, setSearch] = useState('')
  const [adminSearch, setAdminSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-tenants', search, planFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: String(limit),
      })
      if (planFilter !== 'all') params.set('plan', planFilter)
      const res = await fetch(`/api/admin/tenants?${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch tenants')
      }
      return res.json()
    },
    enabled: activeTab === 'tenants'
  })

  const { data: adminsData, isLoading: adminsLoading, refetch: refetchAdmins } = useQuery({
    queryKey: ['admin-list', adminSearch],
    queryFn: () => fetch(`/api/admin/administrators?search=${adminSearch}`).then((r) => r.json()),
    enabled: activeTab === 'admins'
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
        <p className="text-white/70">{(error as Error)?.message || 'Failed to load users'}</p>
        <div className="flex gap-3">
          {(error as Error)?.message === 'Unauthorized' ? (
            <Button 
              onClick={() => {
                const { setAdminAuth } = useAppStore.getState()
                setAdminAuth({ isAuthenticated: false, adminId: null, adminName: null, adminEmail: null, adminRole: null, loginTime: null })
              }} 
              className="bg-primary hover:bg-primary/80 text-white"
            >
              Login Again
            </Button>
          ) : (
            <Button onClick={() => refetch()} className="bg-primary hover:bg-primary/80 text-white">
              Try Again
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" />
            User Management
          </h1>
          <p className="text-white/50 mt-1">{total} total users</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[oklch(0.14_0.02_250)] p-1 rounded-lg border border-[oklch(0.28_0.03_250)]">
            <button
              onClick={() => setActiveTab('tenants')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
                activeTab === 'tenants'
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              Tenants
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
                activeTab === 'admins'
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              Administrators
            </button>
          </div>
          <Button onClick={() => activeTab === 'tenants' ? refetch() : refetchAdmins()} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {activeTab === 'tenants' ? (
        <>
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
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-white/40">Name</TableHead>
                        <TableHead className="text-white/40">Email</TableHead>
                        <TableHead className="text-white/40 hidden md:table-cell">Business</TableHead>
                        <TableHead className="text-white/40">Plan</TableHead>
                        <TableHead className="text-white/40">Status</TableHead>
                        <TableHead className="text-white/40 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="text-white font-medium">{user.name}</TableCell>
                          <TableCell className="text-white/60">{user.email}</TableCell>
                          <TableCell className="text-white/60 hidden md:table-cell">{user.businessName}</TableCell>
                          <TableCell><PlanBadge /></TableCell>
                          <TableCell><StatusBadge status={user.status} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleView(user)} className="h-8 w-8 p-0 text-white/40 hover:text-white"><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} className="h-8 w-8 p-0 text-white/40 hover:text-white"><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleResetPassword(user)} className="h-8 w-8 p-0 text-white/40 hover:text-amber-400"><KeyRound className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleBan(user)} className="h-8 w-8 p-0 text-white/40 hover:text-red-400"><ShieldAlert className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                <p className="text-xs text-white/40">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </Card>
        </>
      ) : (
        <AdminList 
          admins={adminsData?.admins || []} 
          isLoading={adminsLoading} 
          onRefetch={refetchAdmins} 
          search={adminSearch}
          onSearchChange={setAdminSearch}
        />
      )}

      {/* ============ DIALOGS ============ */}
      {/* View Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-lg">
          <DialogHeader><DialogTitle>User Details</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-white/40">Name</p><p className="text-sm">{selectedUser.name}</p></div>
                <div><p className="text-xs text-white/40">Email</p><p className="text-sm">{selectedUser.email}</p></div>
                <div><p className="text-xs text-white/40">Business</p><p className="text-sm">{selectedUser.businessName}</p></div>
                <div><p className="text-xs text-white/40">Status</p><StatusBadge status={selectedUser.status} /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => handleResetPassword(selectedUser)} className="text-amber-400">Reset Password</Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(selectedUser)} className="text-red-400">Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-md">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Name</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="bg-transparent" /></div>
            <div className="space-y-2"><Label>Business Name</Label><Input value={editForm.businessName} onChange={e => setEditForm({...editForm, businessName: e.target.value})} className="bg-transparent" /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                <SelectTrigger className="bg-transparent"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
                  <SelectItem value="active" className="focus:bg-white/10 focus:text-white text-white">Active</SelectItem>
                  <SelectItem value="suspended" className="focus:bg-white/10 focus:text-white text-white">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleEditSave}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwdDialog} onOpenChange={setResetPwdDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-md">
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-transparent" />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="bg-transparent" />
            </div>
          </div>
          <DialogFooter><Button onClick={handleResetPasswordSave} disabled={!newPassword || newPassword !== confirmPassword}>Reset Password</Button></DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Delete Dialog */}
       <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-sm">
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <p className="text-sm text-white/70">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button onClick={() => deleteMutation.mutate()} className="bg-red-600">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Limits Dialog */}
      <Dialog open={limitsDialog} onOpenChange={setLimitsDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-md">
          <DialogHeader><DialogTitle>Set Usage Limits</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Max Medicines</Label><Input type="number" value={limitsForm.maxMedicines ?? ''} onChange={e => setLimitsForm({...limitsForm, maxMedicines: Number(e.target.value)})} className="bg-transparent" /></div>
            <div className="space-y-2"><Label>Max Bills Per Day</Label><Input type="number" value={limitsForm.maxBillsPerDay ?? ''} onChange={e => setLimitsForm({...limitsForm, maxBillsPerDay: Number(e.target.value)})} className="bg-transparent" /></div>
          </div>
          <DialogFooter><Button onClick={handleLimitsSave}>Save Limits</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialog} onOpenChange={setBanDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-md">
          <DialogHeader><DialogTitle>{banAction === 'ban' ? 'Ban User' : 'Unban User'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            {banAction === 'ban' && (
              <div className="space-y-2"><Label>Reason</Label><Textarea value={banReason} onChange={e => setBanReason(e.target.value)} className="bg-transparent" /></div>
            )}
            <p className="text-sm text-white/70">Are you sure you want to {banAction} this user?</p>
          </div>
          <DialogFooter><Button onClick={handleBanSave} className={banAction === 'ban' ? 'bg-red-600' : 'bg-emerald-600'}>{banAction === 'ban' ? 'Ban' : 'Unban'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AdminList({ 
  admins, 
  isLoading, 
  onRefetch,
  search,
  onSearchChange
}: { 
  admins: any[], 
  isLoading: boolean, 
  onRefetch: () => void,
  search: string,
  onSearchChange: (v: string) => void
}) {
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null)
  const [editDialog, setEditDialog] = useState(false)
  const [addDialog, setAddDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'admin', password: '', isActive: true })

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/admin/administrators/${selectedAdmin?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Update failed')
      return res.json()
    },
    onSuccess: () => { toast.success('Admin updated'); onRefetch(); setEditDialog(false); },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/admin/administrators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Creation failed')
      return res.json()
    },
    onSuccess: () => { toast.success('Admin created'); onRefetch(); setAddDialog(false); },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/administrators/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      return res.json()
    },
    onSuccess: () => { toast.success('Admin deleted'); onRefetch(); setDeleteDialog(false); },
  })

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Input placeholder="Search admins..." value={search} onChange={e => onSearchChange(e.target.value)} className="bg-[oklch(0.14_0.02_250)] border-white/10" />
        <Button onClick={() => setAddDialog(true)} className="bg-primary text-white">Add Admin</Button>
      </div>
      <Card className="bg-[oklch(0.18_0.02_250)] border-white/10">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {admins.map(admin => (
              <TableRow key={admin.id}>
                <TableCell>{admin.name}</TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell><Badge variant="outline">{admin.role}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedAdmin(admin); setForm({...admin, password: ''}); setEditDialog(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedAdmin(admin); setDeleteDialog(true); }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Dialogs */}
      <Dialog open={addDialog || editDialog} onOpenChange={v => { if(!v) { setAddDialog(false); setEditDialog(false); } }}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-white/10 text-white">
          <DialogHeader><DialogTitle>{addDialog ? 'Add' : 'Edit'} Admin</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-transparent" />
            <Input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-transparent" />
            <Input type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="bg-transparent" />
          </div>
          <DialogFooter><Button onClick={() => addDialog ? createMutation.mutate(form) : updateMutation.mutate(form)}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-white/10 text-white">
          <DialogHeader><DialogTitle>Delete Admin</DialogTitle></DialogHeader>
          <p>Are you sure?</p>
          <DialogFooter><Button onClick={() => deleteMutation.mutate(selectedAdmin.id)} className="bg-red-600">Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UsersSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full bg-white/5" />
      ))}
    </div>
  )
}
