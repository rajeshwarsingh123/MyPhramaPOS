import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const SCAN_PROMPT = `This is a pharmacy supplier bill/invoice. Extract all medicines/items listed. For each item, provide:
- medicine_name (exact name on bill)
- quantity (number)
- batch_number (if visible)
- expiry_date (if visible, in YYYY-MM-DD format)
- mrp_or_price (the price per unit)
- any other details visible (like company, strength, pack_size, gst_percent, total_amount).

Return ONLY a valid JSON array of objects. Each object must have at least medicine_name, quantity, and mrp_or_price. Do not include any explanation or text outside the JSON array.

Example format:
[
  {
    "medicine_name": "Paracetamol 500mg",
    "quantity": 100,
    "batch_number": "BN-2024-001",
    "expiry_date": "2026-06-30",
    "mrp_or_price": 25.50,
    "gst_percent": 12,
    "company_name": "Cipla Ltd"
  }
]`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, BMP) or PDF.' },
        { status: 400 }
      )
    }

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64String = Buffer.from(bytes).toString('base64')

    let mimeType = file.type
    if (!mimeType.startsWith('image/') && mimeType === 'application/pdf') {
      // For PDFs, convert the first page to image or use as-is
      // VLM can handle PDFs via file_url type
      const zai = await ZAI.create()

      const response = await zai.chat.completions.createVision({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: SCAN_PROMPT },
              { type: 'file_url', file_url: { url: `data:application/pdf;base64,${base64String}` } }
            ]
          }
        ],
        thinking: { type: 'disabled' }
      })

      const rawContent = response.choices?.[0]?.message?.content || ''
      return parseAndReturn(rawContent)
    }

    // Initialize VLM
    const zai = await ZAI.create()

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: SCAN_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64String}` } }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    })

    const rawContent = response.choices?.[0]?.message?.content || ''
    return parseAndReturn(rawContent)
  } catch (error) {
    console.error('AI Bill Scan error:', error)
    return NextResponse.json(
      { error: 'Failed to scan bill. Please try again.' },
      { status: 500 }
    )
  }
}

function parseAndReturn(rawContent: string) {
  try {
    // Try to extract JSON from the response (might be wrapped in markdown code blocks)
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0])
      if (Array.isArray(items) && items.length > 0) {
        return NextResponse.json({
          success: true,
          items,
          raw: rawContent,
        })
      }
    }

    // If parsing failed, return raw text
    return NextResponse.json({
      success: false,
      raw: rawContent,
      error: 'Could not parse structured data from the bill. Raw text is returned for manual entry.',
    })
  } catch {
    // JSON parse error - return raw text
    return NextResponse.json({
      success: false,
      raw: rawContent,
      error: 'Could not parse structured data from the bill. Raw text is returned for manual entry.',
    })
  }
}
