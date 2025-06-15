import { createPublicClient, http, maxUint256 } from 'viem'
import { base } from 'viem/chains'
import { getToken, getTokensOfContract, mint } from '@zoralabs/protocol-sdk'
import { PERMIT2_ADDRESS, CONTRACTS } from '@/modules/specific/config'

// Types
export type TokenDisplayInfo = {
  contract: string
  creator: `0x${string}`
  maxSupply: bigint
  mintType: '1155' | '721' | 'premint'
  tokenURI: string
  totalMinted: bigint
  primaryMintActive: boolean
  salesConfig?: {
    pricePerToken: bigint
    saleEnd: bigint
    saleStart: bigint
    fundsRecipient: string
  }
}

// Check and handle USDC allowance
async function handleAllowance(
  publicClient: any,
  walletClient: any,
  amount: bigint,
  owner: `0x${string}`
) {
  try {
    // Check current allowance
    const allowance = await publicClient.readContract({
      address: CONTRACTS.usdc,
      abi: [
        {
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
          ],
          name: 'allowance',
          outputs: [{ type: 'uint256' }],
          stateMutability: 'view',
          type: 'function'
        }
      ],
      functionName: 'allowance',
      args: [owner, CONTRACTS.erc20Minter]
    })

    console.log('Current allowance:', allowance.toString())
    console.log('Required amount:', amount.toString())

    // If allowance is sufficient, return true
    if (allowance >= amount) {
      return { needsApproval: false }
    }

    // If not, return false to indicate approval is needed
    return { needsApproval: true }
  } catch (error) {
    console.error('Error checking allowance:', error)
    throw error
  }
}

// Separate approval function
async function approveUSDC(
  publicClient: any,
  walletClient: any,
  owner: `0x${string}`
) {
  try {
    const hash = await walletClient.writeContract({
      address: CONTRACTS.usdc,
      abi: [
        {
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          name: 'approve',
          outputs: [{ type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ],
      functionName: 'approve',
      args: [PERMIT2_ADDRESS, maxUint256],
      account: owner
    })

    // Wait for approval transaction
    await publicClient.waitForTransactionReceipt({ hash })
    return true
  } catch (error) {
    console.error('Error approving USDC:', error)
    throw error
  }
}

// Core minting function - simplified to match Zora docs
export async function mintToken(
  contractAddress: `0x${string}`,
  tokenId: string,
  quantity: number,
  minterAccount: `0x${string}`,
  walletClient: any
) {
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  })

  // Get mint parameters from Zora SDK
  const { parameters } = await mint({
    tokenContract: contractAddress,
    mintType: '1155',
    tokenId: BigInt(tokenId),
    quantityToMint: quantity,
    minterAccount,
    publicClient,
    preferredSaleType: 'erc20',
    mintReferral: CONTRACTS.mintReferral
  })

  console.log('Zora SDK parameters:', {
    args: parameters.args,
    functionName: parameters.functionName,
    address: parameters.address
  })

  // Get price from the 4th parameter (index 4)
  const pricePerToken = parameters.args[4] as bigint
  // Calculate total price in USDC (6 decimals)
  const totalPrice = pricePerToken * BigInt(quantity)

  console.log('Price per token:', pricePerToken.toString())
  console.log('Quantity:', quantity)
  console.log('Total price:', totalPrice.toString())

  // Check if approval is needed
  const { needsApproval } = await handleAllowance(
    publicClient,
    walletClient,
    totalPrice,
    minterAccount
  )

  // Return both the parameters and approval status
  return {
    parameters: {
      ...parameters,
      args: [
        ...parameters.args.slice(0, 4),
        totalPrice, // Ensure total price is correctly set
        ...parameters.args.slice(5)
      ]
    },
    needsApproval
  }
}

// Token info fetcher - simplified
export async function getTokenInfo(
  contractAddress: `0x${string}`,
  tokenId: string
): Promise<TokenDisplayInfo | null> {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    })

    const { token } = await getToken({
      publicClient,
      tokenContract: contractAddress,
      mintType: '1155',
      tokenId: BigInt(tokenId)
    })

    // Type assertion for the raw token data
    const rawToken = token as unknown as {
      contract: { address: string }
      creator: `0x${string}`
      maxSupply: bigint
      mintType: '1155' | '721' | 'premint'
      tokenURI: string
      totalMinted: bigint
      salesConfig?: {
        pricePerToken: bigint
        saleEnd: bigint
        saleStart: bigint
        fundsRecipient: string
      }
    }

    return {
      contract: rawToken.contract.address,
      creator: rawToken.creator,
      maxSupply: rawToken.maxSupply,
      mintType: rawToken.mintType,
      tokenURI: rawToken.tokenURI,
      totalMinted: rawToken.totalMinted,
      primaryMintActive: true,
      salesConfig: rawToken.salesConfig
    }
  } catch (error) {
    console.error('Error fetching token info:', error)
    return null
  }
}

// Contract tokens fetcher - simplified
export async function getContractTokens(
  contractAddress: `0x${string}`
): Promise<TokenDisplayInfo[]> {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    })

    const response = await getTokensOfContract({
      publicClient,
      tokenContract: contractAddress
    })

    return response.tokens.map(token => {
      // Type assertion for the raw token data
      const rawToken = token as unknown as {
        token: {
          contract: { address: string }
          creator: `0x${string}`
          maxSupply: bigint
          mintType: '1155' | '721' | 'premint'
          tokenURI: string
          totalMinted: bigint
          salesConfig?: {
            pricePerToken: bigint
            saleEnd: bigint
            saleStart: bigint
            fundsRecipient: string
          }
        }
      }

      return {
        contract: rawToken.token.contract.address,
        creator: rawToken.token.creator,
        maxSupply: rawToken.token.maxSupply,
        mintType: rawToken.token.mintType,
        tokenURI: rawToken.token.tokenURI,
        totalMinted: rawToken.token.totalMinted,
        primaryMintActive: true,
        salesConfig: rawToken.token.salesConfig
      }
    })
  } catch (error) {
    console.error('Error fetching contract tokens:', error)
    return []
  }
} 