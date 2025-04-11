import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : 20;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string) : 1;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const values: any[] = [];
    
    // Add name filter if provided
    if (name) {
      whereClause = 'WHERE name = $1';
      // Convert hyphenated URL name back to spaces for DB query
      values.push(name.replace(/-/g, ' '));
    }
    
    // Build the SQL query
    const query = `
      SELECT 
        name,
        tagline,
        description,
        asset_address,
        chain,
        media,
        image_url,
        natural_capital_stocks,
        natural_capital_flows,
        nat_cap_rate
      FROM syndicates.syndicates
      ${whereClause}
      ORDER BY name
      ${!name ? `LIMIT $${values.length + 1} OFFSET $${values.length + 2}` : ''}
    `;

    // Add pagination values if not fetching by name
    if (!name) {
      values.push(limit);
      values.push(offset);
    }
    
    // Execute the query
    const result = await sql.query(query, values);
    
    // Transform the data to match the expected format in the frontend
    const syndicates = result.rows.map(item => ({
      name: item.name,
      tagline: item.tagline,
      description: item.description,
      asset_address: item.asset_address,
      chain: item.chain || 'base',
      media: item.media || {},
      image_url: item.image_url,
      natural_capital_stocks: item.natural_capital_stocks || [],
      natural_capital_flows: item.natural_capital_flows || [],
      nat_cap_rate: item.nat_cap_rate || 0
    }));

    console.log('API Response:', syndicates);
    
    return NextResponse.json(syndicates);
  } catch (error) {
    console.error('Error fetching syndicates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch syndicates' },
      { status: 500 }
    );
  }
} 