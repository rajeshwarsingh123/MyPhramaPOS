import { NextRequest } from 'next/server'
import { supabase } from './supabase/server'

/**
 * Gets the current tenant ID from the request.
 * It tries to identify the user via Supabase Auth and then finds the corresponding tenant.
 */
export async function getTenantId(req: NextRequest): Promise<string | null> {
  // 1. Try to get the session from the Authorization header
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user?.email) {
      const { data: tenant } = await supabase
        .from('Tenant')
        .select('id')
        .eq('email', user.email)
        .single()
        
      if (tenant) return tenant.id
    }
  }

  // 2. Fallback: Check if there's a tenantId in the headers
  const tenantIdHeader = req.headers.get('x-tenant-id')
  if (tenantIdHeader) return tenantIdHeader

  // 3. Fallback: Check for tenant email in headers
  const tenantEmailHeader = req.headers.get('x-tenant-email')
  if (tenantEmailHeader) {
    const { data: tenant } = await supabase
      .from('Tenant')
      .select('id')
      .eq('email', tenantEmailHeader)
      .single()
      
    if (tenant) return tenant.id
  }
  // 4. Fallback: Check for tenantId in cookies
  const tenantIdCookie = req.cookies.get('tenantId')?.value
  if (tenantIdCookie) return tenantIdCookie

  return null
}


/**
 * Gets the current admin info from the request.
 */
export async function getAdminId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user?.email) {
      const { data: admin } = await supabase
        .from('Admin')
        .select('id')
        .eq('email', user.email)
        .single()
        
      if (admin) return admin.id
    }
  }
  // 2. Fallback: Check for adminId in cookies
  const adminIdCookie = req.cookies.get('adminId')?.value
  if (adminIdCookie) return adminIdCookie

  return null
}

/**
 * Checks if a tenant has exceeded their plan limits based on platform settings.
 */
export async function checkLimit(tenantId: string, type: 'medicines' | 'bills' | 'staff'): Promise<{ allowed: boolean; error?: string }> {
  // 1. Get tenant plan
  const { data: tenant } = await supabase
    .from('Tenant')
    .select('plan')
    .eq('id', tenantId)
    .single()

  if (!tenant) return { allowed: false, error: 'Tenant not found' }
  if (tenant.plan === 'pro') return { allowed: true } // Pro plan has no limits

  // 2. Get platform settings
  const { data: settingsData } = await supabase
    .from('PlatformSetting')
    .select('key, value')

  const settings: Record<string, string> = {}
  settingsData?.forEach(s => { settings[s.key] = s.value })

  // 3. Check specific limits
  if (type === 'medicines') {
    const limit = parseInt(settings['max_free_medicines'] || '50')
    const { count } = await supabase
      .from('Medicine')
      .select('*', { count: 'exact', head: true })
      .eq('tenantId', tenantId)

    if ((count || 0) >= limit) {
      return { allowed: false, error: `Medicine limit reached (${limit}). Please upgrade to Pro.` }
    }
  }

  if (type === 'bills') {
    const limit = parseInt(settings['max_free_bills_per_day'] || '100')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count } = await supabase
      .from('Sale')
      .select('*', { count: 'exact', head: true })
      .eq('tenantId', tenantId)
      .gte('saleDate', today.toISOString())

    if ((count || 0) >= limit) {
      return { allowed: false, error: `Daily billing limit reached (${limit}). Please upgrade to Pro.` }
    }
  }

  return { allowed: true }
}
