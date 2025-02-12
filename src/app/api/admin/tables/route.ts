import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { headers } from 'next/headers'
import { isAppAdmin } from '@/config/admin'
import { getAddress } from 'viem'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const headersList = headers()
    const address = headersList.get('x-address')
    
    if (!address || !isAppAdmin(getAddress(address))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all tables
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `

    // Get columns for each table
    const tablesWithColumns = await Promise.all(
      tablesResult.rows.map(async ({ table_name }) => {
        const columnsResult = await sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = ${table_name}
          ORDER BY ordinal_position;
        `
        
        return {
          table_name,
          columns: columnsResult.rows.map(row => row.column_name)
        }
      })
    )

    return NextResponse.json(tablesWithColumns)
  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    )
  }
} 