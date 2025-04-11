import { sql } from '@vercel/postgres';

interface Pool {
  contract_address: string;
  name: string;
  pool_type: 'balancer' | 'uniswap' | 'ensure';
  tokens?: string[];
  pair_token?: string;
  dex_type?: 'uniswap_v3' | 'uniswap_v4' | 'aerodrome';
}

export const pools = {
  /**
   * Get pool info by certificate contract address
   */
  async getByContract(contractAddress: string): Promise<Pool | null> {
    // Try balancer first
    const { rows: [balancerPool] } = await sql`
      SELECT 
        contract_address,
        name,
        'balancer' as pool_type,
        tokens
      FROM pools.balancer
      WHERE contract_address = ${contractAddress}
      LIMIT 1
    `;
    
    if (balancerPool) {
      return balancerPool as Pool;
    }

    // Try ensure pools
    const { rows: [ensurePool] } = await sql`
      SELECT 
        contract_address,
        name,
        'ensure' as pool_type,
        pair_token,
        dex_type
      FROM pools.ensure
      WHERE contract_address = ${contractAddress}
      LIMIT 1
    `;

    if (ensurePool) {
      return ensurePool as Pool;
    }

    // Try uniswap
    const { rows: [uniswapPool] } = await sql`
      SELECT 
        pool_address as contract_address,
        name,
        'uniswap' as pool_type
      FROM certificates.general
      WHERE pool_address = ${contractAddress}
      LIMIT 1
    `;

    return uniswapPool as Pool || null;
  },

  /**
   * Get all pools with optional filters
   */
  async getAll(options?: {
    poolType?: 'uniswap' | 'balancer' | 'ensure';
    limit?: number;
    offset?: number;
  }): Promise<Pool[]> {
    // Get balancer pools
    const { rows: balancerPools } = await sql`
      SELECT 
        contract_address,
        name,
        'balancer' as pool_type,
        tokens
      FROM pools.balancer
      ORDER BY name ASC
    `;

    // Get ensure pools
    const { rows: ensurePools } = await sql`
      SELECT 
        contract_address,
        name,
        'ensure' as pool_type,
        pair_token,
        dex_type
      FROM pools.ensure
      ORDER BY name ASC
    `;

    // Get uniswap pools
    const { rows: uniswapPools } = await sql`
      SELECT 
        pool_address as contract_address,
        name || '/ETH' as name,
        'uniswap' as pool_type
      FROM certificates.general
      WHERE pool_address IS NOT NULL
      ORDER BY name ASC
    `;
    
    // Combine and filter based on pool type
    let allPools = [...balancerPools, ...ensurePools, ...uniswapPools] as Pool[];
    
    if (options?.poolType) {
      allPools = allPools.filter(pool => pool.pool_type === options.poolType);
    }

    return allPools;
  },

  /**
   * Update pool metrics
   */
  async updateMetrics(poolAddress: string, data: {
    total_value_locked?: string;
    volume_24h?: string;
    fees_24h?: string;
  }): Promise<void> {
    // We'll implement this later when we add these columns
    return;
  }
}; 