import { sql } from '@vercel/postgres';

export interface ProceedsAddress {
  address: string;
  name: string | null;
  type: 'split' | 'stream' | 'swapper' | 'team' | 'source';
  description: string | null;
}

export const proceeds = {
  /**
   * Get all named addresses from proceeds tables
   */
  async getNames() {
    try {
      console.log('Executing database query...');
      const result = await sql`
        WITH all_addresses AS (
          SELECT LOWER(contract_address) as address, name, description, 'split' as type 
          FROM proceeds.splits 
          WHERE chain = 'base' AND name IS NOT NULL
          UNION ALL
          SELECT LOWER(contract_address) as address, name, description, 'stream' as type 
          FROM proceeds.streams 
          WHERE chain = 'base' AND name IS NOT NULL
          UNION ALL
          SELECT LOWER(contract_address) as address, name, description, 'swapper' as type 
          FROM proceeds.swappers 
          WHERE chain = 'base' AND name IS NOT NULL
          UNION ALL
          SELECT LOWER(contract_address) as address, name, description, 'team' as type 
          FROM proceeds.teams 
          WHERE chain = 'base' AND name IS NOT NULL
        ),
        sources AS (
          SELECT 
            'source_' || id::text as address,
            name,
            description,
            'source' as type
          FROM proceeds.sources
          WHERE name IS NOT NULL
        )
        SELECT DISTINCT address, name, description, type
        FROM (
          SELECT * FROM all_addresses
          UNION ALL
          SELECT * FROM sources
        ) combined
        ORDER BY type, name;
      `;
      console.log('Query executed, result:', result);
      return result.rows as ProceedsAddress[];
    } catch (error) {
      console.error('Database error in getNames:', error);
      throw error;
    }
  },

  /**
   * Get all proceeds data for an address
   */
  async getByAddress(address: string) {
    // Check if this is a source address
    if (address.startsWith('source_')) {
      const sourceId = address.replace('source_', '');
      const sourceResult = await sql`
        SELECT * FROM proceeds.sources
        WHERE id = ${sourceId}
      `;
      return {
        source: sourceResult.rows[0] || null
      };
    }

    // Get split data
    const splitResult = await sql`
      SELECT * FROM proceeds.splits 
      WHERE contract_address = ${address}
      AND chain = 'base'
    `;

    // Get stream data
    const streamResult = await sql`
      SELECT * FROM proceeds.streams
      WHERE contract_address = ${address}
      AND chain = 'base'
    `;

    // Get swapper data
    const swapperResult = await sql`
      SELECT * FROM proceeds.swappers
      WHERE contract_address = ${address}
      AND chain = 'base'
    `;

    // Get team data
    const teamResult = await sql`
      SELECT * FROM proceeds.teams
      WHERE contract_address = ${address}
      AND chain = 'base'
    `;

    return {
      split: splitResult.rows[0] || null,
      stream: streamResult.rows[0] || null,
      swapper: swapperResult.rows[0] || null,
      team: teamResult.rows[0] || null
    };
  }
}; 