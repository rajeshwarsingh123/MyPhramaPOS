'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  Send,
  Eye,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface SupportTicket {
  id: string
  tenantId: string
  tenant: { id: string; name: string; businessName: string; email: string }
  subject: string
  description: string
  status: string
  priority: string
  replies: string
  createdAt: string
  updatedAt: string
}

interface Reply {
  author: string
  message: string
  time: string
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { color: string; label: string }> = {
    low: { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: 'Low' },
    medium: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Medium' },
    high: { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'High' },
    urgent: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Urgent' },
  }
  const c = config[priority] ?? { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: priority }
  return (
    <Badge className={cn(c.color, 'hover:opacity-80')}>{c.label}</Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    open: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Open' },
    in_progress: { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'In Progress' },
    resolved: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'Resolved' },
    closed: { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: 'Closed' },
  }
  const c = config[status] ?? { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: status }
  return (
    <Badge className={cn(c.color, 'hover:opacity-80')}>{c.label}</Badge>
  )
}

export function AdminTickets() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [statusChange, setStatusChange] = useState<string>('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-tickets', statusFilter, priorityFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      return fetch(`/api/admin/tickets?${params}`).then((r) => r.json())
    },
    refetchInterval: 30000,
  })

  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const res = await fetch(`/api/admin/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) throw new Error('Reply failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Reply sent successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
      setReplyText('')
    },
    onError: () => toast.error('Failed to send reply'),
  })

  const statusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Status update failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Ticket status updated')
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
      setStatusChange('')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const tickets: SupportTicket[] = data?.tickets ?? []

  const handleView = (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    setDetailOpen(true)
    setReplyText('')
    setStatusChange('')
  }

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedTicket) return
    replyMutation.mutate({ ticketId: selectedTicket.id, message: replyText.trim() })
  }

  const handleStatusChange = () => {
    if (!statusChange || !selectedTicket) return
    statusMutation.mutate({ ticketId: selectedTicket.id, status: statusChange })
  }

  const openCount = tickets.filter((t) => t.status === 'open').length
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length
  const urgentCount = tickets.filter((t) => t.priority === 'urgent').length

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load tickets</p>
        <Button onClick={() => refetch()} className="bg-primary hover:bg-primary/80 text-white">
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
            <MessageSquare className="h-7 w-7 text-primary" />
            Support Tickets
          </h1>
          <p className="text-white/50 mt-1">{tickets.length} tickets • {openCount} open • {inProgressCount} in progress</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Total Tickets</p>
          <p className="text-2xl font-bold text-white">{tickets.length}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Open</p>
          <p className="text-2xl font-bold text-blue-400">{openCount}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-amber-400">{inProgressCount}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Urgent</p>
          <p className="text-2xl font-bold text-red-400">{urgentCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
            <Filter className="h-4 w-4 mr-2 text-white/40" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
            <Filter className="h-4 w-4 mr-2 text-white/40" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <TicketsSkeleton />
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <MessageSquare className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium">No tickets found</p>
              <p className="text-xs mt-1">Adjust filters or check back later</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-white/40 text-xs font-medium">ID</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium">Subject</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium hidden md:table-cell">Tenant</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium">Priority</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium">Status</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id} className="border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => handleView(ticket)}>
                      <TableCell className="text-white/40 text-xs font-mono">
                        {ticket.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-white font-medium text-sm max-w-[200px] truncate">
                        {ticket.subject}
                      </TableCell>
                      <TableCell className="text-white/60 text-sm hidden md:table-cell">
                        {ticket.tenant?.name ?? 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={ticket.priority} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="text-white/40 text-xs hidden lg:table-cell">
                        {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleView(ticket) }}
                          className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/5"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-white text-lg">{selectedTicket?.subject}</DialogTitle>
              <PriorityBadge priority={selectedTicket?.priority ?? 'medium'} />
              <StatusBadge status={selectedTicket?.status ?? 'open'} />
            </div>
            <div className="flex items-center gap-4 text-xs text-white/40 mt-1">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {selectedTicket?.tenant?.name ?? 'Unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {selectedTicket?.createdAt ? new Date(selectedTicket.createdAt).toLocaleString('en-IN') : ''}
              </span>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Description */}
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-sm text-white/40 mb-1">Description</p>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{selectedTicket?.description}</p>
            </div>

            {/* Replies */}
            {(() => {
              let replies: Reply[] = []
              try {
                replies = selectedTicket?.replies ? JSON.parse(selectedTicket.replies) : []
              } catch {
                replies = []
              }
              return replies.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-white/40">Replies ({replies.length})</p>
                  {replies.map((reply, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-3 rounded-lg border border-white/5',
                        reply.author === 'admin' ? 'bg-primary/5 border-primary/10' : 'bg-white/[0.02]'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('text-xs font-medium', reply.author === 'admin' ? 'text-primary' : 'text-white/60')}>
                          {reply.author === 'admin' ? '🛡 Admin' : reply.author}
                        </span>
                        <span className="text-[10px] text-white/30">{reply.time}</span>
                      </div>
                      <p className="text-sm text-white/70">{reply.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/30 italic">No replies yet</p>
              )
            })()}
          </div>

          {/* Reply + Status Change */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            {/* Status change */}
            <div className="flex items-center gap-2">
              <Select value={statusChange} onValueChange={setStatusChange}>
                <SelectTrigger className="w-40 h-8 text-xs bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
                  <SelectValue placeholder="Change status..." />
                </SelectTrigger>
                <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={handleStatusChange}
                disabled={!statusChange || statusMutation.isPending}
                className="h-8 text-xs border-white/10 text-white/60 hover:bg-white/5"
              >
                {statusMutation.isPending ? 'Updating...' : 'Update Status'}
              </Button>
            </div>

            {/* Reply */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                className="flex-1 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30 text-sm resize-none"
              />
              <Button
                onClick={handleSendReply}
                disabled={!replyText.trim() || replyMutation.isPending}
                className="bg-primary hover:bg-primary/80 text-white self-end"
              >
                <Send className="h-4 w-4 mr-1" />
                {replyMutation.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TicketsSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-4 w-16 font-mono bg-white/5" />
          <Skeleton className="h-4 w-48 bg-white/5" />
          <Skeleton className="h-4 w-28 bg-white/5 hidden md:block" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/5" />
          <Skeleton className="h-5 w-20 rounded-full bg-white/5" />
          <Skeleton className="h-4 w-32 bg-white/5 hidden lg:block" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded bg-white/5" />
        </div>
      ))}
    </div>
  )
}
