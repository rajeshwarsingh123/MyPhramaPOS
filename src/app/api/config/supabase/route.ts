import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { url, anonKey, serviceRoleKey } = await request.json()

    if (!url || !anonKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'All credentials (URL, Anon Key, Service Role Key) are required' },
        { status: 400 }
      )
    }

    const envPath = path.join(process.cwd(), '.env')
    let envContent = ''

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')
    }

    const updates = {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    }

    let lines = envContent.split('\n')
    const updatedKeys = new Set()

    lines = lines.map((line) => {
      for (const [key, value] of Object.entries(updates)) {
        if (line.startsWith(`${key}=`)) {
          updatedKeys.add(key)
          return `${key}="${value}"`
        }
      }
      return line
    })

    for (const [key, value] of Object.entries(updates)) {
      if (!updatedKeys.has(key)) {
        lines.push(`${key}="${value}"`)
      }
    }

    fs.writeFileSync(envPath, lines.join('\n'), 'utf8')

    return NextResponse.json({ success: true, message: 'Supabase configuration saved to .env' })
  } catch (error) {
    console.error('Failed to save Supabase config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
