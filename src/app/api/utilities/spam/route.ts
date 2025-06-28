import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT DISTINCT LOWER(contract_address) as address, LOWER(TRIM(chain)) as chain
      FROM config.spam_contracts 
      ORDER BY LOWER(TRIM(chain)), LOWER(contract_address)
    `;
    return NextResponse.json({ contracts: rows });
  } catch (error) {
    console.error('Error fetching spam list:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch spam list' },
      { status: 500 }
    );
  }
} 