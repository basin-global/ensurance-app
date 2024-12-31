import { simpleHashApi } from '@/lib/simplehash';
import { NextResponse } from 'next/server';
import { isSpamContract } from '@/config/spamContracts';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const chain = searchParams.get('chain');
  const contractAddress = searchParams.get('contractAddress');
  const tokenId = searchParams.get('tokenId');
  const fetchAll = searchParams.get('fetchAll') === 'true';

  console.log('NFT route params:', {
    address,
    chain,
    contractAddress,
    tokenId,
    fetchAll
  });

  try {
    // Case 1: Fetch specific NFT by token ID
    if (chain && contractAddress && tokenId) {
      try {
        const response = await simpleHashApi.get(`/nfts/${chain}/${contractAddress}/${tokenId}`);
        console.log('Token fetch response:', {
          chain,
          contractAddress,
          tokenId,
          status: response.status
        });
        return NextResponse.json(response.data);
      } catch (error: any) {
        console.error('Token fetch error:', error.response?.data || error.message);
        return NextResponse.json({ 
          error: 'Failed to fetch NFT',
          details: error.response?.data || error.message
        }, { status: 500 });
      }
    }

    // Case 2: Fetch all NFTs for a contract
    if (chain && contractAddress) {
      try {
        const response = await simpleHashApi.get(`/nfts/${chain}/${contractAddress}`);
        console.log('Contract fetch response:', {
          chain,
          contractAddress,
          nftsCount: response.data.nfts?.length || 0
        });
        return NextResponse.json(response.data);
      } catch (error: any) {
        console.error('Contract fetch error:', error.response?.data || error.message);
        return NextResponse.json({ 
          error: 'Failed to fetch contract NFTs',
          details: error.response?.data || error.message
        }, { status: 500 });
      }
    }

    // Case 3: Fetch NFTs by wallet address
    if (address) {
      try {
        const params = {
          wallet_addresses: address,
          chains: chain === 'all' ? undefined : chain,
          queried_wallet_balances: 1,
          limit: 50
        };

        console.log('Wallet fetch params:', params);
        const response = await simpleHashApi.get('/nfts/owners_v2', { params });

        // Filter out spam NFTs
        const filteredNfts = response.data.nfts.filter((nft: any) => {
          const isSpam = isSpamContract(nft.chain, nft.contract_address);
          if (isSpam) {
            console.log('Filtered spam NFT:', {
              chain: nft.chain,
              contract: nft.contract_address,
              name: nft.name
            });
          }
          return !isSpam;
        });

        console.log('Wallet fetch response:', {
          address,
          totalNfts: response.data.nfts.length,
          filteredNfts: filteredNfts.length,
          spamFiltered: response.data.nfts.length - filteredNfts.length,
          hasNext: !!response.data.next
        });

        return NextResponse.json({
          ...response.data,
          nfts: filteredNfts
        });
      } catch (error: any) {
        console.error('Wallet fetch error:', error.response?.data || error.message);
        return NextResponse.json({ 
          error: 'Failed to fetch wallet NFTs',
          details: error.response?.data || error.message
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('Route error:', error);
    return NextResponse.json({ 
      error: 'API request failed',
      details: error.response?.data || error.message
    }, { status: 500 });
  }
}
