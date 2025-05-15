import { 
  type Address,
  createWalletClient,
  custom,
  http,
  createPublicClient,
  concat,
  numberToHex,
  maxUint256,
  parseEther,
  formatEther
} from 'viem'
import { base } from 'viem/chains'
import { toast } from 'react-toastify'

// Standard ERC20 approve ABI as recommended by 0x
const ERC20_APPROVE_ABI = [{
  constant: false,
  inputs: [
    { name: '_spender', type: 'address' },
    { name: '_value', type: 'uint256' }
  ],
  name: 'approve',
  outputs: [{ name: '', type: 'bool' }],
  payable: false,
  stateMutability: 'nonpayable',
  type: 'function'
}] as const

interface ExecuteSwapParams {
  sellToken: Address
  buyToken: Address
  amount: string
  userAddress: Address
  provider: any
  onStatus: (message: string, type?: 'info' | 'success' | 'error') => void
}

export async function executeSwap({
  sellToken,
  buyToken,
  amount,
  userAddress,
  provider,
  onStatus
}: ExecuteSwapParams) {
  // Create clients
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  })

  const walletClient = createWalletClient({
    chain: base,
    transport: custom(provider)
  })

  // Convert amount to wei
  const sellAmountWei = parseEther(amount).toString()

  // Log initial parameters
  console.log('Initial parameters:', {
    sellToken,
    buyToken,
    amount,
    sellAmountWei,
    userAddress
  })

  // 1. Get initial quote
  const params = new URLSearchParams({
    action: 'quote',
    sellToken,
    buyToken,
    sellAmount: sellAmountWei,
    taker: userAddress,
    swapFeeToken: sellToken,
    slippageBps: '200', // 2% slippage
    swapFeeBps: '100'   // 1% fee
  })

  console.log('Quote request parameters:', {
    action: 'quote',
    sellToken,
    buyToken,
    sellAmount: sellAmountWei,
    taker: userAddress,
    swapFeeToken: sellToken,
    slippageBps: '200',
    swapFeeBps: '100'
  })

  const quoteResponse = await fetch(`/api/0x?${params}`)
  if (!quoteResponse.ok) {
    const errorData = await quoteResponse.json()
    console.error('Quote error details:', errorData)
    
    // Handle v2 API error structure
    const details = errorData.details || {}
    if (details.validationErrors?.length > 0) {
      throw new Error(`Invalid trade parameters: ${details.validationErrors[0]}`)
    } else if (details.code === 'INSUFFICIENT_LIQUIDITY') {
      throw new Error('Insufficient liquidity for this trade.')
    } else if (details.code === 'INVALID_TOKEN') {
      throw new Error('One or more tokens are not supported.')
    } else if (details.code === 'INSUFFICIENT_BALANCE') {
      throw new Error('Insufficient balance for this trade.')
    } else {
      throw new Error(details.message || errorData.error || 'Failed to get quote')
    }
  }

  const quoteData = await quoteResponse.json()
  console.log('Trade quote data:', {
    buyAmount: quoteData.buyAmount,
    sellAmount: quoteData.sellAmount,
    gas: quoteData.transaction.gas,
    gasPrice: quoteData.transaction.gasPrice,
    totalNetworkFee: quoteData.totalNetworkFee,
    issues: quoteData.issues,
    permit2: quoteData.permit2 ? {
      type: quoteData.permit2.type,
      hash: quoteData.permit2.hash
    } : null
  })

  // Handle ETH case - no permit needed
  if (sellToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    // Execute the trade directly for ETH
    onStatus('Confirming transaction...', 'info')

    const tx = {
      from: userAddress,
      to: quoteData.transaction.to,
      data: quoteData.transaction.data,
      value: `0x${BigInt(quoteData.transaction.value).toString(16)}`,
      gas: `0x${BigInt(quoteData.transaction.gas).toString(16)}`,
      gasPrice: quoteData.transaction.gasPrice ? `0x${BigInt(quoteData.transaction.gasPrice).toString(16)}` : undefined
    }

    console.log('ETH transaction:', tx)

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [tx]
    })

    // Wait for receipt and check status
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    
    if (!receipt.status) {
      throw new Error('Transaction could not be completed')
    }
    
    return {
      success: true,
      txHash
    }
  }

  // Handle permit signing and execute transaction for ERC20 tokens
  if (!quoteData.permit2?.eip712) {
    throw new Error('Missing permit data in quote response')
  }

  // Check if we need to set allowance for Permit2
  if (quoteData.issues?.allowance?.actual === '0') {
    onStatus('Approving token spending...', 'info')

    try {
      // Get the correct spender address from the API response
      const spenderAddress = quoteData.issues.allowance.spender
      if (!spenderAddress) {
        throw new Error('No spender address found in quote response')
      }

      console.log('Setting allowance for spender:', spenderAddress)

      // Direct approval using ERC20 approve with the correct spender
      const hash = await walletClient.writeContract({
        address: sellToken as `0x${string}`,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, maxUint256],
        chain: base,
        account: userAddress as `0x${string}`
      })

      // Wait for approval transaction
      await publicClient.waitForTransactionReceipt({ hash })
      console.log('Approval transaction confirmed:', hash)

      onStatus('Proceeding with swap...', 'info')

      // Add small delay to ensure approval is processed
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error: any) {
      console.error('Approval failed:', error)
      if (error?.code === 4001 || error?.message?.includes('rejected')) {
        throw new Error('Token approval cancelled')
      } else {
        throw new Error('Failed to approve token spending')
      }
    }
  }

  const permitData = quoteData.permit2.eip712
  
  // Calculate total amount needed including fees
  const integratorFeeAmount = quoteData.fees?.integratorFee?.amount ? BigInt(quoteData.fees.integratorFee.amount) : BigInt(0)
  const sellAmount = BigInt(quoteData.sellAmount)
  const totalAmount = sellAmount + integratorFeeAmount

  // Ensure proper typing for EIP712 data
  const typedData = {
    types: {
      PermitTransferFrom: [
        { name: 'permitted', type: 'TokenPermissions' },
        { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ],
      TokenPermissions: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      ...permitData.types
    },
    domain: permitData.domain,
    primaryType: 'PermitTransferFrom' as const,
    message: {
      ...permitData.message,
      permitted: {
        ...permitData.message.permitted,
        amount: totalAmount.toString() // Use total amount including fees
      }
    }
  }
  
  console.log('Signing permit with data:', {
    domain: typedData.domain,
    message: typedData.message,
    types: typedData.types
  })

  try {
    // Get signature from wallet with properly typed data
    const signature = await provider.request({
      method: 'eth_signTypedData_v4',
      params: [
        userAddress,
        JSON.stringify(typedData)
      ]
    })

    console.log('Raw signature received:', signature)

    // Parse the signature into r, s, v components
    const r = signature.slice(0, 66) // 32 bytes (0x + 64 hex chars)
    const s = '0x' + signature.slice(66, 130) // 32 bytes (0x + 64 hex chars)
    const v = parseInt(signature.slice(130, 132), 16) // 1 byte (2 hex chars)
    
    // secp256k1n = 2^256 - 2^32 - 2^9 - 2^8 - 2^7 - 2^6 - 2^4 - 1
    const secp256k1n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F')
    const secp256k1nHalf = secp256k1n / BigInt(2) + BigInt(1)
    
    // Convert r and s to BigInt for comparison
    const rValue = BigInt(r)
    const sValue = BigInt(s)
    
    // Ensure r < secp256k1n and s < secp256k1n/2 + 1
    if (rValue >= secp256k1n) {
      throw new Error('Invalid signature: r value too large')
    }
    if (sValue >= secp256k1nHalf) {
      throw new Error('Invalid signature: s value too large')
    }
    
    // Ensure v is 27 or 28
    const adjustedV = v < 27 ? v + 27 : v
    
    // Reconstruct signature with proper v value
    const formattedSignature = r + s.slice(2) + adjustedV.toString(16).padStart(2, '0')
    
    console.log('Signature components:', {
      r: rValue.toString(),
      s: sValue.toString(),
      v: adjustedV,
      formattedSignature
    })

    // Format signature according to 0x specification
    const signatureLength = 65
    const signatureLengthInHex = numberToHex(signatureLength, {
      size: 32,
      signed: false,
    })

    // Combine transaction data with signature length and signature
    const finalTxData = concat([
      quoteData.transaction.data,
      signatureLengthInHex,
      formattedSignature
    ])

    // Execute the trade
    onStatus('Confirming transaction...', 'info')

    const tx = {
      from: userAddress,
      to: quoteData.transaction.to,
      data: finalTxData,
      value: quoteData.transaction.value === '0' ? '0x0' : `0x${BigInt(quoteData.transaction.value).toString(16)}`,
      gas: `0x${BigInt(quoteData.transaction.gas).toString(16)}`,
      gasPrice: quoteData.transaction.gasPrice ? `0x${BigInt(quoteData.transaction.gasPrice).toString(16)}` : undefined
    }

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [tx]
    })

    console.log('Transaction hash:', txHash)

    // Wait for receipt and check status
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    
    if (!receipt.status) {
      throw new Error('Transaction could not be completed')
    }
    
    // Check if the receipt has any logs indicating success
    if (receipt.logs.length === 0) {
      throw new Error('Transaction could not be completed')
    }

    return {
      success: true,
      txHash
    }
  } catch (error: any) {
    console.error('Transaction failed:', error)
    
    if (error?.code === 4001 || error?.message?.includes('rejected')) {
      throw new Error('Transaction cancelled')
    } else {
      throw new Error('Transaction could not be completed')
    }
  }
} 