import { 
  type Address,
  createWalletClient,
  custom,
  http,
  createPublicClient,
  parseEther,
  maxUint256,
  concat,
  numberToHex
} from 'viem'
import { base } from 'viem/chains'
import type { RouterV2 } from '@0x/swap-ts-sdk'

// Standard ERC20 ABI for approve and allowance
const ERC20_ABI = [{
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
}, {
  constant: true,
  inputs: [
    { name: '_owner', type: 'address' },
    { name: '_spender', type: 'address' }
  ],
  name: 'allowance',
  outputs: [{ name: '', type: 'uint256' }],
  payable: false,
  stateMutability: 'view',
  type: 'function'
}] as const

// Define constants for 0x contract addresses
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
// Add AllowanceHolder for Base chain if you need it
// const ALLOWANCE_HOLDER_BASE = '0x0000000000001ff3684f28c67538d4d072c22734';

// Define types for the quote response
type Quote = {
  buyTokenAddress?: string;
  sellTokenAddress?: string;
  buyAmount?: string;
  sellAmount?: string;
  to?: string;
  data?: string;
  value?: string;
  gas?: string;
  estimatedGas?: string;
  gasPrice?: string;
  protocolFee?: string;
  minimumProtocolFee?: string;
  buyTokenPercentageFee?: string;
  price?: string;
  guaranteedPrice?: string;
  sources?: Array<{ name: string; proportion: string }>;
  allowanceTarget?: string;
  sellTokenToEthRate?: string;
  buyTokenToEthRate?: string;
  fees?: {
    integratorFee?: {
      amount: string;
    };
  };
  // Updated Permit2 specific fields to match 0x v2 API
  permit2?: {
    type?: string;
    hash?: string;
    eip712?: {
      types: Record<string, Array<{ name: string; type: string }>>;
      domain: Record<string, any>;
      primaryType: string;
      message: Record<string, any>;
    }
  };
  // Transaction object per v2 API
  transaction?: {
    to?: string;
    data?: string;
    value?: string;
    gas?: string;
    gasPrice?: string;
  }
};

// Define types for the transaction parameters
type TransactionParams = {
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice?: string;
}

interface ExecuteSwapParams {
  sellToken: Address
  buyToken: Address
  amount: string
  userAddress: Address
  provider: any
  onStatus: (message: string, type?: 'info' | 'success' | 'error') => void
  apiKey?: string // Optional now since we're using our backend
}

interface CheckAllowanceParams {
  sellToken: Address;
  sellAmount: bigint;
  allowanceTarget: Address;
  userAddress: Address;
  walletClient: any;
  publicClient: any;
  onStatus: (message: string, type?: 'info' | 'success' | 'error') => void;
}

interface ExecuteEthSwapParams {
  quoteResponse: Quote;
  userAddress: Address;
  provider: any;
  publicClient: any;
}

interface ExecuteTokenSwapParams {
  swapParams: TransactionParams;
  userAddress: Address;
  provider: any;
  publicClient: any;
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

  // Amount is already in correct decimals from the component
  const sellAmountWei = amount

  // Log initial parameters
  console.log('Swap parameters:', {
    sellToken,
    buyToken,
    amount,
    sellAmountWei,
    userAddress,
    chainId: base.id
  })

