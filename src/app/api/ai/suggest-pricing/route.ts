import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { purchasePrice, marginPercent = 20, gstPercent = 5 } = body

    if (purchasePrice === undefined || purchasePrice === null) {
      return NextResponse.json(
        { error: 'purchasePrice is required' },
        { status: 400 }
      )
    }

    const price = parseFloat(purchasePrice)
    const margin = parseFloat(marginPercent)
    const gst = parseFloat(gstPercent)

    if (isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: 'purchasePrice must be a valid non-negative number' },
        { status: 400 }
      )
    }

    if (isNaN(margin) || margin < 0) {
      return NextResponse.json(
        { error: 'marginPercent must be a valid non-negative number' },
        { status: 400 }
      )
    }

    if (isNaN(gst) || gst < 0 || gst > 28) {
      return NextResponse.json(
        { error: 'gstPercent must be between 0 and 28' },
        { status: 400 }
      )
    }

    // Calculate pricing
    const basePrice = price * (1 + margin / 100)
    const gstAmount = Math.round((basePrice * gst / 100) * 100) / 100
    const sellingPrice = Math.round((basePrice + gstAmount) * 100) / 100
    const profitPerUnit = Math.round((basePrice - price) * 100) / 100

    return NextResponse.json({
      success: true,
      pricing: {
        purchasePrice: price,
        marginPercent: margin,
        gstPercent: gst,
        basePrice: Math.round(basePrice * 100) / 100,
        gstAmount,
        sellingPrice,
        profitPerUnit,
      },
    })
  } catch (error) {
    console.error('AI Suggest Pricing error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate pricing suggestions' },
      { status: 500 }
    )
  }
}
