import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const PRESCRIPTION_PROMPT = `You are an expert pharmacy assistant AI. Analyze this prescription image carefully.

Extract ALL medicines/items visible on this prescription. For each medicine, provide:
- name: the exact medicine name (generic or brand name as written)
- dosage: the dosage/strength (e.g., "500mg", "10mg", "200ml", "1-0-1")
- quantity: the quantity prescribed (number of units)
- notes: any additional instructions (e.g., "after food", "twice daily", "for 5 days", "as needed")

If the prescription includes:
- Doctor's name, add it as doctor_name field
- Patient's name, add it as patient_name field
- Date, add it as prescription_date field

Return ONLY a valid JSON object with a "medicines" array. Do NOT include any explanation or text outside the JSON.

Example format:
{
  "medicines": [
    {
      "name": "Amoxicillin 500mg",
      "dosage": "500mg",
      "quantity": 10,
      "notes": "1-0-1 for 5 days after food"
    },
    {
      "name": "Paracetamol",
      "dosage": "500mg",
      "quantity": 20,
      "notes": "SOS for fever"
    }
  ],
  "doctor_name": "Dr. Smith",
  "patient_name": "John Doe",
  "prescription_date": "2025-01-15"
}

If the image is not a prescription or no medicines can be identified, return:
{
  "medicines": [],
  "error": "No prescription content detected"
}`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, BMP).' },
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
    const mimeType = file.type

    // Initialize VLM and analyze the prescription
    const zai = await ZAI.create()

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PRESCRIPTION_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64String}` } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const rawContent = response.choices?.[0]?.message?.content || ''
    return parseAndReturn(rawContent)
  } catch (error) {
    console.error('AI Prescription Scan error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze prescription. Please try again.' },
      { status: 500 }
    )
  }
}

function parseAndReturn(rawContent: string) {
  try {
    // Try to extract JSON object from the response (might be wrapped in markdown code blocks)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0])

      if (data.error) {
        return NextResponse.json({
          success: false,
          medicines: [],
          raw: rawContent,
          error: data.error,
        })
      }

      if (data.medicines && Array.isArray(data.medicines) && data.medicines.length > 0) {
        // Normalize medicine fields
        const medicines = data.medicines.map(
          (med: Record<string, unknown>, index: number) => ({
            id: `scan_${index}`,
            name: String(med.name || med.medicine_name || 'Unknown Medicine'),
            dosage: String(med.dosage || med.strength || med.dose || ''),
            quantity: Number(med.quantity || med.qty || 1),
            notes: String(med.notes || med.instructions || med.directions || ''),
          })
        )

        return NextResponse.json({
          success: true,
          medicines,
          doctor_name: data.doctor_name || data.doctorName || null,
          patient_name: data.patient_name || data.patientName || null,
          prescription_date: data.prescription_date || data.prescriptionDate || null,
          raw: rawContent,
        })
      }

      return NextResponse.json({
        success: false,
        medicines: [],
        raw: rawContent,
        error: 'No medicines detected in the prescription image.',
      })
    }

    // If parsing failed, return raw text
    return NextResponse.json({
      success: false,
      medicines: [],
      raw: rawContent,
      error: 'Could not parse prescription data. The image may be unclear.',
    })
  } catch {
    // JSON parse error - return raw text
    return NextResponse.json({
      success: false,
      medicines: [],
      raw: rawContent,
      error: 'Could not parse prescription data. Please try again with a clearer image.',
    })
  }
}
