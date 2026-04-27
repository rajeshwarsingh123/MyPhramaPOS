'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore, type AdminPage } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  ShieldCheck,
  Ticket,
  Users,
  CreditCard,
  Activity,
  Settings,
  BarChart3,
  Megaphone,
  LayoutDashboard,
  X,
} from 'lucide-react'

const adminPages: { key: AdminPage; label: string; icon: React.ReactNode; group: string }[] = [
  { key: 'admin-dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, group: 'Main' },
  { key: 'admin-users', label: 'User Management', icon: <Users className="h-4 w-4" />, group: 'Main' },
  { key: 'admin-subscriptions', label: 'Subscriptions', icon: <CreditCard className="h-4 w-4" />, group: 'Billing' },
  { key: 'admin-payments', label: 'Payments', icon: <CreditCard className="h-4 w-4" />, group: 'Billing' },
  { key: 'admin-invoices', label: 'Invoices', icon: <CreditCard className="h-4 w-4" />, group: 'Billing' },
  { key: 'admin-tickets', label: 'Support Tickets', icon: <Ticket className="h-4 w-4" />, group: 'Support' },
  { key: 'admin-announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" />, group: 'Communication' },
  { key: 'admin-reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" />, group: 'Analytics' },
  { key: 'admin-logs', label: 'System Logs', icon: <Activity className="h-4 w-4" />, group: 'Analytics' },
  { key: 'admin-pharmacy-monitor', label: 'Pharmacy Monitor', icon: <Activity className="h-4 w-4" />, group: 'Analytics' },
  { key: 'admin-settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, group: 'System' },
]

export function AdminNavbar() {
  const {
    adminAuth,
    setAdminAuth,
    setAdminPage,
    adminSidebarCollapsed,
    setAdminSidebarMobileOpen,
  } = useAppStore()

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notificationCount, setNotificationCount] = useState(0)
  const [notifications, setNotifications] = useState<{ id: string; title: string; desc: string; time: string; type: string }[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch open ticket count for notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/admin/tickets?status=open&limit=5')
        if (res.ok) {
          const data = await res.json()
          const tickets = data.tickets || data || []
          setNotificationCount(tickets.length)
          setNotifications(
            tickets.slice(0, 5).map((t: { id: number; subject: string; priority: string; createdAt: string }) => ({
              id: String(t.id),
              title: t.subject,
              desc: `Priority: ${t.priority}`,
              time: new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
              type: 'ticket',
            }))
          )
        }
      } catch {
        // silently fail
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Keyboard shortcut Cmd+K / Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
        if (!searchOpen) {
          setTimeout(() => searchInputRef.current?.focus(), 100)
        }
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen])

  const handleLogout = () => {
    setAdminAuth({
      isAuthenticated: false,
      adminId: null,
      adminName: null,
      adminEmail: null,
      adminRole: null,
      loginTime: null,
    })
    setAdminPage(null)
  }

  const filteredPages = searchQuery.trim()
    ? adminPages.filter(
        (p) =>
          p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.group.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : adminPages

  const handleSearchSelect = useCallback(
    (pageKey: AdminPage) => {
      setAdminPage(pageKey)
      setSearchOpen(false)
      setSearchQuery('')
    },
    [setAdminPage]
  )

  const initials = adminAuth.adminName
    ? adminAuth.adminName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SA'

  return (
    <>
      <header
        className={cn(
          'fixed top-0 right-0 z-40 h-14 flex items-center gap-3 px-4 border-b',
          'bg-[oklch(0.12_0.015_250)]/80 backdrop-blur-xl border-[oklch(0.25_0.03_250)]',
          'transition-[margin-left] duration-200',
          adminSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64',
        )}
      >
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-white/60 hover:text-white hover:bg-white/5 h-9 w-9"
          onClick={() => setAdminSidebarMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search trigger */}
        <div className="hidden sm:flex items-center flex-1 max-w-md">
          <button
            onClick={() => {
              setSearchOpen(true)
              setTimeout(() => searchInputRef.current?.focus(), 100)
            }}
            className="relative w-full flex items-center gap-2 px-3 h-9 bg-white/[0.04] border border-white/10 text-sm text-white/25 rounded-lg hover:bg-white/[0.06] hover:border-white/15 transition-colors cursor-text"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Search pages...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-white/30 bg-white/[0.06] rounded border border-white/10">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1 sm:hidden" />

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-white/60 hover:text-white hover:bg-white/5 h-9 w-9"
              >
                <Bell className="h-[18px] w-[18px]" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/40" />
                    <span className="relative inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white p-0"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="text-sm font-semibold text-white">Notifications</span>
                {notificationCount > 0 && (
                  <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-0 text-[10px]">
                    {notificationCount} open
                  </Badge>
                )}
              </div>
              <ScrollArea className="max-h-72">
                {notifications.length > 0 ? (
                  <div className="p-1">
                    {notifications.map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        onClick={() => {
                          handleSearchSelect('admin-tickets')
                          setNotifOpen(false)
                        }}
                        className="flex flex-col items-start gap-1 p-3 rounded-lg text-white/70 focus:text-white focus:bg-white/5 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Ticket className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                          <span className="text-xs font-medium text-white truncate flex-1">
                            {n.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pl-5.5 text-[10px] text-white/40">
                          <span>{n.desc}</span>
                          <span>·</span>
                          <span>{n.time}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-white/30">
                    <Bell className="h-8 w-8 mb-2" />
                    <p className="text-xs">No open tickets</p>
                  </div>
                )}
              </ScrollArea>
              {notifications.length > 0 && (
                <div className="border-t border-white/10 p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    onClick={() => {
                      handleSearchSelect('admin-tickets')
                      setNotifOpen(false)
                    }}
                  >
                    View all tickets
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Separator */}
          <div className="h-6 w-px bg-white/10 mx-1" />

          {/* Admin profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2.5 px-2 h-9 hover:bg-white/5 rounded-lg"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center ring-2 ring-purple-500/20">
                  <span className="text-[10px] font-bold text-white">{initials}</span>
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-xs font-medium text-white leading-none">
                    {adminAuth.adminName || 'Super Admin'}
                  </span>
                  <span className="text-[10px] text-white/40 leading-none mt-0.5">
                    {adminAuth.adminEmail || 'admin@pharmpos.com'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-white">
                    {adminAuth.adminName || 'Super Admin'}
                  </p>
                  <p className="text-xs text-white/40">
                    {adminAuth.adminEmail || 'admin@pharmpos.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="text-white/70 focus:text-white focus:bg-white/5 cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white/70 focus:text-white focus:bg-white/5 cursor-pointer">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Role: {adminAuth.adminRole || 'super_admin'}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Search Command Palette */}
      {searchOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setSearchOpen(false)
              setSearchQuery('')
            }}
          />
          {/* Dialog */}
          <div className="relative mx-auto max-w-lg mt-[15vh] px-4">
            <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 border-b border-white/10">
                <Search className="h-4 w-4 text-white/40 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search admin pages..."
                  className="flex-1 h-12 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-white/30 hover:text-white/60 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-white/30 bg-white/[0.06] rounded border border-white/10">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <ScrollArea className="max-h-64">
                {filteredPages.length > 0 ? (
                  <div className="p-2">
                    {Object.entries(
                      filteredPages.reduce<Record<string, typeof filteredPages>>((acc, page) => {
                        if (!acc[page.group]) acc[page.group] = []
                        acc[page.group].push(page)
                        return acc
                      }, {})
                    ).map(([group, pages]) => (
                      <div key={group}>
                        <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                          {group}
                        </div>
                        {pages.map((page) => (
                          <button
                            key={page.key}
                            onClick={() => handleSearchSelect(page.key)}
                            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                          >
                            <span className="text-white/40">{page.icon}</span>
                            <span className="text-sm">{page.label}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-white/30">
                    <Search className="h-8 w-8 mb-2" />
                    <p className="text-xs">No pages found for &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                )}
              </ScrollArea>

              {/* Footer hint */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-white/10 text-[10px] text-white/25">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white/[0.06] rounded border border-white/10 text-[9px]">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white/[0.06] rounded border border-white/10 text-[9px]">↵</kbd>
                  Open
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
