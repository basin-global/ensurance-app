import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT LOWER(COALESCE(contract_address, '')) as address, LOWER(COALESCE(TRIM(chain), '')) as chain
      FROM config.ineligible_721 
      WHERE contract_address IS NOT NULL AND contract_address != '' 
        AND chain IS NOT NULL AND chain != ''
      ORDER BY LOWER(COALESCE(TRIM(chain), '')), LOWER(COALESCE(contract_address, ''))
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