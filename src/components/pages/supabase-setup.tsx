'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Database, 
  ExternalLink, 
  ShieldCheck, 
  Key, 
  Globe, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Info,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export function SupabaseSetupPage() {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [serviceRoleKey, setServiceRoleKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<{
    configured: boolean
    connected: boolean
    message?: string
    projectUrl?: string
  } | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/auth/setup-supabase')
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setChecking(false)
    }
  }

  const handleSave = async () => {
    if (!url || !anonKey || !serviceRoleKey) {
      toast.error('All fields are required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/config/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, anonKey, serviceRoleKey }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Supabase configuration saved!')
        fetchStatus()
      } else {
        toast.error(data.error || 'Failed to save configuration')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncUsers = async () => {
    setSyncLoading(true)
    const toastId = toast.loading('Synchronizing users with Supabase Auth...')
    try {
      const res = await fetch('/api/auth/setup-supabase/sync', {
        method: 'POST',
      })
      const data = await res.json()
      
      if (res.ok) {
        toast.success(data.message, { id: toastId, duration: 5000 })
        if (data.results?.failed > 0) {
          toast.error(`${data.results.failed} users failed to sync. Check console for details.`, { duration: 7000 })
        }
      } else {
        toast.error(data.error || 'Synchronization failed', { id: toastId })
      }
    } catch (error) {
      toast.error('Connection error during synchronization', { id: toastId })
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight section-title-gradient flex items-center gap-3">
          <Database className="h-8 w-8 text-violet-500" />
          Supabase Connection
        </h1>
        <p className="text-muted-foreground">
          Connect your pharmacy to Supabase for secure cloud authentication and storage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <Card className="md:col-span-1 border-violet-500/20 bg-violet-500/5 card-spotlight h-fit">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Connection Status
              {checking && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence mode="wait">
              {status?.configured ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Configured</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground">Project ID:</p>
                    <p className="font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-1 rounded truncate">
                      {status.projectUrl}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 w-full justify-center py-1">
                    Ready for Cloud Auth
                  </Badge>

                  <div className="pt-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="w-full gap-2 text-xs"
                      onClick={handleSyncUsers}
                      disabled={syncLoading}
                    >
                      {syncLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Users className="h-3 w-3" />}
                      Sync Existing Users
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                      Migrates local users to Supabase Auth
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-amber-500">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Not Connected</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Authentication is currently running in local mode.
                  </p>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 w-full justify-center py-1">
                    Local Auth Fallback
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <Card className="md:col-span-2 shadow-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5 text-violet-500" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Enter your Supabase project credentials to enable cloud integration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-4">
              {/* Project URL */}
              <div className="space-y-2">
                <Label htmlFor="url" className="flex items-center justify-between">
                  Project URL
                  <a 
                    href="https://supabase.com/dashboard/project/_/settings/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-violet-500 hover:underline flex items-center gap-1"
                  >
                    Find in Dashboard <ExternalLink className="h-2 w-2" />
                  </a>
                </Label>
                <div className="relative group">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors" />
                  <Input
                    id="url"
                    placeholder="https://your-project.supabase.co"
                    className="pl-10 input-focus-smooth"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Anon Key */}
              <div className="space-y-2">
                <Label htmlFor="anonKey">Anon Public Key</Label>
                <div className="relative group">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors" />
                  <Input
                    id="anonKey"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="pl-10 input-focus-smooth font-mono text-xs"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                  />
                </div>
              </div>

              {/* Service Role Key */}
              <div className="space-y-2">
                <Label htmlFor="serviceKey" className="flex items-center gap-2">
                  Service Role Key
                  <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-500 bg-amber-500/5">
                    Sensitive
                  </Badge>
                </Label>
                <div className="relative group">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors" />
                  <Input
                    id="serviceKey"
                    type="password"
                    placeholder="Service role key (for admin tasks)"
                    className="pl-10 input-focus-smooth font-mono text-xs"
                    value={serviceRoleKey}
                    onChange={(e) => setServiceRoleKey(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-4">
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Saving these credentials will update your <code className="text-violet-500">.env</code> file. 
                  Make sure you have enabled <span className="font-semibold text-foreground">Email Auth</span> in your 
                  Supabase Authentication settings.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setUrl(''); setAnonKey(''); setServiceRoleKey('') }}>
                  Clear
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="btn-gradient-primary gap-2 min-w-[140px]"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save & Connect
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Guide Card */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-violet-500" />
            Next Steps after connecting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 text-violet-600 font-bold">1</div>
              <p>Go to the <strong>Users</strong> section to sync your existing local administrators with Supabase Auth.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 text-violet-600 font-bold">2</div>
              <p>Test the <strong>Forgot Password</strong> flow to ensure Supabase Email templates are correctly configured.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
