import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  if (!process.env.ALCHEMY_API_KEY) {
    console.error('ALCHEMY_API_KEY is not configured');
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const url = `https://api.g.alchemy.com/data/v1/${process.env.ALCHEMY_API_KEY}/assets/nfts/by-address`;
  
  try {
    console.log('Fetching NFTs for address:', address);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        addresses: [{
          address: address,
          networks: ['base-mainnet']
        }],
        withMetadata: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Alchemy API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch NFTs' },
      { status: 500 }
    );
  }
} 