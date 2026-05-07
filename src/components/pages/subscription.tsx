'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { CreditCard, Calendar, ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function SubscriptionPage() {
  const queryClient = useQueryClient()
  const { currentTenant } = useAppStore()

  const { data: sub, isLoading } = useQuery({
    queryKey: ['subscription', currentTenant?.id],
    queryFn: () => fetch('/api/subscription/status').then(res => res.json()),
    enabled: !!currentTenant?.id
  })

  const renewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/subscription/renew', { method: 'POST' })
      if (!res.ok) throw new Error('Renewal failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Subscription renewed successfully!')
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
    onError: () => toast.error('Renewal failed. Please try again.')
  })

  if (isLoading) return <div className="p-8 flex justify-center"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>

  const isExpired = sub?.status === 'expired' || (sub?.expiryDate && new Date(sub.expiryDate) < new Date())
  const isSuspended = sub?.status === 'suspended'
  const daysLeft = sub?.daysLeft ?? 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-primary" />
          Subscription
        </h1>
        <p className="text-white/50">Manage your yearly PharmacyPOS subscription and billing history.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Status Card */}
        <Card className="md:col-span-2 bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-white">Current Plan</CardTitle>
                <CardDescription className="text-white/40">Yearly Professional Access</CardDescription>
              </div>
              <Badge className={cn(
                "px-3 py-1 text-xs font-bold uppercase tracking-wider",
                isSuspended ? "bg-red-500/20 text-red-400 border-red-500/30" :
                isExpired ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              )}>
                {isSuspended ? 'Suspended' : isExpired ? 'Expired' : 'Active'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 font-medium uppercase">Expiry Date</p>
                    <p className="text-lg font-bold text-white">
                      {sub?.expiryDate ? new Date(sub.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 font-medium uppercase">Access Status</p>
                    <p className={cn("text-lg font-bold", isExpired || isSuspended ? "text-red-400" : "text-emerald-400")}>
                      {isExpired || isSuspended ? 'Locked' : 'Full Access'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.03] rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-xs text-white/40 font-medium uppercase mb-2 relative z-10">Time Remaining</p>
                <p className={cn("text-4xl font-black relative z-10", daysLeft <= 0 ? "text-red-400" : daysLeft <= 30 ? "text-amber-400" : "text-white")}>
                  {daysLeft > 0 ? daysLeft : 0}
                </p>
                <p className="text-sm font-bold text-white/60 relative z-10">Days</p>
              </div>
            </div>

            {(isExpired || daysLeft <= 30) && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-400">Renewal Required</p>
                  <p className="text-xs text-amber-400/70 leading-relaxed">
                    {isExpired 
                      ? 'Your subscription has expired. All premium features like Billing and Inventory are currently locked.' 
                      : `Your subscription will expire in ${daysLeft} days. Renew now to avoid any interruption in service.`}
                  </p>
                </div>
              </div>
            )}

            <Button 
              className="w-full h-12 bg-gradient-to-r from-primary to-emerald-500 text-white font-bold text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all rounded-xl"
              onClick={() => renewMutation.mutate()}
              disabled={renewMutation.isPending}
            >
              {renewMutation.isPending ? <RefreshCw className="h-5 w-5 animate-spin mr-2" /> : <RefreshCw className="h-5 w-5 mr-2" />}
              {isExpired ? 'Renew Subscription' : 'Extend Subscription (+1 Year)'}
            </Button>
          </CardContent>
        </Card>

        {/* Plan Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg text-primary">Yearly Plan</CardTitle>
            <CardDescription className="text-white/60">Everything included</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-black text-white">₹4,999<span className="text-sm font-normal text-white/40">/year</span></div>
            <div className="space-y-3">
              {[
                'Unlimited Billing',
                'Unlimited Medicines',
                'Full GST Reports',
                'Expiry Alerts',
                'Stock Management',
                'Priority Support',
                'Cloud Backup'
              ].map(feat => (
                <div key={feat} className="flex items-center gap-2 text-xs text-white/70">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {feat}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History section could go here */}
    </div>
  )
}
