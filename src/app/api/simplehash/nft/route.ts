import { NextResponse } from 'next/server'
import { fetchNFTsByAddress, fetchNFTDetails, fetchNFTsByContract } from '@/lib/simplehash'
import { isSpamContract } from '@/config/spamContracts'

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  const chain = searchParams.get('chain')
  const contractAddress = searchParams.get('contractAddress')
  const tokenId = searchParams.get('tokenId')
  const contractIds = searchParams.get('contract_ids')

  console.log('NFT route called with:', { 
    params: { address, chain, contractAddress, tokenId, contractIds }
  })

  try {
    // Case 1: Fetch specific NFT by token ID
    if (chain && contractAddress && tokenId) {
      const data = await fetchNFTDetails(chain, contractAddress, tokenId)
      return NextResponse.json(data)
    }

    // Case 2: Fetch all NFTs for a contract
    if (chain && contractAddress) {
      const data = await fetchNFTsByContract(chain, contractAddress)
      return NextResponse.json(data)
    }

    // Case 3: Fetch NFTs by wallet address
    if (address) {
      console.log('Fetching NFTs for wallet:', address)
      console.log('Chain param from URL:', chain)
      console.log('Contract IDs from URL:', contractIds)

      const data = await fetchNFTsByAddress(
        address,
        chain && chain !== 'all' ? chain : undefined,
        contractIds?.split(',')
      )

      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  } catch (error: any) {
    console.error('NFT route error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    })

    // Check for specific error types
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json({ 
        error: 'Connection refused',
        details: 'Could not connect to SimpleHash API'
      }, { status: 503 })
    }

    if (error.response?.status === 401) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Invalid API key'
      }, { status: 401 })
    }

    return NextResponse.json({ 
      error: 'API request failed',
      details: error.message
    }, { status: 500 })
  }
}
