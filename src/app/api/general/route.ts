import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCoin } from '@zoralabs/coins-sdk';

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100');
  const page = parseInt(searchParams.get('page') || '1');
  const offset = (page - 1) * limit;

  try {
    // Get certificates from DB
    const query = `
      SELECT * FROM certificates.general
      WHERE chain = 'base'
      ORDER BY name, contract_address
      LIMIT $1 OFFSET $2
    `;
    
    const result = await sql.query(query, [limit, offset]);
    
    // Get market data for each certificate
    const certificatesWithMarketData = await Promise.all(
      result.rows.map(async (cert) => {
        try {
          const response = await getCoin({
            address: cert.contract_address
          })
          
          const coin = response.data?.zora20Token
          if (!coin) return cert

          return {
            ...cert,
            total_volume: coin.totalVolume || '0',
            volume_24h: coin.volume24h || '0',
            market_cap: coin.marketCap || '0',
            creator_earnings: coin.creatorEarnings || [],
            last_market_update: new Date().toISOString()
          }
        } catch (error) {
          console.error(`Failed to fetch market data for ${cert.contract_address}:`, error)
          return cert
        }
      })
    )

    return NextResponse.json(certificatesWithMarketData);

  } catch (error) {
    console.error('[General Certificates API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch general certificates', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 