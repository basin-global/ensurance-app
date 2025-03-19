import { sql } from '@vercel/postgres';

export const ensurance = {
  // Get minimal data for search results
  getSearchResults: async () => {
    try {
      // Get all certificates from specific_certificates table
      const result = await sql.query(`
        SELECT 
          sc.token_id,
          sc.name,
          sc.chain
        FROM specific_certificates sc
        JOIN ensurance_specific_contracts esc ON sc.chain = esc.chain
        ORDER BY sc.token_id DESC
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
      // Get all certificates from specific_certificates table
      const result = await sql.query(`
        SELECT 
          sc.token_id,
          sc.name,
          sc.description,
          sc.chain,
          sc.image_ipfs,
          sc.animation_url_ipfs,
          sc.creator_reward_recipient,
          sc.creator_reward_recipient_split,
          sc.mime_type,
          esc.contract_address
        FROM specific_certificates sc
        JOIN ensurance_specific_contracts esc ON sc.chain = esc.chain
        ORDER BY sc.token_id DESC
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
        SELECT contract_address FROM ensurance_specific_contracts WHERE chain = $1 LIMIT 1
      `, [chain]);
      
      if (chainResult.rows.length === 0) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      const result = await sql.query(`
        SELECT 
          sc.token_id,
          sc.name,
          sc.description,
          sc.chain,
          sc.image_ipfs,
          sc.animation_url_ipfs,
          sc.creator_reward_recipient,
          sc.creator_reward_recipient_split,
          sc.mime_type,
          esc.contract_address
        FROM specific_certificates sc
        JOIN ensurance_specific_contracts esc ON sc.chain = esc.chain
        WHERE sc.chain = $1
        ORDER BY sc.token_id DESC
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
        SELECT contract_address FROM ensurance_specific_contracts WHERE chain = $1 LIMIT 1
      `, [chain]);
      
      if (chainResult.rows.length === 0) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      const result = await sql.query(`
        SELECT 
          sc.token_id,
          sc.name,
          sc.description,
          sc.chain,
          sc.image_ipfs,
          sc.animation_url_ipfs,
          sc.creator_reward_recipient,
          sc.creator_reward_recipient_split,
          sc.mime_type,
          esc.contract_address
        FROM specific_certificates sc
        JOIN ensurance_specific_contracts esc ON sc.chain = esc.chain
        WHERE sc.chain = $1 AND sc.token_id = $2
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