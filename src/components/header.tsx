'use client'

import { useAppStore } from '@/lib/store'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Menu, 
  Search, 
  Bell, 
  Moon, 
  Sun,
  Plus,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { useEffect, useState, useSyncExternalStore } from 'react'

interface Alert {
  id: string
  type: 'expiry' | 'low_stock'
  title: string
  description: string
  time: string
}

const mockAlerts: Alert[] = [
  { id: '1', type: 'expiry', title: 'Paracetamol 500mg expiring soon', description: 'Batch BN2024-001 expires in 7 days', time: format(new Date(), 'HH:mm') },
  { id: '2', type: 'low_stock', title: 'Amoxicillin 250mg low stock', description: 'Only 5 units remaining', time: format(new Date(), 'HH:mm') },
  { id: '3', type: 'expiry', title: 'Cough Syrup 100ml expired', description: 'Batch BN2023-015 expired 3 days ago', time: format(new Date(), 'HH:mm') },
]

export function Header() {
  const { toggleSidebar } = useAppStore()
  const isMobile = useIsMobile()
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts)

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(data => {
        if (data.alerts && data.alerts.length > 0) {
          setAlerts(data.alerts)
        }
      })
      .catch(() => {})
  }, [])

  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    billing: 'Billing',
    medicines: 'Medicines',
    stock: 'Stock Management',
    purchases: 'Purchase Entry',
    reports: 'Reports',
    customers: 'Customers',
    settings: 'Settings',
  }

  const { currentPage } = useAppStore()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 backdrop-blur-sm px-4 lg:px-6">
      {isMobile && (
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <div className="flex-1">
        <h1 className="text-lg font-semibold text-foreground">{pageTitles[currentPage] || 'PharmPOS'}</h1>
      </div>

      <div className="hidden md:flex items-center gap-2 w-72">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Quick search medicines..."
            className="pl-9 h-9 text-sm bg-muted/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4.5 w-4.5" />
              {alerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {alerts.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Alerts</h3>
              <Badge variant="secondary" className="text-[10px]">{alerts.length} new</Badge>
            </div>
            <ScrollArea className="max-h-72">
              <div className="flex flex-col">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                      alert.type === 'expiry' ? 'bg-destructive' : 'bg-warning'
                    }`} />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate">{alert.title}</span>
                      <span className="text-xs text-muted-foreground truncate">{alert.description}</span>
                      <span className="text-[10px] text-muted-foreground/60">{alert.time}</span>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No alerts
                  </div>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </Button>
        )}
      </div>
    </header>
  )
}
