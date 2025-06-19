import { 
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  maxUint256,
  encodeFunctionData
} from 'viem'
import { base } from 'viem/chains'

export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const

const ERC20_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
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
] as const

export interface Permit2CheckParams {
  sellToken: Address
  sellAmount: bigint
  allowanceTarget: Address
  userAddress: Address
  provider: any
  onStatus?: (message: string, type?: 'info' | 'success' | 'error') => void
}

export interface Permit2ApprovalResult {
  needsApproval: boolean
  currentAllowance: bigint
  approvalHash?: string
}

/**
 * Check if permit2 approval is needed and handle approval if required
 */
export const checkAndHandlePermit2Approval = async ({
  sellToken,
  sellAmount,
  allowanceTarget,
  userAddress,
  provider,
  onStatus
}: Permit2CheckParams): Promise<Permit2ApprovalResult> => {
  // Create clients
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  })

  const walletClient = createWalletClient({
    chain: base,
    transport: custom(provider)
  })

  // Validate addresses
  if (!allowanceTarget || !sellToken) {
    throw new Error('Invalid address parameters for permit2 approval')
  }

  const formattedAllowanceTarget = allowanceTarget.startsWith('0x') 
    ? allowanceTarget 
    : `0x${allowanceTarget}`

  if (formattedAllowanceTarget.length !== 42) {
    throw new Error('Invalid allowance target address format')
  }

  try {
    onStatus?.('checking if approval is needed...', 'info')

    // Check current allowance
    const currentAllowance = await publicClient.readContract({
      address: sellToken,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress, formattedAllowanceTarget as Address]
    })

    console.log('Permit2 allowance check:', {
      token: sellToken,
      spender: formattedAllowanceTarget,
      currentAllowance: currentAllowance.toString(),
      requiredAmount: sellAmount.toString(),
      needsApproval: currentAllowance < sellAmount
    })

    // If allowance is sufficient, no approval needed
    if (currentAllowance >= sellAmount) {
      console.log('Sufficient allowance already exists')
      return {
        needsApproval: false,
        currentAllowance
      }
    }

    // Need approval - execute it
    onStatus?.('approving token spending...', 'info')

    const approvalHash = await walletClient.writeContract({
      address: sellToken,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [formattedAllowanceTarget as Address, maxUint256],
      account: userAddress
    })

    // Wait for approval confirmation
    onStatus?.('waiting for approval confirmation...', 'info')
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: approvalHash,
      timeout: 120_000 // 2 minute timeout
    })

    if (!receipt.status) {
      throw new Error('Approval transaction failed')
    }

    onStatus?.('approval confirmed!', 'success')

    // Verify the allowance was set correctly
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for network propagation
    
    const newAllowance = await publicClient.readContract({
      address: sellToken,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress, formattedAllowanceTarget as Address]
    })

    console.log('New allowance after approval:', newAllowance.toString())
    
    if (newAllowance < sellAmount) {
      throw new Error('Allowance not set correctly after approval')
    }

    return {
      needsApproval: true,
      currentAllowance: newAllowance,
      approvalHash
    }

  } catch (error) {
    console.error('Error in permit2 approval check/set:', error)
    throw error
  }
}

/**
 * For tokenbound accounts - execute permit2 approval through TBA
 */
export const handleTokenboundPermit2Approval = async ({
  sellToken,
  sellAmount,
  allowanceTarget,
  userAddress,
  tbaAddress,
  tokenboundClient,
  provider,
  onStatus
}: Permit2CheckParams & { 
  tbaAddress: Address
  tokenboundClient: any
}): Promise<Permit2ApprovalResult> => {
  // Create public client for reading
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  })

  const formattedAllowanceTarget = allowanceTarget.startsWith('0x') 
    ? allowanceTarget 
    : `0x${allowanceTarget}`

  try {
    onStatus?.('checking if approval is needed...', 'info')

    // Check current allowance for the TBA
    const currentAllowance = await publicClient.readContract({
      address: sellToken,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [tbaAddress, formattedAllowanceTarget as Address]
    })

    console.log('TBA Permit2 allowance check:', {
      token: sellToken,
      tbaAddress,
      spender: formattedAllowanceTarget,
      currentAllowance: currentAllowance.toString(),
      requiredAmount: sellAmount.toString(),
      needsApproval: currentAllowance < sellAmount
    })

    // If allowance is sufficient, no approval needed
    if (currentAllowance >= sellAmount) {
      console.log('TBA has sufficient allowance')
      return {
        needsApproval: false,
        currentAllowance
      }
    }

    // Need approval - execute through tokenbound
    onStatus?.('approving token spending for your agent account...', 'info')

    // Encode the approval transaction data
    const approvalData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [formattedAllowanceTarget as Address, maxUint256]
    })

    // Execute through tokenbound client
    const approvalHash = await tokenboundClient.execute({
      account: tbaAddress,
      to: sellToken,
      value: BigInt(0),
      data: approvalData
    })

    // Wait for approval confirmation
    onStatus?.('waiting for approval confirmation...', 'info')
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: approvalHash,
      timeout: 120_000 // 2 minute timeout
    })

    if (!receipt.status) {
      throw new Error('TBA approval transaction failed')
    }

    onStatus?.('approval confirmed!', 'success')

    // Verify the allowance was set correctly
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const newAllowance = await publicClient.readContract({
      address: sellToken,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [tbaAddress, formattedAllowanceTarget as Address]
    })

    console.log('New TBA allowance after approval:', newAllowance.toString())
    
    if (newAllowance < sellAmount) {
      throw new Error('TBA allowance not set correctly after approval')
    }

    return {
      needsApproval: true,
      currentAllowance: newAllowance,
      approvalHash
    }

  } catch (error) {
    console.error('Error in TBA permit2 approval:', error)
    throw error
  }
} 