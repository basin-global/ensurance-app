import { sql } from '@vercel/postgres';

export const ensurance = {
  // Get minimal data for search results
  getSearchResults: async () => {
    try {
      // Get all certificates from specific table
      const result = await sql.query(`
        SELECT 
          s.token_id,
          s.name,
          s.chain
        FROM certificates.specific s
        JOIN certificates.specific_contracts sc ON s.chain = sc.chain
        ORDER BY s.token_id DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  // Get ALL certificates across all chains
  getAll: async () => {
    try {
      // Get all certificates from specific table
      const result = await sql.query(`
        SELECT 
          s.token_id,
          s.name,
          s.description,
          s.chain,
          s.image_ipfs,
          s.animation_url_ipfs,
          s.creator_reward_recipient,
          s.creator_reward_recipient_split,
          s.mime_type,
          sc.contract_address
        FROM certificates.specific s
        JOIN certificates.specific_contracts sc ON s.chain = sc.chain
        ORDER BY s.token_id DESC
      `);
      
      return result.rows.map(row => ({
        ...row,
        collection: { name: 'Ensurance' },
        nft_id: `${row.chain}-${row.token_id}`,
        image_url: row.image_ipfs ? `https://ipfs.io/ipfs/${row.image_ipfs}` : null,
        video_url: row.mime_type?.startsWith('video/') ? `https://ipfs.io/ipfs/${row.animation_url_ipfs}` : null
      }));
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  // Get certificates for a specific chain
  getByChain: async (chain: string) => {
    try {
      // Verify chain is supported
      const chainResult = await sql.query(`
        SELECT contract_address FROM certificates.specific_contracts WHERE chain = $1 LIMIT 1
      `, [chain]);
      
      if (chainResult.rows.length === 0) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      const result = await sql.query(`
        SELECT 
          s.token_id,
          s.name,
          s.description,
          s.chain,
          s.image_ipfs,
          s.animation_url_ipfs,
          s.creator_reward_recipient,
          s.creator_reward_recipient_split,
          s.mime_type,
          sc.contract_address
        FROM certificates.specific s
        JOIN certificates.specific_contracts sc ON s.chain = sc.chain
        WHERE s.chain = $1
        ORDER BY s.token_id DESC
      `, [chain]);
      
      return result.rows.map(row => ({
        ...row,
        collection: { name: 'Ensurance' },
        nft_id: `${row.chain}-${row.token_id}`,
        image_url: row.image_ipfs ? `https://ipfs.io/ipfs/${row.image_ipfs}` : null,
        video_url: row.mime_type?.startsWith('video/') ? `https://ipfs.io/ipfs/${row.animation_url_ipfs}` : null
      }));
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  // Get single certificate
  getByChainAndTokenId: async (chain: string, tokenId: string) => {
    try {
      // Verify chain is supported
      const chainResult = await sql.query(`
        SELECT contract_address FROM certificates.specific_contracts WHERE chain = $1 LIMIT 1
      `, [chain]);
      
      if (chainResult.rows.length === 0) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      const result = await sql.query(`
        SELECT 
          s.token_id,
          s.name,
          s.description,
          s.chain,
          s.image_ipfs,
          s.animation_url_ipfs,
          s.creator_reward_recipient,
          s.creator_reward_recipient_split,
          s.mime_type,
          sc.contract_address
        FROM certificates.specific s
        JOIN certificates.specific_contracts sc ON s.chain = sc.chain
        WHERE s.chain = $1 AND s.token_id = $2
        LIMIT 1
      `, [chain, tokenId]);
      
      if (!result.rows[0]) return null;
      
      const row = result.rows[0];
      return {
        ...row,
        collection: { name: 'Ensurance' },
        nft_id: `${row.chain}-${row.token_id}`,
        image_url: row.image_ipfs ? `https://ipfs.io/ipfs/${row.image_ipfs}` : null,
        video_url: row.mime_type?.startsWith('video/') ? `https://ipfs.io/ipfs/${row.animation_url_ipfs}` : null
      };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
}; 