// Contract return value types
export type TokenData = {
  totalMinted: bigint
  maxSupply: bigint
  image: string
  name: string
  description: string
}

export type SalesConfig = {
  saleStart: bigint
  saleEnd: bigint
  maxTokensPerAddress: bigint
  pricePerToken: bigint
  fundsRecipient: `0x${string}`
  currency: `0x${string}`
}

// Status types
export type CreateTokenStatus = {
  step: 'creating-token' | 'uploading-media' | 'storing-metadata' | 'complete' | 'error'
  tokenId?: string
  error?: string
  txHash?: `0x${string}`
  mediaUrl?: string
}

// Metadata types
export type TokenMetadata = {
  name: string
  description: string
  image: string
  thumbnail?: string
  attributes?: Record<string, any>
  maxSupply?: bigint
  createReferral?: `0x${string}`
}

export interface SpecificMetadata {
  name: string
  description?: string
  image: string
  animation_url?: string
  content?: {
    mime: string
    uri: string
  }
  attributes?: Record<string, any>
}

// Function parameter types
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

export type UpdateTokenParams = {
  contractAddress: string
  tokenId: string
  fundsRecipient: `0x${string}`
  onStatus?: (status: {
    step: string
    error?: string
    tokenId?: string
  }) => void
  walletClient?: any // Wallet client for transactions
} 