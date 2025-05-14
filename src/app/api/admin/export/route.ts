import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { isAppAdmin } from '@/config/admin'
import { exportTableData, getExportableTables } from '@/lib/database/admin/export'

export const dynamic = 'force-dynamic'

// Get available tables and their columns
export async function GET(request: Request) {
  try {
    // Check admin access
    const headersList = headers()
    const address = headersList.get('x-address') || undefined
    if (!isAppAdmin(address)) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get tables info
    const tables = await getExportableTables()
    return NextResponse.json(tables)

  } catch (error) {
    console.error('Get tables error:', error)
    return new NextResponse('Failed to get tables', { status: 500 })
  }
}

// Export table data
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const headersList = headers()
    const address = headersList.get('x-address') || undefined
    if (!isAppAdmin(address)) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get request data
    const body = await request.json()
    const { table, columns } = body

    if (!table || !columns || !Array.isArray(columns)) {
      return new NextResponse('Invalid request', { status: 400 })
    }

    // Get data
    const data = await exportTableData(table, columns)

    // Convert to CSV
    const csv = convertToCSV(data)

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${table}-export.csv"`
      }
    })

  } catch (error: any) {
    console.error('Export error:', error)
    return new NextResponse(error.message || 'Export failed', { status: 500 })
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const rows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle special cases and escaping
        if (value === null || value === undefined) return ''
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
        return value
      }).join(',')
    )
  ]
  
  return rows.join('\n')
} 