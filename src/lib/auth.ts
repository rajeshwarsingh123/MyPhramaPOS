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
  return null
}
