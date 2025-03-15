import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'general' or 'specific' or null for both
  const chain = searchParams.get('chain');
  const contractAddress = searchParams.get('contractAddress');
  const limit = parseInt(searchParams.get('limit') || '20');
  const page = parseInt(searchParams.get('page') || '1');
  const offset = (page - 1) * limit;

  try {
    // Build common conditions
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

    if (type === 'general') {
      const query = `
        SELECT *, 'general' as cert_type FROM ensurance_general
        ${whereClause}
        ORDER BY chain, contract_address
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      const result = await sql.query(query, [...params, limit, offset]);
      return NextResponse.json(result.rows);

    } else if (type === 'specific') {
      const query = `
        SELECT *, 'specific' as cert_type FROM ensurance_specific_view
        ${whereClause}
        ORDER BY chain, token_id
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      const result = await sql.query(query, [...params, limit, offset]);
      return NextResponse.json(result.rows);

    } else {
      // If no type specified, return both types
      const query = `
        (
          SELECT *, 'general' as cert_type FROM ensurance_general
          ${whereClause}
        )
        UNION ALL
        (
          SELECT *, 'specific' as cert_type FROM ensurance_specific_view
          ${whereClause}
        )
        ORDER BY chain, cert_type, contract_address
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      const result = await sql.query(query, [...params, limit, offset]);
      return NextResponse.json(result.rows);
    }

  } catch (error) {
    console.error('[Certificates API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch certificates', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 