'use client'

import { cn } from '@/lib/utils'
import { useAppStore, type Page } from '@/lib/store'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Receipt,
  Pill,
  Package,
  ShoppingCart,
  BarChart3,
  Users,
  Settings,
  X,
  Sparkles,
  Cross,
  Truck,
  RotateCcw,
  FileText,
  History,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
} from 'lucide-react'

const mainNavItems: { id: Page; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'medicines', label: 'Medicines', icon: Pill },
  { id: 'stock', label: 'Stock', icon: Package },
]

const secondaryNavItems: { id: Page; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'sales-returns', label: 'Returns', icon: RotateCcw },
  { id: 'sales-history', label: 'Sales History', icon: History },
  { id: 'invoice-history', label: 'Invoice History', icon: FileText },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'customers', label: 'Customers', icon: Users },
]

const settingsNavItems: { id: Page; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const {
    currentPage,
    setCurrentPage,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapse,
    currentTenant,
  } = useAppStore()
  const isMobile = useIsMobile()
  const collapsed = isMobile ? false : sidebarCollapsed

  const handleNav = (page: Page) => {
    setCurrentPage(page)
    if (isMobile) setSidebarOpen(false)
  }

  const renderNavItem = (item: { id: Page; label: string; icon: React.ElementType; badge?: string }) => {
    const Icon = item.icon
    const isActive = currentPage === item.id

    const button = (
      <button
        key={item.id}
        onClick={() => handleNav(item.id)}
        className={cn(
          'group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left relative',
          collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5',
          'hover:scale-[1.02] active:scale-[0.98]',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20 active-indicator'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className={cn(
          'h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110',
          isActive && 'drop-shadow-sm'
        )} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-[10px] font-semibold bg-white/20 text-sidebar-primary-foreground hover:bg-white/20"
              >
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </button>
    )

    if (collapsed) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      )
    }

    return button
  }

  return (
    <>
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-[2px]"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out border-r border-sidebar-border flex flex-col',
          // Mobile: slide in/out
          isMobile && 'w-64',
          isMobile && (sidebarOpen ? 'translate-x-0' : '-translate-x-full'),
          // Desktop: static, collapsible width
          !isMobile && 'static z-auto',
          !isMobile && (collapsed ? 'w-[68px]' : 'w-64')
        )}
      >
        {/* Sidebar Header */}
        <div className={cn(
          'relative flex items-center border-b border-sidebar-border shrink-0',
          collapsed ? 'h-16 justify-center px-0' : 'h-16 gap-2.5 px-5'
        )}>
          {/* Decorative accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sidebar-primary/80 via-sidebar-primary/40 to-transparent" />

          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary/20 shadow-inner shadow-sidebar-primary/10 ring-1 ring-sidebar-primary/20 shrink-0">
            <Cross className="h-5 w-5 text-sidebar-primary" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-base font-bold tracking-tight text-sidebar-foreground whitespace-nowrap">PharmPOS</span>
              <span className="text-[10px] text-sidebar-foreground/50 leading-none whitespace-nowrap">Pharmacy Management</span>
            </div>
          )}
          {isMobile && !collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Scroll Area — fills remaining space */}
        <ScrollArea className="flex-1 min-h-0 sidebar-scroll">
          <nav className={cn(
            'flex flex-col gap-1 stagger-children',
            collapsed ? 'p-2 items-center' : 'p-3'
          )}>
            {/* Main Navigation */}
            {mainNavItems.map(renderNavItem)}

            {!collapsed && <Separator className="my-2 bg-sidebar-border/50" />}
            {collapsed && <div className="my-1.5 w-8 h-px bg-sidebar-border/40" />}

            {/* Secondary Navigation */}
            {secondaryNavItems.map(renderNavItem)}

            {!collapsed && <Separator className="my-2 bg-sidebar-border/50" />}
            {collapsed && <div className="my-1.5 w-8 h-px bg-sidebar-border/40" />}

            {/* Settings */}
            {settingsNavItems.map(renderNavItem)}

            {/* AI Powered Section */}
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className={cn(
                    'mt-2 flex items-center justify-center w-10 h-10 rounded-xl cursor-default',
                    'bg-sidebar-accent/50 ring-1 ring-sidebar-primary/20'
                  )}>
                    <Sparkles className="h-4 w-4 text-sidebar-primary animate-pulse" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="font-medium">
                  AI Powered
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="mt-2 px-1">
                <div className="gradient-border">
                  <div className="gradient-border-inner px-3 py-3 flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary/15">
                      <Sparkles className="h-4 w-4 text-sidebar-primary animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-sidebar-foreground">AI Powered</span>
                      <span className="text-[10px] text-sidebar-foreground/50 leading-tight">Smart billing & alerts</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className={cn(
          'border-t border-sidebar-border shrink-0 bg-sidebar',
          collapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3'
        )}>
          {/* Collapse Toggle Button — unique hamburger-style */}
          {!isMobile && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebarCollapse}
                  className={cn(
                    'group flex items-center gap-2 rounded-lg transition-all duration-200 w-full',
                    collapsed
                      ? 'justify-center h-9 w-9 rounded-xl hover:bg-sidebar-accent'
                      : 'px-3 py-2 hover:bg-sidebar-accent'
                  )}
                  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {/* Unique hamburger icon — three bars with pill container */}
                  <div className={cn(
                    'flex items-center justify-center rounded-lg transition-all duration-300',
                    collapsed
                      ? 'w-9 h-9 bg-sidebar-accent group-hover:bg-sidebar-primary/20'
                      : 'w-7 h-7 bg-sidebar-primary/15 group-hover:bg-sidebar-primary/25'
                  )}>
                    <div className="flex flex-col items-center justify-center gap-[3px] w-3.5">
                      <span className={cn(
                        'block h-[2px] rounded-full bg-sidebar-primary transition-all duration-300',
                        collapsed ? 'w-3.5' : 'w-3.5 translate-y-[2.5px]'
                      )} />
                      <span className={cn(
                        'block h-[2px] rounded-full bg-sidebar-primary transition-all duration-300',
                        collapsed ? 'w-3.5' : 'w-2.5 opacity-80'
                      )} />
                      <span className={cn(
                        'block h-[2px] rounded-full bg-sidebar-primary transition-all duration-300',
                        collapsed ? 'w-3.5' : 'w-3.5 -translate-y-[2.5px]'
                      )} />
                    </div>
                  </div>
                  {!collapsed && (
                    <span className="text-xs font-medium text-sidebar-foreground/60 group-hover:text-sidebar-foreground/80 transition-colors">
                      Collapse
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" sideOffset={8} className="font-medium">
                  Expand sidebar
                </TooltipContent>
              )}
            </Tooltip>
          )}

          {/* User Info */}
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="avatar-ring cursor-default">
                  <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                    <span className="text-xs font-bold text-sidebar-primary">A</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {currentTenant?.name || 'Admin'} · {currentTenant?.email || 'admin@pharmacy.com'}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="avatar-ring shrink-0">
                <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                  <span className="text-xs font-bold text-sidebar-primary">A</span>
                </div>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium text-sidebar-foreground truncate">{currentTenant?.name || 'Administrator'}</span>
                <span className="text-[10px] text-sidebar-foreground/50 truncate">{currentTenant?.email || 'admin@pharmacy.com'}</span>
              </div>
            </div>
          )}

          {/* Version Badge */}
          {!collapsed && (
            <div className="flex justify-center mt-1">
              <Badge
                variant="outline"
                className="text-[9px] font-medium px-2 py-0 h-4 bg-sidebar-primary/5 border-sidebar-primary/15 text-sidebar-foreground/40 hover:bg-sidebar-primary/10"
              >
                PharmPOS Pro v2.1
              </Badge>
            </div>
          )}

        </div>
      </aside>
    </>
  )
}
