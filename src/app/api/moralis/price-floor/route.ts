import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Contract address is required' }, { status: 400 });
  }

  if (!process.env.MORALIS_API_KEY) {
    console.error('MORALIS_API_KEY is not configured');
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const url = `https://deep-index.moralis.io/api/v2.2/nft/${address}/floor-price?chain=base`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-Key': process.env.MORALIS_API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Moralis API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching price floor:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch price floor' },
      { status: 500 }
    );
  }
} 