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
} from 'lucide-react'

const navItems: { id: Page; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'medicines', label: 'Medicines', icon: Pill },
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } = useAppStore()
  const isMobile = useIsMobile()

  const handleNav = (page: Page) => {
    setCurrentPage(page)
    if (isMobile) setSidebarOpen(false)
  }

  return (
    <>
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary/20">
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
              className="ml-auto h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 h-[calc(100%-4rem)]">
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full text-left',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
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
            })}

            <Separator className="my-2 bg-sidebar-border" />

            <div className="px-3 py-2">
              <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 px-3 py-2">
                <Sparkles className="h-4 w-4 text-sidebar-primary" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-sidebar-foreground">AI Powered</span>
                  <span className="text-[10px] text-sidebar-foreground/50">Smart billing & alerts</span>
                </div>
              </div>
            </div>
          </nav>
        </ScrollArea>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-sidebar-primary">A</span>
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate">Admin</span>
              <span className="text-[10px] text-sidebar-foreground/50 truncate">admin@pharmacy.com</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
