import { fetchENSName } from '@/lib/simplehash';
import { NextResponse } from 'next/server';

console.log('ENS Route file loaded');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const name = searchParams.get('name');

  console.log('ENS API Route - Received request:', { address, name });

  if (!address && !name) {
    console.log('ENS API Route - No address or name provided');
    return NextResponse.json({ error: 'Address or ENS name is required' }, { status: 400 });
  }

  try {
    if (address) {
      // @keep Address to ENS
      console.log('ENS API Route - Fetching ENS for address:', address);
      const ensName = await fetchENSName(address);
      return NextResponse.json({ name: ensName });
    } else {
      // @keep ENS to Address
      console.log('ENS API Route - Fetching address for ENS:', name);
      const response = await fetch(
        `https://api.simplehash.com/api/v0/ens/lookup?ens_names=${name}`,
        {
          headers: {
            'X-API-KEY': process.env.SIMPLEHASH_API_KEY || '',
            'accept': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('ENS API Route - Simplehash response:', data);

      if (data && data[0] && data[0].address) {
        return NextResponse.json({ address: data[0].address });
      } else {
        return NextResponse.json({ error: 'ENS name not found' }, { status: 404 });
      }
    }
  } catch (error) {
    console.error('ENS API Route - Error:', error);
    return NextResponse.json({ error: 'Failed to fetch ENS data' }, { status: 500 });
  }
} 