  try {
    onStatus('Getting quote...', 'info')

    // Use our backend proxy to get a quote
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

    const quoteResponse = await fetch(`/api/0x?${params}`)
    if (!quoteResponse.ok) {
      const errorData = await quoteResponse.json()
      console.error('Quote error details:', errorData)
      
      // Handle v2 API error structure
      const details = errorData.details || {}
      if (details.validationErrors?.length > 0) {
        throw new Error(`Invalid trade parameters: ${details.validationErrors[0]}`)
      } else if (details.code === 'INSUFFICIENT_LIQUIDITY') {
        throw new Error('Insufficient liquidity for this trade')
      } else if (details.code === 'INVALID_TOKEN') {
        throw new Error('One or more tokens are not supported')
      } else if (details.code === 'INSUFFICIENT_BALANCE') {
        throw new Error('Insufficient balance for this trade')
      } else {
        throw new Error(details.message || errorData.error || 'Failed to get quote')
      }
    }

    const quoteData = await quoteResponse.json() as Quote
    console.log('Quote received:', {
      buyAmount: quoteData.buyAmount,
      sellAmount: quoteData.sellAmount,
      estimatedGas: quoteData.estimatedGas || quoteData.gas || quoteData.transaction?.gas,
      price: quoteData.price,
      sources: quoteData.sources?.filter((s) => Number(s.proportion) > 0).map((s) => s.name) || [],
      allowanceTarget: quoteData.allowanceTarget,
      permitData: quoteData.permit2 ? 'Present' : 'Not present',
      transaction: quoteData.transaction ? 'Present' : 'Not present'
    })

    // Make sure we have transaction data in the expected format (v2 API)
    if (!quoteData.transaction) {
      console.error('Missing transaction object in quote response', quoteData);
      throw new Error('Invalid quote: missing transaction object');
    }

    // Handle native ETH case
    const isNativeETH = sellToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'.toLowerCase()
    
    if (isNativeETH) {
      onStatus('Executing ETH swap...', 'info')
      return await executeEthSwap({
        quoteResponse: quoteData,
        userAddress,
        provider,
        publicClient
      })
    } else {
      // For ERC20 tokens with Permit2

      // Check if quote includes Permit2 data (needed for token-to-token swaps)
      if (!quoteData.permit2?.eip712) {
        console.error('Missing Permit2 data in quote response');
        throw new Error('Invalid quote: missing Permit2 data');
      }

      // SECURITY CHECK: Ensure we have a valid allowanceTarget
      if (!quoteData.allowanceTarget) {
        console.warn('Missing allowanceTarget in quote response - using canonical Permit2 address');
        // If we're using Permit2 flow and allowanceTarget is missing, use the canonical Permit2 address
        if (quoteData.permit2?.type === 'Permit2') {
          quoteData.allowanceTarget = PERMIT2_ADDRESS;
          console.log('Using canonical Permit2 address as allowanceTarget');
        } else {
          console.error('Cannot safely determine allowance target - Permit2 type missing');
          throw new Error('Invalid quote: missing allowance target for token swap');
        }
      }

      // SECURITY CHECK: Never approve the Settler contract (transaction.to)
      if (quoteData.allowanceTarget.toLowerCase() === quoteData.transaction.to?.toLowerCase()) {
        console.error('SECURITY VIOLATION: API returned Settler contract as allowanceTarget', {
          allowanceTarget: quoteData.allowanceTarget,
          settlerContract: quoteData.transaction.to
        });
        throw new Error('Security violation: Cannot approve Settler contract');
      }

      // Log the allowance target for security verification
      console.log('Using allowance target:', {
        allowanceTarget: quoteData.allowanceTarget,
        isPermit2: quoteData.allowanceTarget.toLowerCase() === PERMIT2_ADDRESS.toLowerCase(),
        settler: quoteData.transaction.to
      });

      // Check and set allowance if needed
      await checkAndSetAllowance({
        sellToken,
        sellAmount: BigInt(quoteData.sellAmount || '0'),
        allowanceTarget: quoteData.allowanceTarget as Address,
        userAddress,
        walletClient,
        publicClient,
        onStatus
      });

      // Sign permit message
      onStatus('Signing permission...', 'info');
      
      const permitData = quoteData.permit2.eip712;
      
      // Ensure proper typing for EIP712 data
      const typedData = {
        types: permitData?.types || {},
        domain: permitData?.domain || {},
        primaryType: permitData?.primaryType || 'PermitTransferFrom',
        message: permitData?.message || {}
      };
      
      console.log('Signing permit with data:', {
        domain: typedData.domain,
        primaryType: typedData.primaryType,
        messageType: typedData.types[typedData.primaryType],
        message: typedData.message
      });

      try {
        // Get signature from wallet
        const signature = await provider.request({
          method: 'eth_signTypedData_v4',
          params: [
            userAddress,
            JSON.stringify(typedData)
          ]
        });

        console.log('Permit signature obtained:', signature.slice(0, 20) + '...');

        // For 0x v2 API: prepare the transaction from the transaction object
        // Make a copy of the transaction data to manipulate
        const tx = {
          from: userAddress,
          to: quoteData.transaction.to,
          data: quoteData.transaction.data || '0x',
          value: quoteData.transaction.value || '0',
          gas: quoteData.transaction.gas,
        };

        // Format signature following 0x v2 specs - this is where the previous error occurred
        // The signature needs to be appended to the transaction data
        const signatureLength = 65; // Standard size for an ECDSA signature
        const signatureLengthInHex = numberToHex(signatureLength, {
          size: 32,
          signed: false,
        });

        // IMPORTANT: Only append the signature if using Permit2 flow
        // In 0x v2, the signature should be appended to the transaction.data
        if (quoteData.permit2?.type === 'Permit2' && tx.data) {
          console.log('Appending Permit2 signature to transaction data');
          tx.data = concat([
            tx.data,
            signatureLengthInHex,
            signature
          ]) as string;
        }

        // Execute the swap with full permit2 data
        onStatus('Executing swap with permit...', 'info');
        
        // Use a properly formatted TX object directly from 0x
        console.log('Executing transaction:', {
          to: tx.to,
          dataLength: tx.data.length,
          value: tx.value,
          gas: tx.gas
        });

        // Send transaction
        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [tx]
        });

        console.log('Transaction sent with hash:', txHash);
        
        // Wait for receipt with longer timeout
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          timeout: 180_000 // 3 minute timeout
        });
        
        console.log('Transaction receipt:', {
          status: receipt.status,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          logs: receipt.logs.length
        });
        
        if (!receipt.status) {
          throw new Error('Transaction failed on-chain');
        }
        
        return {
          success: true,
          txHash
        };
      } catch (error) {
        console.error('Signing or swap error:', error);
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Swap failed:', error)
    
    // Handle specific errors
    if (error.message?.includes('rejected') || error.code === 4001) {
      throw new Error('Transaction rejected by user')
    } else {
      throw new Error(error.message || 'Failed to fetch')
    }
  }
}

