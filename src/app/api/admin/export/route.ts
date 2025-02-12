import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { headers } from 'next/headers'
import { isAppAdmin } from '@/config/admin'
import { getAddress } from 'viem'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const headersList = headers()
    const address = headersList.get('x-address')
    
    if (!address || !isAppAdmin(getAddress(address))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { table, columns } = await request.json()

    if (!table || !columns || !columns.length) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Validate table name (only allow alphanumeric and underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      )
    }

    // Validate column names
    if (!columns.every((col: string) => /^[a-zA-Z0-9_]+$/.test(col))) {
      return NextResponse.json(
        { error: 'Invalid column name' },
        { status: 400 }
      )
    }

    // Get the data
    const columnList = columns.join(', ')
    const query = `
      SELECT ${columnList}
      FROM "${table}"
      ORDER BY id
    `
    
    const result = await sql.query(query)
    
    // Convert to CSV
    const csvRows = [
      columns.join(','), // Header row
      ...result.rows.map(row => 
        columns.map(col => {
          const value = row[col]
          if (value === null) return ''
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ]
    
    const csv = csvRows.join('\n')

    // Return as downloadable file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${table}-export.csv"`
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
} 