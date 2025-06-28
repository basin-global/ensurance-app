import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT DISTINCT LOWER(contract_address) as address, LOWER(TRIM(chain)) as chain
      FROM config.ineligible_721 
      ORDER BY LOWER(TRIM(chain)), LOWER(contract_address)
    `;
    return NextResponse.json({ contracts: rows });
  } catch (error) {
    console.error('Error fetching ineligible list:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ineligible list' },
      { status: 500 }
    );
  }
} 