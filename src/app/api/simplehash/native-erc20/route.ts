import { NextResponse } from 'next/server';
import { getActiveChains } from '@/config/chains';
import { headers } from 'next/headers';
import { isSpamContract } from '@/config/spamContracts';
import { calculateTokenPrice, calculateNativeTokenPrice } from '@/modules/account-modules/currency/utils';
import type { ActiveChain } from '@/lib/simplehash';
import type { TokenBalance } from '@/types';

const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  return NextResponse.json({
    message: "API migration in progress - Token balance functionality will be restored soon",
    balances: []
  });
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
