'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Bell,
  UserPlus,
  CreditCard,
  MessageSquare,
  DollarSign,
  Server,
  Clock,
  CheckCheck,
  ExternalLink,
  BellOff,
  Loader2,
} from 'lucide-react'
import { type ReactNode } from 'react'

// ─── Types ──────────────────────────────────────────────────
interface Notification {
  id: string
  type: string
  title: string
  description: string
  time: string
  isRead: boolean
  actionUrl: string | null
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
  totalCount: number
}

// ─── Config ─────────────────────────────────────────────────
type IconConfig = {
  icon: ReactNode
  color: string
  bg: string
}

const TYPE_CONFIG: Record<string, IconConfig> = {
  new_signup: {
    icon: <UserPlus className="h-4 w-4" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
  },
  subscription: {
    icon: <CreditCard className="h-4 w-4" />,
    color: 'text-primary',
    bg: 'bg-primary/15',
  },
  ticket: {
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
  },
  payment: {
    icon: <DollarSign className="h-4 w-4" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
  },
  system: {
    icon: <Server className="h-4 w-4" />,
    color: 'text-red-400',
    bg: 'bg-red-500/15',
  },
  expiry: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
  },
}

function getIconConfig(type: string): IconConfig {
  return TYPE_CONFIG[type] ?? {
    icon: <Bell className="h-4 w-4" />,
    color: 'text-white/50',
    bg: 'bg-white/10',
  }
}

// ─── Component ──────────────────────────────────────────────
export function AdminNotificationPanel({
  onNavigate,
}: {
  onNavigate?: (page: string) => void
}) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['admin-notifications'],
    queryFn: () =>
      fetch('/api/admin/notifications').then((r) => {
        if (!r.ok) throw new Error('Failed to fetch')
        return r.json()
      }),
    refetchInterval: 60000,
  })

  const markReadMutation = useMutation({
    mutationFn: async (payload: { ids: string[] } | { markAll: true }) => {
      const res = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to mark as read')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
    },
  })

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  const handleMarkAllRead = () => {
    markReadMutation.mutate({ markAll: true })
  }

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate({ ids: [id] })
  }

  const handleViewAll = () => {
    onNavigate?.('admin-tickets')
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/60 hover:text-white hover:bg-white/5 h-9 w-9"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/40" />
              <span className="relative inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-red-500/20 text-red-400 border-0 text-[10px] px-1.5 py-0"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markReadMutation.isPending}
              className="h-7 px-2 text-[11px] text-primary hover:text-primary/80 hover:bg-primary/10 gap-1.5"
            >
              {markReadMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-white/30 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/30 px-4">
            <BellOff className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm font-medium text-white/40">All caught up!</p>
            <p className="text-xs text-white/25 mt-1 text-center">
              No new notifications right now
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <div className="py-1">
              {notifications.map((notif, index) => {
                const config = getIconConfig(notif.type)
                return (
                  <div key={notif.id}>
                    <button
                      onClick={() => {
                        if (!notif.isRead) handleMarkRead(notif.id)
                        if (notif.actionUrl) onNavigate?.(notif.actionUrl)
                      }}
                      className={cn(
                        'flex items-start gap-3 w-full px-4 py-3 text-left transition-colors cursor-pointer group',
                        'hover:bg-white/[0.04]',
                        notif.isRead
                          ? 'bg-transparent'
                          : 'bg-white/[0.02] border-l-2 border-l-primary/60',
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5',
                          config.bg,
                        )}
                      >
                        <span className={config.color}>{config.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'text-[13px] leading-tight truncate',
                              notif.isRead ? 'text-white/50 font-normal' : 'text-white/90 font-medium',
                            )}
                          >
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-white/30">{notif.time}</span>
                          {notif.actionUrl && (
                            <span className="flex items-center gap-0.5 text-[10px] text-primary/60 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="h-2.5 w-2.5" />
                              view
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {index < notifications.length - 1 && (
                      <Separator className="bg-white/[0.04] mx-4" />
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-white/10 px-2 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-primary hover:text-primary/80 hover:bg-primary/10 gap-1.5"
              onClick={handleViewAll}
            >
              <ExternalLink className="h-3 w-3" />
              View all activity
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
