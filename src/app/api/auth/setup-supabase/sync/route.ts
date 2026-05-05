import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, isSupabaseConfigured, hasServiceRoleKey } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured || !hasServiceRoleKey || !adminSupabase) {
      return NextResponse.json(
        { error: 'Supabase Admin API is not configured. Please check your service role key.' },
        { status: 400 },
      )
    }

    // 1. Fetch all tenants from local DB
    const tenants = await db.tenant.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        passwordHash: true,
      },
    })

    const results = {
      total: tenants.length,
      synced: 0,
      alreadySynced: 0,
      failed: 0,
      errors: [] as string[],
    }

    // 2. Iterate and sync
    for (const tenant of tenants) {
      // Check if already synced (starts with supabase:)
      if (tenant.passwordHash.startsWith('supabase:')) {
        results.alreadySynced++
        continue
      }

      try {
        const normalizedEmail = tenant.email.trim().toLowerCase()

        // Check if user already exists in Supabase Auth by email
        const { data: existingUsers, error: listError } = await adminSupabase.auth.admin.listUsers({
          filters: { email: normalizedEmail },
        })

        if (listError) throw listError

        let supabaseUserId: string

        if (existingUsers?.users?.length > 0) {
          // User exists in Supabase, just link them
          supabaseUserId = existingUsers.users[0].id
          
          // Optionally update their password if we want to force it to match local
          // For safety, we just link them for now if they exist
          await adminSupabase.auth.admin.updateUserById(supabaseUserId, {
            user_metadata: { 
              name: tenant.name, 
              businessName: tenant.businessName,
              role: 'tenant' 
            },
            email_confirm: true,
          })
        } else {
          // Create new user in Supabase Auth
          const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
            email: normalizedEmail,
            password: tenant.passwordHash, // Assuming local hash is usable or plain text
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

        // 3. Update local DB with supabase ID
        await db.tenant.update({
          where: { id: tenant.id },
          data: { passwordHash: `supabase:${supabaseUserId}` },
        })

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
