import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const INFO_PROMPT = `You are a professional pharmacy consultant. Given a medicine name, provide its common pharmaceutical details.
Provide:
- generic_name: Common generic name
- composition: Full salt composition (e.g. Paracetamol 500mg + Caffeine 65mg)
- strength: Standard strength (e.g. 500mg, 10ml)
- unit_type: Choose ONE from: tablet, capsule, syrup, injection, cream, ointment, gel, drops, inhaler, spray, patch, other
- pack_size: Standard pack size (e.g. 10, 15, 30, 100)
- category: One word category (e.g. Analgesic, Antibiotic, Antipyretic, etc.)
- gst_percent: Standard GST rate in India for this medicine (usually 5, 12, or 18)

Return ONLY a valid JSON object. Do not include any explanation.

Example:
{
  "generic_name": "Paracetamol",
  "composition": "Paracetamol 500mg",
  "strength": "500mg",
  "unit_type": "tablet",
  "pack_size": 10,
  "category": "Antipyretic",
  "gst_percent": 12
}`

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Medicine name is required' }, { status: 400 })
    }

    const zai = await ZAI.create()

    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `${INFO_PROMPT}\n\nMedicine Name: ${name}`
        }
      ],
      thinking: { type: 'disabled' }
    })

    const rawContent = response.choices?.[0]?.message?.content || ''
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0])
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ error: 'Failed to extract structured data' }, { status: 500 })
  } catch (error) {
    console.error('AI Medicine Info error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medicine info' },
      { status: 500 }
    )
  }
}
