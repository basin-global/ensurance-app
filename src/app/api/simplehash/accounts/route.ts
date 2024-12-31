import { simpleHashApi } from '@/lib/simplehash';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const contractAddress = searchParams.get('contractAddress');

  console.log('SimpleHash API - Incoming request params:', { address, contractAddress });

  console.log('SIMPLEHASH URL >>>', 
    `${simpleHashApi.defaults.baseURL}/nfts/owners?chains=base&wallet_addresses=${address}&contract_addresses=${contractAddress}`
  );

  try {
    if (address && contractAddress) {
      try {
        const params = {
          wallet_addresses: address,
          chains: 'base',
          contract_addresses: contractAddress
        };

        const fullUrl = `${simpleHashApi.defaults.baseURL}/nfts/owners?chains=base&wallet_addresses=${address}&contract_addresses=${contractAddress}`;
        console.log('SimpleHash API - Full URL being called:', fullUrl);
        console.log('SimpleHash API - Headers:', simpleHashApi.defaults.headers);

        const response = await simpleHashApi.get('/nfts/owners', { params });
        
        console.log('SimpleHash API - Raw Response Status:', response.status);
        console.log('SimpleHash API - Raw Response Data:', JSON.stringify(response.data, null, 2));
        
        console.log('SimpleHash API - NFT Names Sample:', response.data.nfts?.slice(0, 3).map((nft: any) => ({
          name: nft.name,
          collection_name: nft.collection?.name,
          token_id: nft.token_id,
          raw_name: nft
        })));

        const nfts = response.data.nfts;
        console.log('SimpleHash API - Filtered NFTs:', JSON.stringify(nfts, null, 2));

        return NextResponse.json({
          ...response.data,
          nfts
        });
      } catch (error: any) {
        console.error('SimpleHash API - Error Details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: {
            url: error.config?.url,
            params: error.config?.params,
            headers: error.config?.headers
          }
        });
        return NextResponse.json({ 
          error: 'Failed to fetch wallet NFTs',
          details: error.response?.data || error.message
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('SimpleHash API - Route error:', error);
    return NextResponse.json({ 
      error: 'API request failed',
      details: error.response?.data || error.message
    }, { status: 500 });
  }
}
