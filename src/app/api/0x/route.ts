import { NextResponse } from 'next/server';
import { createClientV2 } from '@0x/swap-ts-sdk';

if (!process.env.ZEROX_API_KEY) {
  throw new Error('ZEROX_API_KEY is not configured');
}

// Create the 0x API client
const client = createClientV2({
  apiKey: process.env.ZEROX_API_KEY
});

// Define types for the quote response
type QuoteResponse = {
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  buyAmount?: string;
  allowanceTarget?: string;
  price?: string;
  estimatedGas?: string;
  gas?: string;
  gasPrice?: string;
  data?: string;
  to?: string;
  value?: string;
  // Add other potential fields
  sources?: Array<{ name: string; proportion: string }>;
  fees?: {
    integratorFee?: { amount: string; type: string; token: string; } | null;
    zeroExFee?: { amount: string; type: string; token: string; } | null;
  };
  // Special fields for "no liquidity" response
  zid?: string;
  liquidityAvailable?: boolean;
  // Transaction information - 0x v2 API returns this nested
  transaction?: {
    to?: string;
    data?: string;
    value?: string;
    gas?: string;
    gasPrice?: string;
  };
  // Permit2 data
  permit2?: {
    type?: string;
    hash?: string;
    eip712?: {
      types: Record<string, Array<{ name: string; type: string }>>;
      domain: Record<string, any>;
      primaryType: string;
      message: Record<string, any>;
    };
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    if (action === 'quote') {
      const sellToken = searchParams.get('sellToken');
      const buyToken = searchParams.get('buyToken');
      const sellAmount = searchParams.get('sellAmount');
      const taker = searchParams.get('taker');
      const slippageBps = searchParams.get('slippageBps') || '200'; // Default 2% slippage
      const swapFeeBps = searchParams.get('swapFeeBps') || '100';  // Default 1% fee

      if (!sellToken || !buyToken || !sellAmount || !taker) {
        return NextResponse.json({ 
          error: 'Missing required parameters',
          details: {
            sellToken: !sellToken ? 'missing' : 'present',
            buyToken: !buyToken ? 'missing' : 'present',
            sellAmount: !sellAmount ? 'missing' : 'present',
            taker: !taker ? 'missing' : 'present'
          }
        }, { status: 400 });
      }

      // Log the incoming parameters
      console.log('Quote request parameters:', {
        chainId: 8453, // Base network
        sellToken,
        buyToken,
        sellAmount,
        taker,
        swapFeeRecipient: '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e',
        swapFeeBps,
        slippageBps
      });

      try {
        // Always include all fee parameters together
        const quoteParams = {
          chainId: 8453, // Base network
          sellToken,
          buyToken,
          sellAmount,
          taker,
          swapFeeRecipient: '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e',
          swapFeeBps: Number(swapFeeBps),
          swapFeeToken: sellToken,
          slippageBps: Number(slippageBps),
          // Exclude problematic sources if needed
          // excludedSources: 'Kyber,Balancer'
        };

        console.log('Requesting permit2 quote with parameters:', quoteParams);
        
        // Get quote from 0x API
        const quote = await client.swap.permit2.getQuote.query(quoteParams, {
          signal: AbortSignal.timeout(10000)
        }) as QuoteResponse;
        
        // In the 0x v2 API, the transaction object should already be properly formatted
        // We shouldn't need to manipulate it, just pass it along as-is
        
        // Verify permit2 data is present for token swaps (not needed for ETH swaps)
        const isNativeEth = sellToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'.toLowerCase();
        if (!isNativeEth && !quote.permit2?.eip712) {
          console.warn('Quote returned without permit2 data for token swap:', {
            sellToken,
            buyToken,
            hasPermit2: !!quote.permit2,
            hasEip712: !!quote.permit2?.eip712
          });
        }
        
        // IMPORTANT: For token swaps, ensure allowanceTarget is properly set
        // This is critical to avoid approving the wrong contract
        if (!isNativeEth && !quote.allowanceTarget && quote.permit2?.type === 'Permit2') {
          console.warn('Quote missing allowanceTarget for token swap, adding canonical Permit2 address');
          // Use canonical Permit2 address if allowanceTarget is missing
          quote.allowanceTarget = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
        }
        
        // Make sure transaction data is present
        if (!quote.transaction || !quote.transaction.to || !quote.transaction.data) {
          console.error('Quote missing expected transaction data:', quote);
          return NextResponse.json({
            error: "Invalid quote response from 0x API",
            details: {
              message: "Missing transaction object in quote response",
              code: "INVALID_RESPONSE"
            }
          }, { status: 500 });
        }
        
        // For debugging purposes, log the important parts of the response
        console.log('Permit2 quote successful:', {
          buyAmount: quote.buyAmount,
          sellAmount: quote.sellAmount,
          gas: quote.transaction?.gas || quote.gas || quote.estimatedGas, 
          to: quote.transaction.to,
          data: quote.transaction.data ? quote.transaction.data.slice(0, 40) + '...' : null,
          allowanceTarget: quote.allowanceTarget,
          chainId: quoteParams.chainId,
          network: 'Base',
          hasPermit2: !!quote.permit2,
          permit2Type: quote.permit2?.type || 'none',
          hasEip712: !!quote.permit2?.eip712
        });

        // Return the response as-is from the 0x API
        return NextResponse.json(quote);
      } catch (sdkError: any) {
        // Enhanced error logging for v2 API responses
        console.error('0x v2 SDK Error:', {
          message: sdkError.message,
          data: sdkError.data,
          shape: sdkError.shape,
          meta: sdkError.meta,
          request: {
            sellToken,
            buyToken,
            sellAmount,
            taker
          }
        });
        
        // Handle the TRPC error format
        let errorCode = 'UNKNOWN_ERROR';
        let errorMessage = sdkError.message || 'Failed to get quote from 0x API';
        
        // Parse API error message
        if (sdkError.message) {
          if (sdkError.message.includes('insufficient liquidity')) {
            errorCode = 'INSUFFICIENT_LIQUIDITY';
          } else if (sdkError.message.includes('invalid token')) {
            errorCode = 'INVALID_TOKEN';
          } else if (sdkError.message.includes('balance')) {
            errorCode = 'INSUFFICIENT_BALANCE';
          }
        }
        
        // Structure error response to match v2 API format
        const errorResponse = {
          error: errorMessage,
          details: {
            message: errorMessage,
            data: sdkError.data || {},
            validationErrors: [],
            code: errorCode
          }
        };

        return NextResponse.json(errorResponse, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Invalid action',
      details: { action }
    }, { status: 400 });
  } catch (error) {
    console.error('0x API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch from 0x API',
        details: error instanceof Error ? error.stack : undefined,
        url: request.url
      },
      { status: 500 }
    );
  }
} 