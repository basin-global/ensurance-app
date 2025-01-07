import { NextResponse } from 'next/server'
import { fetchNFTsByAddress, fetchNFTDetails, fetchNFTsByContract } from '@/lib/simplehash'
import { isSpamContract } from '@/config/spamContracts'
import { headers } from 'next/headers'
import { getSiteContext } from '@/lib/config/routes'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  const chain = searchParams.get('chain')
  const contractAddress = searchParams.get('contractAddress')
  const tokenId = searchParams.get('tokenId')

  const headersList = headers()
  const host = headersList.get('host') || ''
  const siteContext = getSiteContext(host, new URL(request.url).pathname)

  console.log('NFT route called with:', { 
    params: { address, chain, contractAddress, tokenId },
    context: { host, siteContext }
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
      console.log('SimpleHash API Key present:', !!process.env.SIMPLEHASH_API_KEY)
      
      // If chain is 'all' or not provided, let fetchNFTsByAddress use its default ACTIVE_CHAINS
      const chainsToUse = chain && chain !== 'all' ? chain : undefined
      console.log('Chains being passed to fetchNFTsByAddress:', chainsToUse || 'using default ACTIVE_CHAINS')
      
      try {
        const data = await fetchNFTsByAddress(address, chainsToUse)
        
        console.log('Raw NFT data received:', {
          totalNFTs: data.nfts?.length || 0,
          hasNext: !!data.next
        })

        // Filter out spam NFTs
        const filteredNfts = data.nfts.filter((nft: any) => {
          const isSpam = isSpamContract(nft.chain, nft.contract_address)
          if (isSpam) {
            console.log('Filtered spam NFT:', { chain: nft.chain, contract: nft.contract_address })
          }
          return !isSpam
        })

        console.log('Filtered NFTs:', {
          before: data.nfts?.length || 0,
          after: filteredNfts.length
        })

        return NextResponse.json({
          ...data,
          nfts: filteredNfts
        })
      } catch (error: any) {
        console.error('SimpleHash API error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        })
        throw error
      }
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
