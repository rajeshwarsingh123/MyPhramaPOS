import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, isSupabaseConfigured, hasServiceRoleKey } from '@/lib/supabase/server'
import { supabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured || !hasServiceRoleKey || !adminSupabase) {
      return NextResponse.json(
        { error: 'Supabase Admin API is not configured. Please check your service role key.' },
        { status: 400 },
      )
    }

    // 1. Fetch all tenants from Supabase Tenant table
    const { data: tenants, error: fetchError } = await supabase
      .from('Tenant')
      .select('id, email, name, businessName, passwordHash')

    if (fetchError) throw fetchError

    const results = {
      total: tenants?.length || 0,
      synced: 0,
      alreadySynced: 0,
      failed: 0,
      errors: [] as string[],
    }

    // 2. Fetch all existing users from Supabase Auth once (up to 1000)
    const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers({
      perPage: 1000
    })
    if (listError) throw listError
    const allAuthUsers = usersData?.users || []

    // 3. Iterate and sync
    for (const tenant of (tenants || [])) {
      if (tenant.passwordHash?.startsWith('supabase:')) {
        results.alreadySynced++
        continue
      }

      try {
        const normalizedEmail = tenant.email.trim().toLowerCase()

        // Check if user already exists in Supabase Auth by email from our pre-fetched list
        const existingUser = allAuthUsers.find(u => u.email?.toLowerCase() === normalizedEmail)

        let supabaseUserId: string

        if (existingUser) {
          supabaseUserId = existingUser.id
          await adminSupabase.auth.admin.updateUserById(supabaseUserId, {
            user_metadata: { 
              name: tenant.name, 
              businessName: tenant.businessName,
              role: 'tenant' 
            },
            email_confirm: true,
          })
        } else {
          // Create new user
          const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
            email: normalizedEmail,
            password: tenant.passwordHash || 'TemporaryPass123!', // Safety fallback
            email_confirm: true,
            user_metadata: { 
              name: tenant.name, 
              businessName: tenant.businessName,
              role: 'tenant' 
            },
          })

          if (createError) throw createError
          supabaseUserId = newUser.user.id
        }

        // 3. Update Tenant with supabase ID
        await supabase
          .from('Tenant')
          .update({ passwordHash: `supabase:${supabaseUserId}` })
          .eq('id', tenant.id)

        results.synced++
      } catch (err: any) {
        console.error(`Failed to sync tenant ${tenant.email}:`, err)
        results.failed++
        results.errors.push(`${tenant.email}: ${err.message || String(err)}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synchronization complete. Synced: ${results.synced}, Already Synced: ${results.alreadySynced}, Failed: ${results.failed}`,
      results,
    })
  } catch (error) {
    console.error('POST /api/auth/setup-supabase/sync error:', error)
    return NextResponse.json({ error: 'Synchronization failed' }, { status: 500 })
  }
}
