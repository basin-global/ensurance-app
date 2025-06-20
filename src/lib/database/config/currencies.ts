import { sql } from '@vercel/postgres';
import { getCoin } from '@zoralabs/coins-sdk';
import { base } from 'viem/chains';

interface Currency {
  address: string;
  chain: string;
  symbol: string;
  name: string;
  decimals: number;
  is_active: boolean;
  token_uri?: string;
  img_fallback?: string;
  last_market_update?: string;
  market_data?: any;
}

export const currencies = {
  /**
   * Get all active currencies
   */
  async getAll(): Promise<Currency[]> {
    const { rows } = await sql`
      SELECT contract_address as address, symbol, decimals 
      FROM config.currencies 
      WHERE chain = 'base'
      ORDER BY symbol
    `;
    return rows as Currency[];
  },

  /**
   * Get single currency by address
   */
  async getByAddress(address: string): Promise<Currency | null> {
    const { rows } = await sql`
      SELECT * FROM config.currencies 
      WHERE contract_address = ${address}
    `;
    return rows[0] as Currency || null;
  },

  /**
   * Update currency market data
   */
  async updateMarketData(currency: Currency, data: {
    market_data: any;
  }): Promise<void> {
    await sql`
      UPDATE config.currencies 
      SET 
        market_data = ${JSON.stringify(data.market_data)},
        last_market_update = NOW()
      WHERE 
        address = ${currency.address} 
        AND chain = ${currency.chain}
    `;
  }
}; 