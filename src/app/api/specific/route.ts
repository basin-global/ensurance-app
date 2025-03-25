import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chain = searchParams.get('chain');
  const contractAddress = searchParams.get('contractAddress');
  const limit = parseInt(searchParams.get('limit') || '20');
  const page = parseInt(searchParams.get('page') || '1');
  const offset = (page - 1) * limit;

  try {
    // Build conditions
    const conditions = [];
    const params = [];
    
    if (chain) {
      conditions.push(`chain = $${params.length + 1}`);
      params.push(chain);
    }
    if (contractAddress) {
      conditions.push(`contract_address = $${params.length + 1}`);
      params.push(contractAddress);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT * FROM ensurance_specific_view
      ${whereClause}
      ORDER BY chain, token_id
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    const result = await sql.query(query, [...params, limit, offset]);
    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('[Specific Certificates API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch specific certificates', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 