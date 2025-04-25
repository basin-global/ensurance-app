import { createNew1155Token } from '@zoralabs/protocol-sdk'
import type { Address } from 'viem'
import { specificContract } from './config/ERC1155'
import { publicClient } from './config/ERC20'
import type { TokenMetadata } from './config/ERC1155'
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
async function getNextTokenId(): Promise<string> {
  const nextTokenId = await publicClient.readContract({
    address: specificContract.address,
    abi: CONTRACT_ABI,
    functionName: 'nextTokenId'
  })
  
  return nextTokenId.toString()
}

export interface CreateTokenParams {
  metadata: TokenMetadata
  mediaFile: File
  thumbnailFile?: File // Required for video
  erc20Config: ERC20MintConfig
  creatorAccount: Address
}

/**
 * Creates a new token on our specific contract using ERC20 minting strategy
 * Only app admins can create tokens
 */
export async function createToken({
  metadata,
  mediaFile,
  thumbnailFile,
  erc20Config,
  creatorAccount
}: CreateTokenParams) {
  // Verify creator is an admin
  if (!isAppAdmin(creatorAccount)) {
    throw new Error('Only admins can create tokens')
  }

  // Get the next token ID
  const nextTokenId = await getNextTokenId()

  // Create token first - metadata URL just needs to be predictable
  const { parameters } = await createNew1155Token({
    contractAddress: specificContract.address,
    token: {
      tokenMetadataURI: specificMetadata.getMetadataUrl(nextTokenId),
      payoutRecipient: erc20Config.payoutRecipient,
      salesConfig: {
        type: 'erc20Mint',
        currency: erc20Config.currency,
        pricePerToken: erc20Config.pricePerToken
      }
    },
    account: creatorAccount,
    chainId: specificContract.network.id
  })

  // Now that token exists, upload media
  const { url: mediaUrl, thumbnailUrl } = await specificMetadata.uploadMedia(
    mediaFile,
    nextTokenId,
    thumbnailFile
  )

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
      ${Number(nextTokenId)},
      ${specificContract.network.name.toLowerCase()},
      ${metadata.name},
      ${metadata.description || null},
      ${thumbnailUrl || mediaUrl},
      ${mediaUrl.endsWith('.mp4') ? mediaUrl : null},
      ${mediaFile.type}
    )
  `

  return {
    parameters,
    tokenId: nextTokenId,
    metadataUrl: specificMetadata.getMetadataUrl(nextTokenId)
  }
} 