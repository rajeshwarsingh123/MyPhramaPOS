'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
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
  Megaphone,
  Plus,
  RefreshCw,
  AlertTriangle,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  Clock,
  Info,
  AlertCircle,
  Wrench,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface Announcement {
  id: string
  title: string
  message: string
  type: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    info: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Info', icon: <Info className="h-3 w-3" /> },
    warning: { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'Warning', icon: <AlertCircle className="h-3 w-3" /> },
    maintenance: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Maintenance', icon: <Wrench className="h-3 w-3" /> },
    promotion: { color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', label: 'Promotion', icon: <Sparkles className="h-3 w-3" /> },
  }
  const c = config[type] ?? { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: type, icon: null }
  return (
    <Badge className={cn(c.color, 'hover:opacity-80 flex items-center gap-1')}>
      {c.icon}
      {c.label}
    </Badge>
  )
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode }> = {
    info: { color: 'text-blue-400', icon: <Info className={cn('h-5 w-5', className)} /> },
    warning: { color: 'text-amber-400', icon: <AlertCircle className={cn('h-5 w-5', className)} /> },
    maintenance: { color: 'text-red-400', icon: <Wrench className={cn('h-5 w-5', className)} /> },
    promotion: { color: 'text-purple-400', icon: <Sparkles className={cn('h-5 w-5', className)} /> },
  }
  const c = config[type] ?? { color: 'text-gray-400', icon: <Info className={cn('h-5 w-5', className)} /> }
  return <span className={c.color}>{c.icon}</span>
}

export function AdminAnnouncements() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [createForm, setCreateForm] = useState({ title: '', message: '', type: 'info' })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => fetch('/api/admin/announcements').then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; message: string; type: string }) => {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Announcement created successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      setCreateOpen(false)
      setCreateForm({ title: '', message: '', type: 'info' })
    },
    onError: () => toast.error('Failed to create announcement'),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error('Toggle failed')
      return res.json()
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? 'Announcement activated' : 'Announcement deactivated')
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
    },
    onError: () => toast.error('Failed to toggle announcement'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Announcement deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      setDeleteOpen(false)
      setSelectedAnnouncement(null)
    },
    onError: () => toast.error('Failed to delete announcement'),
  })

  const announcements: Announcement[] = data?.announcements ?? []
  const activeCount = announcements.filter((a) => a.isActive).length

  const handleCreate = () => {
    if (!createForm.title.trim() || !createForm.message.trim()) {
      toast.error('Title and message are required')
      return
    }
    createMutation.mutate(createForm)
  }

  const handleDelete = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setDeleteOpen(true)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load announcements</p>
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
            <Megaphone className="h-7 w-7 text-purple-400" />
            Announcements
          </h1>
          <p className="text-white/50 mt-1">{announcements.length} total • {activeCount} active</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48 bg-white/5" />
                  <Skeleton className="h-4 w-64 bg-white/5" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full bg-white/5" />
              </div>
              <Skeleton className="h-3 w-full bg-white/5" />
              <Skeleton className="h-3 w-3/4 bg-white/5 mt-2" />
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-white/30">
          <Megaphone className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">No announcements yet</p>
          <p className="text-xs mt-1">Create one to notify all tenants</p>
          <Button
            onClick={() => setCreateOpen(true)}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Announcement
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className={cn(
                'bg-[oklch(0.18_0.02_250)] border rounded-xl transition-colors hover:bg-white/[0.03]',
                announcement.isActive
                  ? 'border-[oklch(0.28_0.03_250)]'
                  : 'border-white/5 opacity-60'
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <TypeIcon type={announcement.type} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-medium text-white truncate">{announcement.title}</h3>
                        <TypeBadge type={announcement.type} />
                        {!announcement.isActive && (
                          <Badge className="bg-white/5 text-white/30 border-white/10 text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-white/60 line-clamp-2">{announcement.message}</p>
                      <div className="flex items-center gap-3 mt-3 text-[11px] text-white/30">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(announcement.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span>
                          Last updated:{' '}
                          {new Date(announcement.updatedAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMutation.mutate({ id: announcement.id, isActive: !announcement.isActive })}
                      disabled={toggleMutation.isPending}
                      className={cn(
                        'h-8 text-xs',
                        announcement.isActive
                          ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                          : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                      )}
                      title={announcement.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {announcement.isActive ? (
                        <ToggleRight className="h-5 w-5" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(announcement)}
                      className="h-8 w-8 p-0 text-white/30 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Title</Label>
              <Input
                placeholder="Announcement title..."
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Type</Label>
              <Select value={createForm.type} onValueChange={(v) => setCreateForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Message</Label>
              <Textarea
                placeholder="Write your announcement message..."
                value={createForm.message}
                onChange={(e) => setCreateForm((f) => ({ ...f, message: e.target.value }))}
                rows={4}
                className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30 resize-none"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-white/10 text-white/60 hover:bg-white/5">
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !createForm.title.trim() || !createForm.message.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Announcement'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete Announcement
            </DialogTitle>
          </DialogHeader>
          {selectedAnnouncement && (
            <div className="space-y-4">
              <p className="text-sm text-white/70">
                Are you sure you want to delete <span className="text-white font-medium">&quot;{selectedAnnouncement.title}&quot;</span>?
                This action cannot be undone.
              </p>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-white/10 text-white/60 hover:bg-white/5">
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteMutation.mutate(selectedAnnouncement.id)}
                  disabled={deleteMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
