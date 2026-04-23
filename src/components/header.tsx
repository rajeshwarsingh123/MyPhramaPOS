'use client'

import { useAppStore } from '@/lib/store'
import { useIsMobile } from '@/hooks/use-mobile'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Menu, 
  Search, 
  Bell, 
  Moon, 
  Sun,
  ArrowRight,
  Keyboard,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Package,
  XCircle,
  TrendingDown,
  Check,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useEffect, useState, useMemo, useRef, useCallback, useSyncExternalStore } from 'react'

interface Notification {
  id: string
  type: 'expired' | 'expiring_soon' | 'low_stock'
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  timestamp: string
}

interface MedicineResult {
  id: string
  name: string
  composition: string | null
  sellingPrice: number
  totalStock: number
  batches: { mrp: number }[]
}

interface PageResult {
  key: string
  label: string
  icon: string
}

function useTimeGreeting() {
  // Must be called only after mount to avoid hydration mismatch
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  if (!mounted) return ''
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

const shortcuts = [
  { key: 'F2', label: 'New Bill', desc: 'Clear cart and start fresh' },
  { key: 'F4', label: 'Focus Search', desc: 'Jump to medicine search' },
  { key: 'F8', label: 'Complete Sale', desc: 'Finalize current bill' },
  { key: '?', label: 'Show Shortcuts', desc: 'This help panel' },
  { key: 'Esc', label: 'Close / Cancel', desc: 'Close dialog or cancel' },
]

const navPages = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { key: 'billing', label: 'Billing', icon: 'Receipt' },
  { key: 'medicines', label: 'Medicines', icon: 'Pill' },
  { key: 'stock', label: 'Stock Management', icon: 'Package' },
  { key: 'purchases', label: 'Purchase Entry', icon: 'ShoppingBag' },
  { key: 'reports', label: 'Reports', icon: 'BarChart3' },
  { key: 'customers', label: 'Customers', icon: 'Users' },
  { key: 'settings', label: 'Settings', icon: 'Settings' },
]

// Notification severity styles
const severityConfig = {
  critical: {
    icon: XCircle,
    dotColor: 'bg-red-500',
    badgeClass: 'border-red-300 text-red-600 dark:border-red-800 dark:text-red-400',
    bgClass: 'bg-red-50/80 dark:bg-red-950/30',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    dotColor: 'bg-amber-500',
    badgeClass: 'border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400',
    bgClass: 'bg-amber-50/80 dark:bg-amber-950/30',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: TrendingDown,
    dotColor: 'bg-orange-500',
    badgeClass: 'border-orange-300 text-orange-600 dark:border-orange-800 dark:text-orange-400',
    bgClass: 'bg-orange-50/80 dark:bg-orange-950/30',
    iconColor: 'text-orange-500',
  },
}

function formatNotificationTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return format(date, 'dd MMM')
  } catch {
    return ''
  }
}

