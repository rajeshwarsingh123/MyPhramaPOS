'use client'

import { cn } from '@/lib/utils'
import { useAppStore, type Page } from '@/lib/store'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
  { id: 'invoice-history', label: 'Invoice History', icon: FileText },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'customers', label: 'Customers', icon: Users },
]

const settingsNavItems: { id: Page; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } = useAppStore()
  const isMobile = useIsMobile()

  const handleNav = (page: Page) => {
    setCurrentPage(page)
    if (isMobile) setSidebarOpen(false)
  }

  const renderNavItem = (item: { id: Page; label: string; icon: React.ElementType; badge?: string }) => {
    const Icon = item.icon
    const isActive = currentPage === item.id
    return (
      <button
        key={item.id}
        onClick={() => handleNav(item.id)}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full text-left relative',
          'hover:scale-[1.02] active:scale-[0.98]',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20 active-indicator'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
      >
        <Icon className={cn(
          'h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110',
          isActive && 'drop-shadow-sm'
        )} />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <Badge 
            variant="secondary" 
            className={cn(
              'h-5 px-1.5 text-[10px] font-semibold',
              isActive 
                ? 'bg-white/20 text-sidebar-primary-foreground hover:bg-white/20' 
                : 'bg-sidebar-accent text-sidebar-foreground/70'
            )}
          >
            {item.badge}
          </Badge>
        )}
      </button>
    )
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
          'fixed top-0 left-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-auto border-r border-sidebar-border',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="relative flex h-16 items-center gap-2.5 px-5 border-b border-sidebar-border">
          {/* Decorative accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sidebar-primary/80 via-sidebar-primary/40 to-transparent" />
          
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary/20 shadow-inner shadow-sidebar-primary/10 ring-1 ring-sidebar-primary/20">
            <Cross className="h-5 w-5 text-sidebar-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-sidebar-foreground">PharmPOS</span>
            <span className="text-[10px] text-sidebar-foreground/50 leading-none">Pharmacy Management</span>
          </div>
          {isMobile && (
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

        {/* Scroll Area */}
        <ScrollArea className="flex-1 h-[calc(100%-4rem)] sidebar-scroll">
          <nav className="flex flex-col gap-1 p-3 stagger-children">
            {/* Main Navigation */}
            {mainNavItems.map(renderNavItem)}

            <Separator className="my-2 bg-sidebar-border/50" />

            {/* Secondary Navigation */}
            {secondaryNavItems.map(renderNavItem)}

            <Separator className="my-2 bg-sidebar-border/50" />

            {/* Settings */}
            {settingsNavItems.map(renderNavItem)}

            {/* AI Powered Section */}
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
          </nav>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="border-t border-sidebar-border p-3 bg-sidebar">
          {/* User Info */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="avatar-ring shrink-0">
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-xs font-bold text-sidebar-primary">A</span>
              </div>
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate">Admin</span>
              <span className="text-[10px] text-sidebar-foreground/50 truncate">admin@pharmacy.com</span>
            </div>
          </div>
          {/* Version Badge */}
          <div className="flex justify-center mt-1">
            <Badge 
              variant="outline" 
              className="text-[9px] font-medium px-2 py-0 h-4 bg-sidebar-primary/5 border-sidebar-primary/15 text-sidebar-foreground/40 hover:bg-sidebar-primary/10"
            >
              PharmPOS Pro v2.1
            </Badge>
          </div>
        </div>
      </aside>
    </>
  )
}
