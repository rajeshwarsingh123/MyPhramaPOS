'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from 'lucide-react'

function useTheme() {
  const getTheme = () => {
    if (typeof window === 'undefined') return 'dark'
    return localStorage.getItem('admin-theme') || 'dark'
  }

  const theme = useSyncExternalStore(
    (callback) => {
      window.addEventListener('storage', callback)
      return () => window.removeEventListener('storage', callback)
    },
    getTheme,
    () => 'dark',
  )

  const setTheme = (t: string) => {
    localStorage.setItem('admin-theme', t)
    window.dispatchEvent(new StorageEvent('storage', { key: 'admin-theme' }))
  }

  return { theme, setTheme }
}

export function AdminNavbar() {
  const {
    adminAuth,
    setAdminAuth,
    setAdminPage,
    adminSidebarCollapsed,
    setAdminSidebarMobileOpen,
  } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [notificationCount] = useState(3)

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

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const initials = adminAuth.adminName
    ? adminAuth.adminName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SA'

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-40 h-14 flex items-center gap-3 px-4 border-b',
        'bg-[oklch(0.12_0.015_250)]/80 backdrop-blur-xl border-[oklch(0.25_0.03_250)]',
        // Left margin accounts for sidebar width
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

      {/* Search bar */}
      <div className="hidden sm:flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
          <Input
            placeholder="Search..."
            className="pl-9 h-9 bg-white/[0.04] border-white/10 text-sm text-white placeholder:text-white/25 rounded-lg focus:border-purple-500/40 focus:ring-purple-500/15"
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1 sm:hidden" />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
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
                {notificationCount}
              </span>
            </span>
          )}
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-white/60 hover:text-white hover:bg-white/5 h-9 w-9"
        >
          {theme === 'dark' ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </Button>

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
  )
}
