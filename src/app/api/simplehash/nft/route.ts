import { NextResponse } from 'next/server'
import { fetchNFTsByAddress, fetchNFTDetails, fetchNFTsByContract } from '@/lib/simplehash'
import { isSpamContract } from '@/config/spamContracts'

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chain = searchParams.get('chain')
  const contractAddress = searchParams.get('contractAddress')
  const tokenId = searchParams.get('tokenId')
  const address = searchParams.get('address')

  return NextResponse.json({
    message: "API migration in progress - NFT functionality will be restored soon",
    nfts: [],
    next: null,
    previous: null
  })
}
