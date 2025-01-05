import { sql } from '@vercel/postgres';

export const ensurance = {
  // Get minimal data for search results
  getSearchResults: async () => {
    try {
      // Use a CTE (Common Table Expression) to materialize the results
      const result = await sql.query(`
        WITH search_data AS MATERIALIZED (
          SELECT 
            token_id,
            name,
            'base' as chain
          FROM ensurance_base
          UNION ALL
          SELECT 
            token_id,
            name,
            'zora' as chain
          FROM ensurance_zora
          UNION ALL
          SELECT 
            token_id,
            name,
            'arbitrum' as chain
          FROM ensurance_arbitrum
          UNION ALL
          SELECT 
            token_id,
            name,
            'optimism' as chain
          FROM ensurance_optimism
        )
        SELECT * FROM search_data
        ORDER BY token_id DESC
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
      // First get all supported chains from the ensurance table
      const chainsResult = await sql.query(`
        SELECT DISTINCT chain 
        FROM ensurance 
        ORDER BY chain
      `);
      const supportedChains = chainsResult.rows.map(row => row.chain);
      
      let allCertificates = [];
      
      // Query each chain's table sequentially
      for (const chain of supportedChains) {
        const result = await sql.query(`
          SELECT 
            token_id,
            name,
            description,
            image_ipfs,
            animation_url_ipfs,
            creator_reward_recipient,
            creator_reward_recipient_split,
            mime_type,
            $1 as chain
          FROM ensurance_${chain}
          ORDER BY token_id DESC
        `, [chain]);
        
        const certificates = result.rows.map(row => ({
          ...row,
          collection: { name: 'Ensurance' },
          nft_id: `${chain}-${row.token_id}`,
          image_url: row.image_ipfs ? `https://ipfs.io/ipfs/${row.image_ipfs}` : null,
          video_url: row.mime_type?.startsWith('video/') ? `https://ipfs.io/ipfs/${row.animation_url_ipfs}` : null,
          contract_address: 'ensurance'
        }));
        
        allCertificates = [...allCertificates, ...certificates];
      }
      
      // Sort by token ID (highest first)
      return allCertificates.sort((a, b) => Number(b.token_id) - Number(a.token_id));
      
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  // Get certificates for a specific chain
  getByChain: async (chain: string) => {
    // Verify chain is supported
    const chainResult = await sql.query(`
      SELECT 1 FROM ensurance WHERE chain = $1 LIMIT 1
    `, [chain]);
    
    if (chainResult.rows.length === 0) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    const result = await sql.query(`
      SELECT 
        token_id,
        name,
        description,
        image_ipfs,
        animation_url_ipfs,
        creator_reward_recipient,
        creator_reward_recipient_split,
        mime_type
      FROM ensurance_${chain}
      ORDER BY token_id DESC
    `);
    
    return result.rows.map(row => ({
      ...row,
      chain,
      collection: { name: 'Ensurance' },
      nft_id: `${chain}-${row.token_id}`,
      image_url: row.image_ipfs ? `https://ipfs.io/ipfs/${row.image_ipfs}` : null,
      video_url: row.mime_type?.startsWith('video/') ? `https://ipfs.io/ipfs/${row.animation_url_ipfs}` : null,
      contract_address: 'ensurance'
    }));
  },

  // Get single certificate
  getByChainAndTokenId: async (chain: string, tokenId: string) => {
    // Verify chain is supported
    const chainResult = await sql.query(`
      SELECT 1 FROM ensurance WHERE chain = $1 LIMIT 1
    `, [chain]);
    
    if (chainResult.rows.length === 0) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    const result = await sql.query(`
      SELECT 
        token_id,
        name,
        description,
        image_ipfs,
        animation_url_ipfs,
        creator_reward_recipient,
        creator_reward_recipient_split,
        mime_type
      FROM ensurance_${chain}
      WHERE token_id = $1
      LIMIT 1
    `, [tokenId]);
    
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      chain,
      collection: { name: 'Ensurance' },
      nft_id: `${chain}-${row.token_id}`,
      image_url: row.image_ipfs ? `https://ipfs.io/ipfs/${row.image_ipfs}` : null,
      video_url: row.mime_type?.startsWith('video/') ? `https://ipfs.io/ipfs/${row.animation_url_ipfs}` : null,
      contract_address: 'ensurance'
    };
  }
}; 