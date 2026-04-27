import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.subscription.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 },
      )
    }

    const { plan, status, amount, startDate, endDate, paymentMode } = body

    const subscription = await db.subscription.update({
      where: { id },
      data: {
        ...(plan !== undefined ? { plan } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(amount !== undefined ? { amount: parseFloat(amount) } : {}),
        ...(startDate !== undefined
          ? { startDate: new Date(startDate) }
          : {}),
        ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
        ...(paymentMode !== undefined ? { paymentMode } : {}),
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            businessName: true,
            email: true,
          },
        },
      },
    })

    // If plan changed, update tenant plan too
    if (plan !== undefined && plan !== existing.plan) {
      await db.tenant.update({
        where: { id: existing.tenantId },
        data: { plan },
      })

      await db.systemLog.create({
        data: {
          tenantId: existing.tenantId,
          action: 'Plan changed',
          details: `Subscription plan changed from ${existing.plan} to ${plan}`,
        },
      })
    }

    return NextResponse.json(subscription)
  } catch (error) {
    console.error('PUT /api/admin/subscriptions/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 },
    )
  }
}