async function checkAndSetAllowance({
  sellToken,
  sellAmount,
  allowanceTarget,
  userAddress,
  walletClient,
  publicClient,
  onStatus
}: CheckAllowanceParams) {
  // Validate addresses
  if (!allowanceTarget || !sellToken) {
    console.error('Invalid address parameters:', { sellToken, allowanceTarget });
    throw new Error('Missing required address parameters for token approval');
  }

  // Ensure the allowanceTarget has the 0x prefix and is properly formatted
  const formattedAllowanceTarget = allowanceTarget.startsWith('0x') 
    ? allowanceTarget 
    : `0x${allowanceTarget}`;

  if (formattedAllowanceTarget.length !== 42) {
    console.error('Invalid allowance target format:', formattedAllowanceTarget);
    throw new Error('Invalid allowance target address format');
  }

  try {
    // Check current allowance
    const currentAllowance = await publicClient.readContract({
      address: sellToken as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress as `0x${string}`, formattedAllowanceTarget as `0x${string}`]
    })

    console.log('Allowance check:', {
      token: sellToken,
      spender: formattedAllowanceTarget,
      currentAllowance: currentAllowance.toString(),
      requiredAmount: sellAmount.toString()
    })

    // If allowance is too low, request approval
    if (currentAllowance < sellAmount) {
      onStatus('Approving token spending...', 'info')

      try {
        // IMPORTANT: Use maxUint256 for unlimited approvals instead of exact amount
        // This follows best practices for DEX interactions
        const hash = await walletClient.writeContract({
          address: sellToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [formattedAllowanceTarget as `0x${string}`, maxUint256],
          account: userAddress as `0x${string}`
        })

        // Wait for approval transaction
        onStatus('Waiting for approval confirmation...', 'info')
        const receipt = await publicClient.waitForTransactionReceipt({ hash })

        if (!receipt.status) {
          throw new Error('Approval transaction failed')
        }

        onStatus('Approval confirmed', 'success')

        // Verify the allowance was set correctly after a short delay
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const newAllowance = await publicClient.readContract({
          address: sellToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [userAddress as `0x${string}`, formattedAllowanceTarget as `0x${string}`]
        })

        console.log('New allowance:', newAllowance.toString())
        
        if (newAllowance < sellAmount) {
          throw new Error('Allowance not set correctly')
        }
      } catch (error) {
        console.error('Approval error:', error)
        throw error
      }
    } else {
      console.log('Sufficient allowance already exists')
    }
  } catch (error) {
    console.error('Error in allowance check/set:', error);
    throw error;
  }
}

// Improve the executeEthSwap function
async function executeEthSwap({
  quoteResponse,
  userAddress,
  provider,
  publicClient
}: ExecuteEthSwapParams) {
  try {
    // For 0x v2 API, we should use the transaction object
    if (!quoteResponse.transaction) {
      console.error('Missing transaction object in quote for ETH swap');
      throw new Error('Invalid quote: missing transaction object for ETH swap');
    }

    // Validate that we have a valid 'to' address
    if (!quoteResponse.transaction.to) {
      console.error('Missing destination address in transaction:', quoteResponse.transaction);
      throw new Error('Invalid quote: missing destination address');
    }

    // Ensure we have valid transaction data
    if (!quoteResponse.transaction.data) {
      console.error('Missing transaction data in transaction:', quoteResponse.transaction);
      throw new Error('Invalid quote: missing transaction data');
    }

    const tx = {
      from: userAddress,
      to: quoteResponse.transaction.to,
      data: quoteResponse.transaction.data,
      value: `0x${BigInt(quoteResponse.transaction.value || 0).toString(16)}`,
      gas: `0x${Math.floor(Number(quoteResponse.transaction.gas) * 1.2).toString(16)}`, // 20% buffer
    }

    console.log('ETH swap transaction:', {
      to: tx.to,
      value: tx.value,
      gasEstimate: quoteResponse.transaction.gas
    })

    // Send transaction
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [tx]
    })

    console.log('Transaction sent with hash:', txHash);
    
    // Wait for receipt with longer timeout
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: txHash,
      timeout: 120_000 // 2 minute timeout
    })
    
    console.log('Transaction receipt:', {
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      logs: receipt.logs.length
    });
    
    if (!receipt.status) {
      throw new Error('Transaction failed on-chain');
    }
    
    // Additional verification: check for events/logs
    if (receipt.logs.length === 0) {
      // No events emitted, usually a sign of failure
      console.warn('Transaction succeeded but emitted no logs - possible silent failure');
    }
    
    return {
      success: true,
      txHash
    }
  } catch (error) {
    console.error('ETH swap error:', error)
    throw error
  }
} 