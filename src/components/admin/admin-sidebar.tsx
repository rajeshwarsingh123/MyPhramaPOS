'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Wallet,
  Receipt,
  BarChart3,
  ScrollText,
  MessageSquare,
  Megaphone,
  Settings,
  Building2,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const adminNavItems: { id: string; label: string; icon: LucideIcon; badgeKey?: string }[] = [
  { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'admin-users', label: 'Users', icon: Users },
  { id: 'admin-subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'admin-payments', label: 'Payments', icon: Wallet },
  { id: 'admin-invoices', label: 'Invoices', icon: Receipt },
  { id: 'admin-reports', label: 'Reports', icon: BarChart3 },
  { id: 'admin-logs', label: 'System Logs', icon: ScrollText },
  { id: 'admin-tickets', label: 'Support', icon: MessageSquare, badgeKey: 'tickets' },
  { id: 'admin-announcements', label: 'Announcements', icon: Megaphone },
  { id: 'admin-settings', label: 'Settings', icon: Settings },
  { id: 'admin-pharmacy-monitor', label: 'Pharmacy Data', icon: Building2 },
]

function NavItem({
  item,
  isActive,
  collapsed,
  onClick,
  badgeCount,
}: {
  item: (typeof adminNavItems)[number]
  isActive: boolean
  collapsed: boolean
  onClick: () => void
  badgeCount?: number
}) {
  const Icon = item.icon
  const showBadge = badgeCount !== undefined && badgeCount > 0

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 mx-auto relative',
                isActive
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/90',
              )}
            >
              <Icon className={cn('h-[18px] w-[18px]', isActive && 'text-purple-400')} />
              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
                  <span className="relative inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white text-xs"
          >
            {item.label}
            {showBadge && <span className="ml-1 text-red-400">({badgeCount})</span>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full text-left',
        isActive
          ? 'bg-purple-500/20 text-purple-300 shadow-sm'
          : 'text-white/60 hover:bg-white/5 hover:text-white/90',
      )}
    >
      <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-purple-400')} />
      <span>{item.label}</span>
      {showBadge && (
        <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px] bg-red-500/20 text-red-400">
          {badgeCount > 9 ? '9+' : badgeCount}
        </Badge>
      )}
    </button>
  )
}

export function AdminSidebar() {
  const {
    adminPage,
    setAdminPage,
    adminAuth,
    adminSidebarCollapsed,
    setAdminSidebarCollapsed,
    adminSidebarMobileOpen,
    setAdminSidebarMobileOpen,
  } = useAppStore()

  const [ticketBadge, setTicketBadge] = useState<number | undefined>(undefined)

  // Fetch open ticket count for badge
  useEffect(() => {
    const fetchBadge = async () => {
      try {
        const res = await fetch('/api/admin/tickets?status=open&limit=1')
        if (res.ok) {
          const data = await res.json()
          const tickets = data.tickets || data || []
          setTicketBadge(tickets.length > 0 ? tickets.length : undefined)
        }
      } catch {
        // silently fail
      }
    }
    fetchBadge()
    const interval = setInterval(fetchBadge, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleNav = (page: string) => {
    setAdminPage(page as typeof adminPage)
    // Close mobile sidebar on navigation
    setAdminSidebarMobileOpen(false)
  }

  const handleExit = () => {
    setAdminPage(null)
    setAdminSidebarMobileOpen(false)
  }

  const initials = adminAuth.adminName
    ? adminAuth.adminName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SA'

  const collapsed = adminSidebarCollapsed

  return (
    <>
      {/* Mobile backdrop */}
      {adminSidebarMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setAdminSidebarMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full flex flex-col bg-[oklch(0.15_0.02_250)] border-r border-[oklch(0.25_0.03_250)]',
          'transition-all duration-200 ease-in-out',
          // Width
          collapsed ? 'w-16' : 'w-64',
          // Mobile: hidden by default, shown as overlay when open
          'lg:translate-x-0',
          adminSidebarMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center border-b border-[oklch(0.25_0.03_250)] shrink-0 h-16',
          collapsed ? 'justify-center px-0' : 'gap-2.5 px-5',
        )}>
          <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/20 shrink-0">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                PharmPOS Admin
              </span>
              <span className="text-[10px] text-white/40 leading-none whitespace-nowrap">
                Super Admin Panel
              </span>
            </div>
          )}
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden text-white/40 hover:text-white hover:bg-white/5 h-8 w-8"
            onClick={() => setAdminSidebarMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 min-h-0">
          <nav className="flex flex-col gap-1 p-3">
            {adminNavItems.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                isActive={adminPage === item.id}
                collapsed={collapsed}
                onClick={() => handleNav(item.id)}
                badgeCount={item.badgeKey === 'tickets' ? ticketBadge : undefined}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-[oklch(0.25_0.03_250)] p-3 shrink-0 space-y-2">
          {/* Collapse toggle (desktop only) */}
          <Button
            variant="ghost"
            onClick={() => setAdminSidebarCollapsed(!collapsed)}
            className={cn(
              'w-full hidden lg:flex text-white/40 hover:text-white hover:bg-white/5 h-9',
              collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3',
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </Button>

          {/* Exit button */}
          {collapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleExit}
                    className="w-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 h-9 mx-auto"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white text-xs"
                >
                  Exit Admin Panel
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="ghost"
              onClick={handleExit}
              className="w-full justify-start gap-3 px-3 text-sm text-white/60 hover:text-white hover:bg-white/5 h-9"
            >
              <LogOut className="h-4 w-4" />
              Exit Admin Panel
            </Button>
          )}

          {/* User info */}
          {collapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/20 mx-auto mt-1">
                    <span className="text-xs font-bold text-purple-400">{initials}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white text-xs"
                >
                  {adminAuth.adminName || 'Super Admin'}
                  <br />
                  <span className="text-white/40">{adminAuth.adminEmail || 'admin@pharmpos.com'}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/20 shrink-0">
                <span className="text-xs font-bold text-purple-400">{initials}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-white truncate">
                  {adminAuth.adminName || 'Super Admin'}
                </span>
                <span className="text-[10px] text-white/40 truncate">
                  {adminAuth.adminEmail || 'admin@pharmpos.com'}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
