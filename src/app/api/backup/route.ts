import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    // Extract file path from DATABASE_URL env var
    // Format: "file:/path/to/db.sqlite" or "file:./db/pharmpos.db"
    const databaseUrl = process.env.DATABASE_URL || 'file:./db/pharmpos.db'
    const filePath = databaseUrl.replace(/^file:/, '')

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Database file not found. Please check your DATABASE_URL configuration.' },
        { status: 404 },
      )
    }

    const buffer = readFileSync(filePath)
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')
    const filename = `pharmpos-backup-${timestamp}.db`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json({ error: 'Failed to backup database' }, { status: 500 })
  }
}
