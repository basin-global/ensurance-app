import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { contract: string } }
) {
  try {
    // Get the pool address from certificates.general
    const { rows: [cert] } = await sql`
      SELECT pool_address
      FROM certificates.general
      WHERE contract_address = ${params.contract}
      LIMIT 1
    `

    if (!cert?.pool_address) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    }

    return NextResponse.json({
      poolAddress: cert.pool_address
    })
  } catch (error) {
    console.error('Error fetching pool details:', error)
    return NextResponse.json({ error: 'Failed to fetch pool details' }, { status: 500 })
  }
} 