import { createNew1155Token } from '@zoralabs/protocol-sdk'
import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { base } from 'viem/chains'
import { USDC_ADDRESS } from './config/ERC20'
import { specificContract, type TokenMetadata } from './config/ERC1155'
import type { Address } from 'viem'
import { publicClient } from './config/ERC20'
import type { ERC20MintConfig } from './config/ERC20'
import { isAppAdmin } from '@/config/admin'
import { sql } from '@vercel/postgres'
import { type Hash } from 'viem'
import type { TokenMetadata as TokenMetadataType, SpecificMetadata } from './types'

// Constants
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`

// URL generation helper
const getMetadataUrl = (tokenId: string) => 
  `/api/metadata/${specificContract.address}/${tokenId}`;

// ABI for reading nextTokenId
const CONTRACT_ABI = [{
  name: 'nextTokenId',
  type: 'function',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ type: 'uint256' }]
}] as const

/**
 * Get the next token ID that will be minted
 */
export async function getNextTokenId(): Promise<string> {
  const nextTokenId = await publicClient.readContract({
    address: specificContract.address,
    abi: CONTRACT_ABI,
    functionName: 'nextTokenId'
  })
  
  return nextTokenId.toString()
}

export type CreateTokenStatus = {
  step: 'creating-token' | 'uploading-media' | 'storing-metadata' | 'complete' | 'error'
  error?: string
  tokenId?: string
  txHash?: `0x${string}`
  mediaUrl?: string
}

export type CreateTokenParams = {
  metadata: TokenMetadata
  mediaFile: File
  erc20Config?: {
    currency: `0x${string}`
    pricePerToken: bigint
    payoutRecipient: `0x${string}`
  }
  creatorAccount: `0x${string}`
  onStatus: (status: CreateTokenStatus) => void
}

/**
 * Uploads media files and returns the URLs
 */
export async function uploadTokenMedia({
  mediaFile,
  thumbnailFile,
  tokenId,
  onStatus
}: {
  mediaFile: File
  thumbnailFile?: File
  tokenId: string
  onStatus?: (status: CreateTokenStatus) => void
}) {
  try {
    // Update status: Uploading media
    onStatus?.({
      step: 'uploading-media',
      tokenId
    })

    // Create form data
    const formData = new FormData()
    formData.append('file', mediaFile)
    formData.append('tokenId', tokenId)
    formData.append('metadata', JSON.stringify({
      contract_address: specificContract.address,
      name: '',  // These will be updated later in finalizeToken
      description: ''
    }))

    // Upload media and store initial metadata
    const response = await fetch('/api/specific', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload file')
    }

    const { mediaUrl } = await response.json()
    return { mediaUrl }
  } catch (error) {
    onStatus?.({
      step: 'uploading-media',
      tokenId,
      error: error instanceof Error ? error.message : 'Failed to upload media'
    })
    throw error
  }
}

/**
 * Creates a new token on our specific contract using ERC20 minting strategy
 */
export async function createToken({
  metadata,
  mediaFile,
  erc20Config,
  creatorAccount,
  onStatus
}: CreateTokenParams): Promise<{
  tokenId: bigint
  parameters: {
    abi: any
    functionName: string
    args: any[]
    address: `0x${string}`
  }
}> {
  try {
    onStatus({
      step: 'creating-token'
    })

    // Get next token ID
    const nextTokenId = await getNextTokenId()

    // Create token on-chain
    const result = await createNew1155Token({
      contractAddress: specificContract.address,
      token: {
        tokenMetadataURI: getMetadataUrl(nextTokenId),
        salesConfig: {
          type: "erc20Mint",
          currency: erc20Config?.currency ?? ZERO_ADDRESS,
          pricePerToken: erc20Config?.pricePerToken ?? BigInt(0),
          maxTokensPerAddress: BigInt(0),
          saleEnd: BigInt(0),
          saleStart: BigInt(Math.floor(Date.now() / 1000))
        }
      },
      account: creatorAccount,
      chainId: base.id
    })

    // Update status: Token created
    onStatus?.({
      step: 'creating-token',
      tokenId: result.tokenId.toString()
    })

    // Return the result for transaction submission
    return {
      tokenId: result.tokenId,
      parameters: result.parameters
    }
  } catch (error) {
    onStatus?.({
      step: 'error',
      error: error instanceof Error ? error.message : 'Failed to create token'
    })
    throw error
  }
}

/**
 * Uploads media and stores metadata for a token after it has been created on-chain
 */
export async function finalizeToken({
  tokenId,
  metadata,
  mediaFile,
  onStatus
}: {
  tokenId: bigint
  metadata: TokenMetadata
  mediaFile: File
  onStatus?: (status: CreateTokenStatus) => void
}): Promise<void> {
  try {
    // Update status: Uploading media and storing metadata
    onStatus?.({
      step: 'storing-metadata',
      tokenId: tokenId.toString()
    });

    // Create form data
    const formData = new FormData();
    formData.append('file', mediaFile);
    formData.append('tokenId', tokenId.toString());
    formData.append('metadata', JSON.stringify({
      contract_address: specificContract.address,
      name: metadata.name,
      description: metadata.description
    }));

    // Upload media and store metadata
    const response = await fetch('/api/specific', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to store metadata');
    }

    const { mediaUrl } = await response.json();

    // Update status: Complete
    onStatus?.({
      step: 'complete',
      tokenId: tokenId.toString(),
      mediaUrl
    });
  } catch (error) {
    onStatus?.({
      step: 'error',
      error: error instanceof Error ? error.message : 'Failed to finalize token'
    })
    throw error
  }
} 