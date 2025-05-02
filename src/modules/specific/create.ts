import { createNew1155Token } from '@zoralabs/protocol-sdk'
import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { base } from 'viem/chains'
import { USDC_ADDRESS } from './config/ERC20'
import { SPECIFIC_CONTRACT_ADDRESS, specificContract, type TokenMetadata } from './config/ERC1155'
import type { Address } from 'viem'
import { publicClient } from './config/ERC20'
import type { ERC20MintConfig } from './config/ERC20'
import { isAppAdmin } from '@/config/admin'
import { specificMetadata } from './metadata'
import { sql } from '@vercel/postgres'

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
  step: 'creating-token' | 'uploading-media' | 'storing-metadata' | 'complete';
  tokenId?: string;
  txHash?: string;
  mediaUrl?: string;
  error?: string;
}

export interface CreateTokenParams {
  metadata: TokenMetadata;
  mediaFile: File;
  thumbnailFile?: File;
  erc20Config: {
    currency: Address;
    pricePerToken: bigint;
    payoutRecipient: Address;
  };
  creatorAccount: Address;
  onStatus?: (status: CreateTokenStatus) => void;
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

    // Upload media
    const { url: mediaUrl, thumbnailUrl } = await specificMetadata.uploadMedia(
      mediaFile,
      tokenId,
      thumbnailFile
    )

    return { mediaUrl, thumbnailUrl }
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
  erc20Config,
  creatorAccount,
  onStatus
}: CreateTokenParams) {
  try {
    onStatus?.({ step: 'creating-token' })

    // Create token parameters
    const result = await createNew1155Token({
      contractAddress: specificContract.address,
      token: {
        tokenMetadataURI: '', // Will be set later
        payoutRecipient: erc20Config.payoutRecipient,
        salesConfig: {
          pricePerToken: erc20Config.pricePerToken,
          saleStart: BigInt(Math.floor(Date.now() / 1000)),
          saleEnd: BigInt(0),
          maxTokensPerAddress: BigInt(0),
          currency: erc20Config.currency
        }
      },
      account: creatorAccount,
      chainId: base.id
    })

    onStatus?.({ 
      step: 'creating-token',
      tokenId: result.tokenId.toString()
    })

    return {
      tokenId: result.tokenId.toString(),
      parameters: result.parameters
    }

  } catch (error: any) {
    console.error('Error creating token:', error)
    if (error?.code === 4001 || error?.message?.includes('rejected')) {
      throw new Error('Transaction cancelled')
    }
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
  thumbnailFile,
  onStatus
}: {
  tokenId: string
  metadata: TokenMetadata
  mediaFile: File
  thumbnailFile?: File
  onStatus?: (status: CreateTokenStatus) => void
}) {
  try {
    // Update status: Uploading media
    onStatus?.({
      step: 'uploading-media',
      tokenId
    })

    // Upload media
    const { url: mediaUrl, thumbnailUrl } = await specificMetadata.uploadMedia(
      mediaFile,
      tokenId,
      thumbnailFile
    )

    // Update status: Storing metadata
    onStatus?.({
      step: 'storing-metadata',
      tokenId,
      mediaUrl
    })

    // Store metadata in database
    await sql`
      INSERT INTO certificates.specific (
        token_id,
        chain,
        name,
        description,
        image,
        animation_url,
        mime_type
      ) VALUES (
        ${Number(tokenId)},
        ${specificContract.network.name.toLowerCase()},
        ${metadata.name},
        ${metadata.description || null},
        ${thumbnailUrl || mediaUrl},
        ${mediaUrl.endsWith('.mp4') ? mediaUrl : null},
        ${mediaFile.type}
      )
    `

    // Update status: Complete
    onStatus?.({
      step: 'complete',
      tokenId,
      mediaUrl
    })

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