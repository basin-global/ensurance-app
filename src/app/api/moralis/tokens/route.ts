import { NextResponse } from 'next/server';
import { getActiveChains } from '@/config/chains';
import { headers } from 'next/headers';
import { fetchTokenBalances } from '@/lib/moralis';
import type { TokenBalance } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const chain = searchParams.get('chain') || 'base';

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    const response = await fetchTokenBalances(address, chain);

    // Transform the response to match our existing TokenBalance type
    const transformedTokens = response.result
      .filter(token => !token.possible_spam)
      .map((token): TokenBalance => ({
        chain: chain,
        name: token.name,
        symbol: token.symbol,
        decimals: parseInt(token.decimals),
        queried_wallet_balances: [{
          quantity_string: token.balance,
          value_usd_string: token.usd_value?.toString() || '0'
        }],
        // Optional fields
        fungible_id: token.token_address,
        prices: token.usd_price ? [{
          value_usd_string: token.usd_price.toString(),
          marketplace_name: 'moralis'
        }] : []
      }));

    return NextResponse.json({
      balances: transformedTokens,
      pagination: {
        cursor: response.cursor,
        page: response.page,
        page_size: response.page_size
      },
      block_number: response.block_number
    });

  } catch (error) {
    console.error('Error fetching token balances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token balances' },
      { status: 500 }
    );
  }
} 