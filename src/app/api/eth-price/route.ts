import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 } // Cache for 60 seconds
      }
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const price = data.ethereum?.usd

    if (!price) {
      throw new Error('Invalid price data from CoinGecko')
    }

    return NextResponse.json({
      price,
      symbol: 'eth',
      lastUpdated: Math.floor(Date.now() / 1000)
    })
  } catch (error) {
    console.error('Error fetching ETH price:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ETH price' },
      { status: 500 }
    )
  }
} 