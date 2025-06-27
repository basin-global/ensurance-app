import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT DISTINCT LOWER(contract_address) as address 
      FROM config.spam_contracts 
      WHERE LOWER(TRIM(chain)) = 'base'
      ORDER BY LOWER(contract_address)
    `;
    return NextResponse.json({ addresses: rows.map(r => r.address) });
  } catch (error) {
    console.error('Error fetching spam list:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch spam list' },
      { status: 500 }
    );
  }
} 