import { NextResponse } from 'next/server';
import { generalCertificates } from '@/lib/database/certificates/general';

const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const symbol = searchParams.get('symbol');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    // 1. Check if it's one of our Zora coins
    const generalCert = await generalCertificates.getByContractAddress(address);
    if (generalCert?.token_uri) {
      const metadata = await fetch(convertIpfsUrl(generalCert.token_uri)).then(res => res.json());
      if (metadata?.image) {
        return NextResponse.json({ url: convertIpfsUrl(metadata.image) });
      }
    }

    // 2. Try Squid chain-specific webp
    const chainId = '8453'; // Base chain ID
    const squidChainUrl = `https://raw.githubusercontent.com/0xsquid/assets/main/images/migration/webp/${chainId}_${address.toLowerCase()}.webp`;
    const squidChainResponse = await fetch(squidChainUrl);
    if (squidChainResponse.ok) {
      return NextResponse.json({ url: squidChainUrl });
    }

    // 3. Try Squid symbol-based SVG
    if (symbol) {
      const squidSymbolUrl = `https://raw.githubusercontent.com/0xsquid/assets/main/images/tokens/${symbol.toLowerCase()}.svg`;
      const squidSymbolResponse = await fetch(squidSymbolUrl);
      if (squidSymbolResponse.ok) {
        return NextResponse.json({ url: squidSymbolUrl });
      }
    }

    // 4. Try TrustWallet
    const trustWalletUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`;
    const trustWalletResponse = await fetch(trustWalletUrl);
    if (trustWalletResponse.ok) {
      return NextResponse.json({ url: trustWalletUrl });
    }

    // 5. No image found
    return NextResponse.json({ url: null });

  } catch (error) {
    console.error('Error fetching token image:', error);
    return NextResponse.json({ error: 'Failed to fetch token image' }, { status: 500 });
  }
} 