import { NextResponse } from 'next/server';
import { createClientV2 } from '@0x/swap-ts-sdk';

if (!process.env.ZEROX_API_KEY) {
  throw new Error('ZEROX_API_KEY is not configured');
}

// Create the 0x API client
const client = createClientV2({
  apiKey: process.env.ZEROX_API_KEY
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    if (action === 'quote') {
      const sellToken = searchParams.get('sellToken');
      const buyToken = searchParams.get('buyToken');
      const sellAmount = searchParams.get('sellAmount');
      const taker = searchParams.get('taker');

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
        chainId: 8453,
        sellToken,
        buyToken,
        sellAmount,
        taker,
        swapFeeRecipient: '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e',
        swapFeeBps: 100,
        slippageBps: 100
      });

      try {
        // Always include all fee parameters together
        const quoteParams = {
          chainId: 8453,
          sellToken,
          buyToken,
          sellAmount,
          taker,
          swapFeeRecipient: '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e',
          swapFeeBps: 100,
          swapFeeToken: sellToken, // Use the sell token as the fee token
          slippageBps: 100
        };

        console.log('Requesting permit2 quote with parameters:', quoteParams);
        
        const quote = await client.swap.permit2.getQuote.query(quoteParams, {
          signal: AbortSignal.timeout(10000)
        });
        
        console.log('Permit2 quote successful:', quote);
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
        
        // Structure error response to match v2 API format
        const errorResponse = {
          error: 'Failed to get quote from 0x API',
          details: {
            message: sdkError.message,
            data: sdkError.data,
            validationErrors: sdkError.data?.details || [],
            insufficientLiquidity: sdkError.data?.code === 'INSUFFICIENT_LIQUIDITY',
            code: sdkError.data?.code
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