import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100');
  const page = parseInt(searchParams.get('page') || '1');
  const offset = (page - 1) * limit;

  try {
    const query = `
      SELECT * FROM certificates.general
      WHERE chain = 'base'
      ORDER BY name, contract_address
      LIMIT $1 OFFSET $2
    `;
    
    const result = await sql.query(query, [limit, offset]);
    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('[General Certificates API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch general certificates', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 