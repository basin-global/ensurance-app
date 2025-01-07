import { NextResponse } from 'next/server';
import { ensurance } from '@/lib/database/queries/ensurance';
import { headers } from 'next/headers';
import { getSiteContext } from '@/lib/config/routes';

export async function GET(request: Request) {
  const headersList = headers();
  const host = headersList.get('host') || '';
  const siteContext = getSiteContext(host, new URL(request.url).pathname);
  
  const { searchParams } = new URL(request.url);
  const chain = searchParams.get('chain');
  const tokenId = searchParams.get('tokenId');

  console.log('[Ensurance API] Request details:', {
    siteContext,
    chain,
    tokenId,
    host,
    pathname: new URL(request.url).pathname
  });

  try {
    // Get single token details
    if (chain && tokenId) {
      const certificate = await ensurance.getByChainAndTokenId(chain, tokenId);
      if (!certificate) {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      }
      return NextResponse.json(certificate);
    }

    // Get all certificates for a specific chain
    if (chain && chain !== 'all') {
      const certificates = await ensurance.getByChain(chain);
      return NextResponse.json(certificates);
    }

    // Get all certificates across all chains
    const certificates = await ensurance.getAll();
    return NextResponse.json(certificates);

  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json({ error: 'Failed to fetch certificate data' }, { status: 500 });
  }
} 