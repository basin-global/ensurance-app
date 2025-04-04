import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { base } from 'viem/chains';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    // Check all proceeds tables for this address on Base chain
    const result = await sql`
      WITH address_info AS (
        SELECT 'split' as type, name FROM proceeds.splits 
        WHERE contract_address = ${address} AND chain = ${base.name}
        UNION ALL
        SELECT 'stream' as type, name FROM proceeds.streams 
        WHERE contract_address = ${address} AND chain = ${base.name}
        UNION ALL
        SELECT 'swapper' as type, name FROM proceeds.swappers 
        WHERE contract_address = ${address} AND chain = ${base.name}
        UNION ALL
        SELECT 'team' as type, name FROM proceeds.teams 
        WHERE contract_address = ${address} AND chain = ${base.name}
      )
      SELECT type, name FROM address_info LIMIT 1;
    `;

    return NextResponse.json({
      type: result.rows[0]?.type || 'account',
      name: result.rows[0]?.name || null
    });

  } catch (error) {
    console.error('Error fetching recipient data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipient data' },
      { status: 500 }
    );
  }
} 