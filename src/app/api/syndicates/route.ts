import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain');
    const id = searchParams.get('id');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : 20;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string) : 1;
    const offset = (page - 1) * limit;
    
    // Build the SQL query with optional filters
    let query = `
      SELECT 
        s.contract_address as id,
        s.name,
        s.description,
        s.strategy,
        s.asset_address,
        s.chain,
        s.impact_tags,
        s.media,
        a.symbol as currency
      FROM 
        syndicates s
      JOIN 
        approved_assets a ON s.asset_address = a.contract_address AND s.chain = a.chain
    `;
    
    const whereConditions = [];
    const values: any[] = [];
    
    // Add chain filter if provided
    if (chain) {
      whereConditions.push(`s.chain = $${values.length + 1}`);
      values.push(chain);
    }
    
    // Add id filter if provided
    if (id) {
      whereConditions.push(`s.contract_address = $${values.length + 1}`);
      values.push(id);
    }
    
    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add pagination (only if not fetching by ID)
    if (!id) {
      query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit);
      values.push(offset);
    }
    
    // Execute the query
    const result = await sql.query(query, values);
    
    // Transform the data to match the expected format in the frontend
    const syndicates = result.rows.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      strategy: item.strategy,
      asset_address: item.asset_address,
      chain: item.chain,
      impact_tags: item.impact_tags,
      currency: item.currency,
      media: item.media || {},
      // For backward compatibility, use banner from media or default
      image_url: item.media?.banner || '/assets/ensurance-example.png'
    }));
    
    return NextResponse.json(syndicates);
  } catch (error) {
    console.error('Error fetching syndicates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch syndicates' },
      { status: 500 }
    );
  }
} 