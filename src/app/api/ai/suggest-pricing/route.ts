import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const PRICING_PROMPT = `You are a pharmaceutical pricing expert. Given a medicine name and its purchase price, suggest an optimal selling price (MRP) and margin.
Consider typical pharmacy margins in India (usually 15-30% for branded, higher for generics).
Provide:
- suggested_mrp: The total selling price
- suggested_margin: The percentage margin
- reasoning: Short explanation of why this price is suggested
- market_context: Typical price range for this medicine in the market

Return ONLY a valid JSON object. Do not include any explanation.

Example:
{
  "suggested_mrp": 120.00,
  "suggested_margin": 20,
  "reasoning": "Standard margin for this antibiotic category.",
  "market_context": "Ranges from ₹110 to ₹140 across brands."
}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, purchasePrice } = body

    if (!name || purchasePrice === undefined) {
      return NextResponse.json(
        { error: 'Medicine name and purchasePrice are required' },
        { status: 400 }
      )
    }

    const price = parseFloat(purchasePrice)
    const zai = await ZAI.create()

    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `${PRICING_PROMPT}\n\nMedicine: ${name}\nPurchase Price: ₹${price}`
        }
      ],
      thinking: { type: 'disabled' }
    })

    const rawContent = response.choices?.[0]?.message?.content || ''
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0])
      return NextResponse.json({
        success: true,
        pricing: {
          ...data,
          purchasePrice: price,
        },
      })
    }

    // Fallback to simple calculation if AI fails
    const margin = 20
    const suggested_mrp = Math.round(price * 1.25 * 100) / 100
    return NextResponse.json({
      success: true,
      pricing: {
        suggested_mrp,
        suggested_margin: 25,
        reasoning: "Fallback calculation (25% margin). AI was unable to provide a specific suggestion.",
        market_context: "N/A",
        purchasePrice: price,
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
