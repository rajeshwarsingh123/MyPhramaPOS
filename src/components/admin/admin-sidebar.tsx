'use client'

import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  MessageSquare,
  Settings,
  Megaphone,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const adminNavItems: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'admin-users', label: 'Users', icon: Users },
  { id: 'admin-subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'admin-reports', label: 'Reports', icon: BarChart3 },
  { id: 'admin-tickets', label: 'Support', icon: MessageSquare },
  { id: 'admin-announcements', label: 'Announcements', icon: Megaphone },
  { id: 'admin-settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar() {
  const { adminPage, setAdminPage } = useAppStore()

  const handleNav = (page: string) => {
    setAdminPage(page as typeof adminPage)
  }

  return (
    <aside className="fixed top-0 left-0 z-50 h-full w-64 bg-[oklch(0.15_0.02_250)] border-r border-[oklch(0.25_0.03_250)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[oklch(0.25_0.03_250)] shrink-0">
        <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/20">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">PharmPOS Admin</span>
          <span className="text-[10px] text-white/40 leading-none whitespace-nowrap">Super Admin Panel</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0">
        <nav className="flex flex-col gap-1 p-3">
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const isActive = adminPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full text-left',
                  isActive
                    ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                )}
              >
                <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-purple-400')} />
                <span>{item.label}</span>
                {item.id === 'admin-tickets' && (
                  <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px] bg-red-500/20 text-red-400">
                    3
                  </Badge>
                )}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-[oklch(0.25_0.03_250)] p-3 shrink-0 space-y-2">
        <Button
          variant="ghost"
          onClick={() => setAdminPage(null)}
          className="w-full justify-start gap-3 px-3 text-sm text-white/60 hover:text-white hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" />
          Exit Admin Panel
        </Button>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/20">
            <span className="text-xs font-bold text-purple-400">SA</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-white truncate">Super Admin</span>
            <span className="text-[10px] text-white/40 truncate">admin@pharmpos.com</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
