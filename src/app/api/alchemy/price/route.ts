import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Get the symbol from query params, default to ETH
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')?.toLowerCase() || 'eth'

    console.log('Fetching price for symbol:', symbol)

    // Map symbol to CoinGecko ID
    const symbolToId: { [key: string]: string } = {
      'eth': 'ethereum',
      'btc': 'bitcoin',
      'usdc': 'usd-coin',
      'usdt': 'tether',
      // Add more mappings as needed
    }

    const coinId = symbolToId[symbol] || symbol

    // Get token price from CoinGecko
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_last_updated_at=true`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('CoinGecko API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('CoinGecko price response:', data)

    const price = data[coinId]?.usd
    const lastUpdated = data[coinId]?.last_updated_at

    if (!price) {
      console.error('No price in response:', data)
      throw new Error('No price found in response')
    }

    return NextResponse.json({ 
      price: Number(price),
      symbol,
      lastUpdated
    })
  } catch (error) {
    console.error('Error fetching token price:', error)
    return NextResponse.json(
      { error: 'Failed to fetch token price', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 