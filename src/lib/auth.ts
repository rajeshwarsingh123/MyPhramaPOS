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
 * Checks if a tenant's subscription is active and not expired.
 */
export async function checkSubscription(tenantId: string): Promise<{ allowed: boolean; status: string; daysLeft: number; error?: string }> {
  const { data: sub } = await supabase
    .from('Subscription')
    .select('status, expiryDate')
    .eq('tenantId', tenantId)
    .single()

  if (!sub) return { allowed: false, status: 'none', daysLeft: 0, error: 'Subscription not found' }

  const expiry = new Date(sub.expiryDate)
  const now = new Date()
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (sub.status === 'suspended') {
    return { allowed: false, status: 'suspended', daysLeft, error: 'Your account has been suspended. Please contact support.' }
  }

  if (now > expiry) {
    return { allowed: false, status: 'expired', daysLeft, error: 'Your subscription has expired. Please renew to continue.' }
  }

  return { allowed: true, status: sub.status, daysLeft }
}
