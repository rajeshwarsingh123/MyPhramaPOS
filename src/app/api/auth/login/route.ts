import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, adminSupabase, hasServiceRoleKey } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // ── Check Admin table first (super admin / staff) ──
    const admin = await db.admin.findUnique({ where: { email: normalizedEmail } })

    if (admin) {
      if (!admin.isActive) {
        return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 })
      }

      // ── Admin Supabase Auth Path ──
      if (isSupabaseConfigured && hasServiceRoleKey && adminSupabase) {
        const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers({
          filters: { email: normalizedEmail },
        })

        if (!listError && usersData?.users?.length > 0) {
          const userId = usersData.users[0].id
          const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
            password: password,
            email_confirm: true,
            user_metadata: { name: admin.name, role: admin.role },
          })

          if (!updateError) {
            await db.admin.update({
              where: { id: admin.id },
              data: { password: `supabase:${userId}`, lastLogin: new Date() },
            })

            return NextResponse.json({
              id: admin.id, name: admin.name, email: admin.email,
              role: admin.role, lastLogin: new Date(), authProvider: 'supabase',
              userType: 'admin',
            })
          }
        }

        // Auto-create admin in Supabase
        const { data: newUserData, error: createError } = await adminSupabase.auth.admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: true,
          user_metadata: { name: admin.name, role: admin.role },
        })

        if (!createError && newUserData.user) {
          await db.admin.update({
            where: { id: admin.id },
            data: { password: `supabase:${newUserData.user.id}`, lastLogin: new Date() },
          })

          return NextResponse.json({
            id: admin.id, name: admin.name, email: admin.email,
            role: admin.role, lastLogin: new Date(), authProvider: 'supabase',
            userType: 'admin',
          })
        }

        console.error('Supabase auth failed for admin, falling back to local:', createError)
      }

      // ── Admin Local Fallback Path ──
      if (admin.password.startsWith('supabase:')) {
        return NextResponse.json({ error: 'This account uses Supabase authentication.' }, { status: 401 })
      }

      if (admin.password !== password) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

      await db.admin.update({ where: { id: admin.id }, data: { lastLogin: new Date() } })

      return NextResponse.json({
        id: admin.id, name: admin.name, email: admin.email,
        role: admin.role, lastLogin: new Date(), authProvider: 'local',
        userType: 'admin',
      })
    }

    // ── Check Tenant table (regular pharmacy user) ──
    const tenant = await db.tenant.findUnique({ where: { email: normalizedEmail } })

    if (!tenant) {
      return NextResponse.json({ error: 'No account found with this email. Please sign up first.' }, { status: 401 })
    }

    if (tenant.status === 'suspended') {
      return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
    }

    // ── Tenant Supabase Auth Path ──
    if (isSupabaseConfigured && hasServiceRoleKey && adminSupabase) {
      const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers({
        filters: { email: normalizedEmail },
      })

      if (!listError && usersData?.users?.length > 0) {
        const userId = usersData.users[0].id

        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
          password: password,
          email_confirm: true,
        })

        if (!updateError) {
          await db.tenant.update({
            where: { id: tenant.id },
            data: { passwordHash: `supabase:${userId}` },
          })

          await db.systemLog.create({
            data: { tenantId: tenant.id, action: 'LOGIN', details: `Tenant ${tenant.email} logged in via Supabase` },
          })

          return NextResponse.json({
            id: tenant.id, name: tenant.name, email: tenant.email,
            businessName: tenant.businessName, phone: tenant.phone,
            plan: tenant.plan, status: tenant.status,
            authProvider: 'supabase',
            userType: 'tenant',
          })
        }
      }

      const { data: newUserData, error: createError } = await adminSupabase.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: { name: tenant.name, businessName: tenant.businessName, role: 'tenant' },
      })

      if (!createError && newUserData.user) {
        await db.tenant.update({
          where: { id: tenant.id },
          data: { passwordHash: `supabase:${newUserData.user.id}` },
        })

        await db.systemLog.create({
          data: { tenantId: tenant.id, action: 'LOGIN', details: `Tenant ${tenant.email} auto-migrated and logged in via Supabase` },
        })

        return NextResponse.json({
          id: tenant.id, name: tenant.name, email: tenant.email,
          businessName: tenant.businessName, phone: tenant.phone,
          plan: tenant.plan, status: tenant.status,
          authProvider: 'supabase',
          userType: 'tenant',
        })
      }

      console.error('Supabase auth failed for tenant, falling back to local:', createError)
    }

    // ── Tenant Local Fallback Path ──
    if (tenant.passwordHash.startsWith('supabase:')) {
      return NextResponse.json({ error: 'This account uses Supabase authentication.' }, { status: 401 })
    }

    if (tenant.passwordHash !== password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    await db.systemLog.create({
      data: { tenantId: tenant.id, action: 'LOGIN', details: `Tenant ${tenant.email} logged in (local)` },
    })

    return NextResponse.json({
      id: tenant.id, name: tenant.name, email: tenant.email,
      businessName: tenant.businessName, phone: tenant.phone,
      plan: tenant.plan, status: tenant.status,
      authProvider: 'local',
      userType: 'tenant',
    })
  } catch (error) {
    console.error('POST /api/auth/login error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