export function Header() {
  const { toggleSidebar, setCurrentPage, setPendingSearchQuery } = useAppStore()
  const isMobile = useIsMobile()
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  // Fetch notifications with TanStack Query - auto-refresh every 30s
  const { data: notifData } = useQuery<{
    notifications: Notification[]
    total: number
    criticalCount: number
  }>({
    queryKey: ['header-notifications'],
    queryFn: () => fetch('/api/notifications').then((r) => r.json()),
    refetchInterval: 30000,
  })

  // Client-side read state
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const unreadNotifications = useMemo(() => {
    if (!notifData?.notifications) return []
    return notifData.notifications.filter((n) => !readIds.has(n.id))
  }, [notifData, readIds])

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => new Set(prev).add(id))
  }, [])

  const markAllAsRead = useCallback(() => {
    if (!notifData?.notifications) return
    setReadIds(new Set(notifData.notifications.map((n) => n.id)))
  }, [notifData])

  const greeting = useTimeGreeting()
  const [currentTime, setCurrentTime] = useState('')
  const currentDate = useMemo(() => mounted ? format(new Date(), 'dd MMM yyyy') : '', [mounted])
  useEffect(() => {
    if (!mounted) return
    setCurrentTime(format(new Date(), 'hh:mm a'))
    const timer = setInterval(() => {
      setCurrentTime(format(new Date(), 'hh:mm a'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Quick search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MedicineResult[]>([])
  const [matchedPages, setMatchedPages] = useState<PageResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Quick stats for notification badge
  const [quickStats, setQuickStats] = useState<{ todaySales: number; lowStockCount: number; expiredCount: number } | null>(null)

  useEffect(() => {
    fetch('/api/quick-stats')
      .then(r => r.json())
      .then(setQuickStats)
      .catch(() => {})
    // Refresh every 60s
    const timer = setInterval(() => {
      fetch('/api/quick-stats')
        .then(r => r.json())
        .then(setQuickStats)
        .catch(() => {})
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setMatchedPages([])
      setSearchOpen(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const [medRes, pages] = await Promise.all([
        fetch(`/api/medicines?search=${encodeURIComponent(query)}&limit=3`).then((r) => r.json()),
        Promise.resolve(
          navPages.filter((p) =>
            p.label.toLowerCase().includes(query.toLowerCase())
          )
        ),
      ])
      setSearchResults(medRes.medicines || [])
      setMatchedPages(pages)
      setSearchOpen(true)
    } catch {
      setSearchResults([])
      setMatchedPages([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setSearchResults([])
      setMatchedPages([])
      setSearchOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      performSearch(value)
    }, 300)
  }, [performSearch])

  const handleSearchFocus = useCallback(() => {
    if (searchQuery.trim() && (searchResults.length > 0 || matchedPages.length > 0)) {
      setSearchOpen(true)
    }
  }, [searchQuery, searchResults, matchedPages])

  const navigateToBilling = useCallback((query?: string) => {
    setSearchOpen(false)
    if (query) {
      setPendingSearchQuery(query)
    }
    setSearchQuery('')
    setSearchResults([])
    setMatchedPages([])
    setCurrentPage('billing')
  }, [setCurrentPage, setPendingSearchQuery])

  const navigateToPage = useCallback((pageKey: string) => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    setMatchedPages([])
    setCurrentPage(pageKey as 'dashboard' | 'billing' | 'medicines' | 'stock' | 'purchases' | 'reports' | 'customers' | 'settings')
  }, [setCurrentPage])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      navigateToBilling(searchQuery)
    }
    if (e.key === 'Escape') {
      setSearchOpen(false)
      searchInputRef.current?.blur()
    }
  }, [navigateToBilling, searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    billing: 'Billing',
    medicines: 'Medicines',
    stock: 'Stock Management',
    purchases: 'Purchase Entry',
    suppliers: 'Suppliers',
    reports: 'Reports',
    customers: 'Customers',
    'sales-returns': 'Sales Returns',
    'invoice-history': 'Invoice History',
    settings: 'Settings',
  }

  // Keyboard shortcuts dialog
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        setShowShortcuts((v) => !v)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const { currentPage } = useAppStore()

  // Severity counts
  const criticalCount = notifData?.criticalCount ?? 0
  const totalNotifCount = notifData?.notifications?.length ?? 0
  const unreadCount = unreadNotifications.length

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 glass-header header-gradient-border px-4 lg:px-6 shadow-sm shadow-black/[0.03]">
      {isMobile && (
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-foreground">{pageTitles[currentPage] || 'PharmPOS'}</h1>
        {mounted && greeting && (
        <p className="text-[11px] text-muted-foreground/70 -mt-0.5 hidden sm:block">
          {greeting} · <span className="font-medium text-muted-foreground/80">{currentDate}</span>
          {currentTime && <span className="ml-2 font-mono text-muted-foreground/60 tabular-nums">{currentTime}</span>}
        </p>
        )}
      </div>

      <div className="hidden md:flex items-center gap-2 w-72">
        <div ref={searchRef} className="relative w-full rounded-lg search-glow transition-shadow duration-200">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            placeholder="Search medicines, pages..."
            className="pl-9 h-9 text-sm bg-muted/50 border-transparent focus-visible:border-ring/30"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={handleSearchFocus}
            onKeyDown={handleSearchKeyDown}
          />
          {searchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border bg-popover shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
              {isSearching ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <span className="animate-pulse">Searching...</span>
                </div>
              ) : searchResults.length > 0 || matchedPages.length > 0 ? (
                <div className="max-h-[60vh] overflow-y-auto">
                  {/* Medicines Section */}
                  {searchResults.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b">
                        <Package className="h-3 w-3 text-teal-600" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Medicines</span>
                      </div>
                      {searchResults.map((med) => (
                        <button
                          key={med.id}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
                          onClick={() => navigateToBilling(med.name)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{med.name}</p>
                            {med.composition && (
                              <p className="text-xs text-muted-foreground truncate">{med.composition}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">
                              ₹{(med.batches.length > 0 ? med.batches[0].mrp : med.sellingPrice).toFixed(2)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {med.totalStock} in stock
                            </p>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Navigate Section */}
                  {matchedPages.length > 0 && (
                    <div className={searchResults.length > 0 ? 'border-t' : ''}>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b">
                        <Search className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Navigate</span>
                      </div>
                      {matchedPages.map((page) => (
                        <button
                          key={page.key}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                          onClick={() => navigateToPage(page.key)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{page.label}</p>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Go to Billing link */}
                  <div className="border-t">
                    <button
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-primary hover:bg-accent/50 transition-colors"
                      onClick={() => navigateToBilling(searchQuery)}
                    >
                      <ArrowRight className="h-3 w-3" />
                      Go to Billing for more results
                    </button>
                  </div>
                </div>
              ) : searchQuery.trim() ? (
                <div className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground">
                  <span>No results found</span>
                  <button
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={() => navigateToBilling(searchQuery)}
                  >
                    Search in Billing <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Notification Center Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 hover:bg-accent/50">
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-destructive animate-pulse-ring" />
                  <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm shadow-destructive/30">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {totalNotifCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5">{totalNotifCount}</Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <ScrollArea className="max-h-80">
              <div className="flex flex-col">
                {notifData?.notifications && notifData.notifications.length > 0 ? (
                  notifData.notifications.map((notif) => {
                    const isRead = readIds.has(notif.id)
                    const config = severityConfig[notif.severity]
                    const SevIcon = config.icon
                    return (
                      <div
                        key={notif.id}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0',
                          isRead && 'opacity-60'
                        )}
                      >
                        {/* Severity icon */}
                        <div className={cn(
                          'flex items-center justify-center rounded-lg h-8 w-8 shrink-0 mt-0.5',
                          config.bgClass
                        )}>
                          <SevIcon className={cn('h-4 w-4', config.iconColor)} />
                        </div>

                        {/* Content */}
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium truncate">{notif.title}</span>
                            {!isRead && (
                              <span className={cn('h-2 w-2 rounded-full shrink-0 mt-1.5', config.dotColor)} />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground leading-snug line-clamp-2">{notif.description}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={cn('text-[9px] px-1.5 h-4', config.badgeClass)}
                            >
                              {notif.type === 'expired'
                                ? 'Expired'
                                : notif.type === 'expiring_soon'
                                  ? 'Expiring'
                                  : 'Low Stock'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatNotificationTime(notif.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Mark read button */}
                        {!isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notif.id)
                            }}
                            className="shrink-0 text-[10px] text-primary hover:underline opacity-0 group-hover:opacity-100 mt-1"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center gap-2 py-10">
                    <ShieldCheck className="h-10 w-10 text-emerald-500" />
                    <p className="text-sm font-medium text-muted-foreground">All clear!</p>
                    <p className="text-xs text-muted-foreground">No new notifications</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            {totalNotifCount > 0 && (
              <div className="border-t px-4 py-2">
                <button
                  onClick={() => navigateToPage('stock')}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:underline py-1"
                >
                  View All in Stock Management
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {mounted && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-accent/50"
              onClick={() => setShowShortcuts(true)}
              title="Keyboard Shortcuts"
            >
              <Keyboard className="h-[18px] w-[18px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-accent/50 transition-transform duration-200"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <span className="block [transition:transform_0.4s_ease-in-out] dark:[transform:rotate(180deg)]">
                {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </span>
            </Button>
          </>
        )}
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-primary" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>Quick shortcuts for faster billing</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 pt-2">
            {shortcuts.map((s) => (
              <div key={s.key} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <kbd className="min-w-[48px] text-center px-2 py-1 rounded-md border bg-muted font-mono text-xs font-semibold shadow-sm">
                    {s.key}
                  </kbd>
                  <div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">Press <kbd className="px-1 py-0.5 rounded border bg-background font-mono text-[10px]">?</kbd> anytime to show this panel</p>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
