import { NextRequest, NextResponse } from 'next/server';
import { generalCertificates } from '@/lib/database/certificates/general';

export const dynamic = 'force-dynamic';

const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    // Add caching headers
    const headers = {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'CDN-Cache-Control': 'max-age=3600',
    };

    // Handle ETH with direct path
    if (address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return NextResponse.json({ 
        url: 'https://raw.githubusercontent.com/0xsquid/assets/main/images/tokens/eth.svg'
      }, { headers });
    }

    // 1. Check if it's one of our Zora coins
    const generalCert = await generalCertificates.getByContractAddress(address);
    if (generalCert?.token_uri) {
      const metadata = await fetch(convertIpfsUrl(generalCert.token_uri)).then(res => res.json());
      if (metadata?.image) {
        return NextResponse.json({ url: convertIpfsUrl(metadata.image) }, { headers });
      }
    }

    // 2. Try Squid chain-specific webp
    const chainId = '8453'; // Base chain ID
    const squidChainUrl = `https://raw.githubusercontent.com/0xsquid/assets/main/images/migration/webp/${chainId}_${address.toLowerCase()}.webp`;
    const squidChainResponse = await fetch(squidChainUrl);
    if (squidChainResponse.ok) {
      return NextResponse.json({ url: squidChainUrl }, { headers });
    }

    // 3. Try TrustWallet
    const trustWalletUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`;
    const trustWalletResponse = await fetch(trustWalletUrl);
    if (trustWalletResponse.ok) {
      return NextResponse.json({ url: trustWalletUrl }, { headers });
    }

    // 4. No image found
    return NextResponse.json({ url: null }, { headers });

  } catch (error) {
    console.error('Error fetching token image:', error);
    return NextResponse.json({ error: 'Failed to fetch token image' }, { status: 500 });
  }
} 