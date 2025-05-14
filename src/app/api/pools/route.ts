import { NextResponse } from 'next/server';
import { pools } from '@/lib/database/pools';

// Force dynamic route to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get('contract');
    const poolTypeParam = searchParams.get('type');
    const poolType = poolTypeParam !== null ? poolTypeParam as 'uniswap' | 'balancer' | 'ensure' : undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam !== null ? parseInt(limitParam) : undefined;
    const pageParam = searchParams.get('page');
    const page = pageParam !== null ? parseInt(pageParam) : 1;
    const offset = page ? (page - 1) * (limit || 20) : undefined;

    // If contract address is provided, get specific pool
    if (contractAddress) {
      const pool = await pools.getByContract(contractAddress);
      if (!pool) {
        return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
      }
      return NextResponse.json(pool);
    }

    // Otherwise get all pools with optional filters
    const allPools = await pools.getAll({
      poolType,
      limit,
      offset
    });

    return NextResponse.json(allPools);
  } catch (error) {
    console.error('Error in pools API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pool details' },
      { status: 500 }
    );
  }
} 