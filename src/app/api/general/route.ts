import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCoin } from '@zoralabs/coins-sdk';
import { base } from 'viem/chains';

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
          // Check if market data is stale (older than 1 hour)
          const lastUpdate = cert.last_market_update ? new Date(cert.last_market_update) : null;
          const now = new Date();
          const hoursSinceUpdate = lastUpdate ? (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60) : Infinity;
          
          // Only fetch new data if it's stale
          if (hoursSinceUpdate > 1) {
            console.log(`Market data for ${cert.contract_address} is stale (${hoursSinceUpdate.toFixed(1)} hours old), fetching fresh data...`);
            
            const response = await getCoin({
              address: cert.contract_address
            });
            
            const coin = response.data?.zora20Token;
            if (!coin) return cert;

            // Update the database with fresh data
            await sql`
              UPDATE certificates.general
              SET 
                total_volume = ${coin.totalVolume || '0'},
                volume_24h = ${coin.volume24h || '0'},
                market_cap = ${coin.marketCap || '0'},
                creator_earnings = ${JSON.stringify(coin.creatorEarnings || [])},
                unique_holders = ${coin.uniqueHolders || 0},
                last_market_update = NOW()
              WHERE contract_address = ${cert.contract_address}
            `;

            return {
              ...cert,
              total_volume: coin.totalVolume || '0',
              volume_24h: coin.volume24h || '0',
              market_cap: coin.marketCap || '0',
              creator_earnings: coin.creatorEarnings || [],
              last_market_update: new Date().toISOString()
            };
          } else {
            console.log(`Market data for ${cert.contract_address} is fresh (${hoursSinceUpdate.toFixed(1)} hours old)`);
            return cert;
          }
        } catch (error) {
          console.error(`Failed to fetch market data for ${cert.contract_address}:`, error);
          return cert;
        }
      })
    );

    return NextResponse.json(certificatesWithMarketData);

  } catch (error) {
    console.error('[General Certificates API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch general certificates', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    // Get market data from Zora
    const response = await getCoin({
      address: address as `0x${string}`,
      chain: base.id
    });

    if (!response?.data?.zora20Token) {
      return NextResponse.json({ error: 'No market data available' }, { status: 404 });
    }

    const coinData = response.data.zora20Token;

    // Update market data in database
    await sql`
      UPDATE certificates.general
      SET 
        total_volume = ${coinData.totalVolume || '0'},
        volume_24h = ${coinData.volume24h || '0'},
        market_cap = ${coinData.marketCap || '0'},
        creator_earnings = ${JSON.stringify(coinData.creatorEarnings || [])},
        unique_holders = ${coinData.uniqueHolders || 0},
        last_market_update = NOW()
      WHERE contract_address = ${address}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[General Certificates API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh market data', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 