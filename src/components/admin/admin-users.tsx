'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
} from 'lucide-react'
import { useState, useMemo } from 'react'
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
  const [editForm, setEditForm] = useState({ name: '', businessName: '', plan: 'free', status: 'active' })

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

  const handleEditSave = () => {
    updateMutation.mutate(editForm)
  }

  const users: Tenant[] = data?.tenants ?? []
  const total: number = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)

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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(user)}
                            className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/5"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/5"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate(user)}
                            className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/5"
                            title={user.status === 'active' ? 'Suspend' : 'Activate'}
                          >
                            {user.status === 'active' ? (
                              <Ban className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user)}
                            className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* View Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
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
                  <StatusBadge status={selectedUser.status} />
                </div>
              </div>
              <div className="pt-3 border-t border-white/10">
                <p className="text-xs text-white/40 mb-1">Business Address</p>
                <p className="text-sm text-white/70">{selectedUser.businessAddress ?? '—'}</p>
              </div>
              <div className="flex gap-2 text-xs text-white/30">
                <span>Created: {new Date(selectedUser.createdAt).toLocaleString('en-IN')}</span>
                <span>•</span>
                <span>Updated: {new Date(selectedUser.updatedAt).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
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

      {/* Delete Dialog */}
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
          </div>
        </div>
      ))}
    </div>
  )
}
