import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      )
    }

    const admin = await db.admin.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      )
    }

    if (!admin.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 },
      )
    }

    // Plain text comparison for demo
    if (admin.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      )
    }

    // Update last login
    await db.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    })

    return NextResponse.json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      lastLogin: new Date(),
    })
  } catch (error) {
    console.error('POST /api/admin/auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 },
    )
  }
}
