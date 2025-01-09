import { NextResponse } from 'next/server';
import { getActiveChains } from '@/config/chains';
import { headers } from 'next/headers';
import { getSiteContext } from '@/lib/config/routes';
import { isSpamContract } from '@/config/spamContracts';
import { calculateTokenPrice, calculateNativeTokenPrice } from '@/modules/tabbed-modules/currency/utils';
import type { ActiveChain } from '@/lib/simplehash';
import type { TokenBalance } from '@/types';

const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const chain = searchParams.get('chain');

  const headersList = headers();
  const host = headersList.get('host') || '';
  const siteContext = getSiteContext(host, new URL(request.url).pathname);

  console.log('Native-ERC20 route called with:', { 
    params: { address, chain },
    context: { host, siteContext }
  });

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  if (!SIMPLEHASH_API_KEY) {
    console.error('SIMPLEHASH_API_KEY is not set');
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  try {
    // Get active chains for querying
    const activeChains = getActiveChains();
    const chainString = chain && chain !== 'all' 
      ? chain 
      : activeChains.map(c => c.simplehashName).join(',');

    console.log('Fetching balances with chains:', chainString);

    // Build query parameters
    const params = new URLSearchParams({
      chains: chainString,
      wallet_addresses: address,
      include_prices: '1',
      include_native_tokens: '1'
    }).toString();

    // Make API call
    console.log('Making API call to SimpleHash...');
    
    const response = await fetch(`https://api.simplehash.com/api/v0/fungibles/balances?${params}`, {
      headers: {
        'X-API-KEY': SIMPLEHASH_API_KEY
      }
    });

    console.log('SimpleHash API response:', {
      status: response.status
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Balance error:', {
        status: response.status,
        error
      });
      throw new Error(`Balance error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log('Raw API data:', JSON.stringify(data, null, 2));

    // Transform the response into grouped balances by chain
    const groupedBalances: { [chain: string]: any[] } = {};
    
    // Process native tokens first
    if (data.native_tokens) {
      data.native_tokens.forEach((token: any) => {
        const chain = token.chain;
        console.log('Processing native token:', {
          chain,
          symbol: token.symbol,
          total_value_usd_cents: token.total_value_usd_cents,
          total_quantity_string: token.total_quantity_string
        });

        if (!groupedBalances[chain]) {
          groupedBalances[chain] = [];
        }

        // Calculate price and total value
        const totalValueUsd = token.total_value_usd_cents / 100;
        const priceUsd = calculateNativeTokenPrice(
          token.total_value_usd_cents, 
          token.total_quantity_string,
          token.decimals
        );

        groupedBalances[chain].push({
          chain,
          symbol: token.symbol,
          decimals: token.decimals,
          name: token.name,
          is_native: true,
          queried_wallet_balances: [{
            quantity_string: token.total_quantity_string,
            value_usd_string: totalValueUsd.toString()
          }],
          prices: [{
            value_usd_string: priceUsd,
            marketplace_name: 'SimpleHash'
          }]
        });
      });
    }
    
    // Process fungible tokens
    if (data.fungibles) {
      data.fungibles.forEach((token: any) => {
        const chain = token.chain;
        // Skip spam tokens
        if (isSpamContract(chain as ActiveChain, token.fungible_id)) {
          return;
        }

        if (!groupedBalances[chain]) {
          groupedBalances[chain] = [];
        }

        groupedBalances[chain].push({
          chain,
          symbol: token.symbol,
          fungible_id: token.fungible_id,
          decimals: token.decimals,
          name: token.name,
          is_native: false,
          queried_wallet_balances: token.queried_wallet_balances,
          prices: token.prices
        });
      });
    }

    // Get ETH price from native tokens if available
    const ethPrice = data.native_tokens?.find((t: any) => 
      t.chain === 'ethereum' && t.symbol === 'ETH'
    )?.value_per_native_token_usd_string;

    console.log('Successfully processed balances');

    return NextResponse.json({
      groupedBalances,
      ethPrice: ethPrice ? parseFloat(ethPrice) : null
    });

  } catch (error: any) {
    console.error('Native-ERC20 route error:', {
      message: error.message,
      stack: error.stack,
      status: error.response?.status,
      data: error.response?.data
    });

    // Check for specific error types
    if (error.message.includes('ECONNREFUSED')) {
      return NextResponse.json({ 
        error: 'Connection refused',
        details: 'Could not connect to SimpleHash API'
      }, { status: 503 });
    }

    if (error.message.includes('401')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Invalid API key'
      }, { status: 401 });
    }

    return NextResponse.json({ 
      error: 'Failed to fetch balances',
      details: error.message
    }, { status: 500 });
  }
}

function transformNativeTokens(nativeTokens: any[]): TokenBalance[] {
  return nativeTokens.map((token) => ({
    chain: token.chain,
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    quantity: token.total_quantity_string,
    price: calculateNativeTokenPrice(
      token.total_value_usd_cents,
      token.total_quantity_string,
      token.decimals
    ),
    value: token.total_value_usd_cents / 100,
    isNative: true,
    address: '',
    logo: '',
    queried_wallet_balances: token.queried_wallet_balances,
  }));
}
