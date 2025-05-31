import { NextRequest, NextResponse } from 'next/server';
import { generalCertificates } from '@/lib/database/certificates/general';
import { accounts } from '@/lib/database/accounts';

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
    const accountName = searchParams.get('account');

    if (!address && !accountName) {
      return NextResponse.json({ error: 'Address or account name is required' }, { status: 400 });
    }

    // Add caching headers
    const headers = {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'CDN-Cache-Control': 'max-age=3600',
    };

    // Handle account images
    if (accountName) {
      const parts = accountName.split('.');
      if (parts.length === 2) {
        const [tokenId, group] = parts;
        // First try the account's specific image
        const accountImageUrl = `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${group}/${tokenId}.png`;
        const accountResponse = await fetch(accountImageUrl);
        if (accountResponse.ok) {
          return NextResponse.json({ url: accountImageUrl }, { headers });
        }
        // Then try group's default image
        const groupImageUrl = `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${group}/0.png`;
        const groupResponse = await fetch(groupImageUrl);
        if (groupResponse.ok) {
          return NextResponse.json({ url: groupImageUrl }, { headers });
        }
        // Finally, use global default
        return NextResponse.json({ url: 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/default.png' }, { headers });
      }
    }

    // Handle ETH with direct path
    if (address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return NextResponse.json({ 
        url: 'https://raw.githubusercontent.com/0xsquid/assets/main/images/tokens/eth.svg'
      }, { headers });
    }

    // 1. Check if it's one of our Zora coins
    if (address) {
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
    }

    // 4. No image found
    return NextResponse.json({ url: null }, { headers });

  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
} 