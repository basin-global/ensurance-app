import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function POST(request: Request) {
  try {
    const { accountName, groupName } = await request.json()
    
    if (!accountName || !groupName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Clean group name (remove leading dot if present)
    const cleanGroupName = groupName.startsWith('.') ? groupName.substring(1) : groupName
    const tableName = `accounts_${cleanGroupName}`
    const fullAccountName = `${accountName}.${cleanGroupName}`

    try {
      // Check if account name exists in the database
      const result = await sql.query(
        `SELECT account_name FROM members.${tableName} WHERE account_name = $1 OR full_account_name = $2 LIMIT 1`,
        [accountName, fullAccountName]
      )

      const isAvailable = result.rows.length === 0

      return NextResponse.json({
        available: isAvailable,
        accountName,
        groupName,
        fullAccountName
      })
    } catch (dbError) {
      console.error(`Error checking name availability in ${tableName}:`, dbError)
      // If table doesn't exist, name is available
      return NextResponse.json({
        available: true,
        accountName,
        groupName,
        fullAccountName
      })
    }
  } catch (error) {
    console.error('Error checking name availability:', error)
    return NextResponse.json(
      { error: 'Failed to check name availability' },
      { status: 500 }
    )
  }
} 