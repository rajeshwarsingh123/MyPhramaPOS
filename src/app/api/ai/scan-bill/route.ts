import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const SCAN_PROMPT = `This is a pharmacy supplier bill/invoice. Extract the following information:
- supplier_name: The name of the wholesale supplier/company
- invoice_number: The bill or invoice number
- invoice_date: The date of the invoice (in YYYY-MM-DD format if possible)

Also extract all medicines/items listed. For each item, provide:
- medicine_name: exact name on bill
- quantity: number
- batch_number: if visible
- expiry_date: if visible, in YYYY-MM-DD format
- mrp_or_price: the price per unit
- gst_percent: if visible
- any other details visible (like company, strength, pack_size).

Return ONLY a valid JSON object with the following structure:
{
  "supplier_name": "Supplier Name",
  "invoice_number": "INV-123",
  "invoice_date": "2024-05-01",
  "items": [
    {
      "medicine_name": "Paracetamol 500mg",
      "quantity": 100,
      "batch_number": "BN-001",
      "expiry_date": "2026-06-30",
      "mrp_or_price": 25.50,
      "gst_percent": 12
    }
  ]
}

Do not include any explanation or text outside the JSON object.`

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
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0])
      if (data && (data.items || data.supplier_name)) {
        return NextResponse.json({
          success: true,
          data,
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
