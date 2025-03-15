import { sql } from '@vercel/postgres';

interface GeneralCertificate {
  contract_address: string;
  chain: string;
  symbol: string;
  decimals: number;
  type: string;
}

export const ensurance = {
  async getAll(): Promise<GeneralCertificate[]> {
    const result = await sql.query(`
      SELECT contract_address, chain, symbol, decimals, type
      FROM ensurance_general
      ORDER BY chain, contract_address
    `);
    return result.rows;
  },

  async getByChain(chain: string): Promise<GeneralCertificate[]> {
    const result = await sql.query(`
      SELECT contract_address, chain, symbol, decimals, type
      FROM ensurance_general
      WHERE chain = $1
      ORDER BY contract_address
    `, [chain]);
    return result.rows;
  },

  async getByContractAddress(chain: string, contractAddress: string): Promise<GeneralCertificate | null> {
    const result = await sql.query(`
      SELECT contract_address, chain, symbol, decimals, type
      FROM ensurance_general
      WHERE chain = $1 AND contract_address = $2
      LIMIT 1
    `, [chain, contractAddress]);
    return result.rows[0] || null;
  }
}; 