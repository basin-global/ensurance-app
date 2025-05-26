import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { base } from 'viem/chains'
import { 
  CONTRACTS, 
  CONTRACT_FUNCTIONS, 
  ABIS, 
  type TokenMetadata, 
  type ERC20MintConfig,
  MAX_SUPPLY_OPEN_EDITION,
  ZERO_ADDRESS,
  publicClient
} from './config'
import type { Address } from 'viem'
import { isAppAdmin } from '@/config/admin'
import { sql } from '@vercel/postgres'
import { type Hash } from 'viem'
import type { TokenMetadata as TokenMetadataType, SpecificMetadata } from './types'

// URL generation helper
const getMetadataUrl = (tokenId: string) => 
  `/api/metadata/${CONTRACTS.specific}/${tokenId}`;

/**
 * Get the next token ID that will be minted
 */
export async function getNextTokenId(): Promise<string> {
  const nextTokenId = await publicClient.readContract({
    address: CONTRACTS.specific,
    abi: ABIS.specific,
    functionName: CONTRACT_FUNCTIONS.nextTokenId
  }) as bigint
  
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
  }
  creatorAccount: `0x${string}`
  onStatus: (status: CreateTokenStatus) => void
}

/**
 * Creates a new token on our specific contract using direct contract calls
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
    const metadataUrl = getMetadataUrl(nextTokenId)

    // Prepare token setup parameters
    const maxSupply = metadata.maxSupply ?? MAX_SUPPLY_OPEN_EDITION
    const createReferral = metadata.createReferral ?? ZERO_ADDRESS

    // Create token on-chain using direct contract call
    const parameters = {
      abi: ABIS.specific,
      functionName: createReferral === ZERO_ADDRESS 
        ? CONTRACT_FUNCTIONS.setupNewToken 
        : CONTRACT_FUNCTIONS.setupNewTokenWithCreateReferral,
      args: createReferral === ZERO_ADDRESS
        ? [metadataUrl, maxSupply]
        : [metadataUrl, maxSupply, createReferral],
      address: CONTRACTS.specific
    }

    // Update status: Token created
    onStatus?.({
      step: 'creating-token',
      tokenId: nextTokenId
    })

    // Return the result for transaction submission
    return {
      tokenId: BigInt(nextTokenId),
      parameters
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
      contract_address: CONTRACTS.specific,
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
      contract_address: CONTRACTS.specific,
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