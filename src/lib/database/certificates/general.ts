import { sql } from '@vercel/postgres';
import { getCoin } from '@zoralabs/coins-sdk';
import { client } from '@/modules/admin/sync/service';
import ZORA_COIN_ABI from '@/abi/ZoraCoin.json';
import type { SyncResult, GeneralCertificateData } from '@/modules/admin/sync/types';

interface GeneralCertificate {
  contract_address: string;
  chain: string;
  name: string | null;
  symbol: string | null;
  decimals: number;
  token_uri: string | null;
  description: string | null;
  pool_address: string | null;
  total_volume?: string;
  volume_24h?: string;
  market_cap?: string;
  creator_earnings?: any[];
  unique_holders?: number;
  last_market_update?: string;
  payout_recipient?: string;
}

interface UpdateFromChainData {
  name: string;
  symbol: string;
  token_uri: string;
  description?: string;
  pool_address: string;
  payout_recipient: string;
}

// Helper function to convert IPFS URLs
const convertIpfsUrl = (url: string) => {
  if (!url) return undefined;
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/');
  }
  return url;
};

// Helper function to fetch metadata from token URI
const fetchMetadataFromUri = async (tokenUri: string): Promise<{ description?: string }> => {
  try {
    const metadataUrl = convertIpfsUrl(tokenUri);
    if (!metadataUrl) return {};
    
    const response = await fetch(metadataUrl);
    if (!response.ok) return {};
    
    const metadata = await response.json();
    return {
      description: metadata.description || undefined
    };
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
    return {};
  }
};

export const generalCertificates = {
  /**
   * Get all certificates that need syncing
   */
  async getCertificatesForSync(empty_only: boolean = false): Promise<GeneralCertificate[]> {
    const query = empty_only 
      ? sql`SELECT * FROM certificates.general WHERE chain = 'base' AND (name IS NULL OR symbol IS NULL OR token_uri IS NULL OR pool_address IS NULL OR payout_recipient IS NULL OR description IS NULL)`
      : sql`SELECT * FROM certificates.general WHERE chain = 'base'`;

    const { rows } = await query;
    return rows as GeneralCertificate[];
  },

  /**
   * Update certificate data from chain
   */
  async updateFromChain(cert: GeneralCertificate, data: {
    name: string;
    symbol: string;
    token_uri: string;
    description?: string;
    pool_address?: string;
    payout_recipient: string;
  }): Promise<void> {
    await sql`
      UPDATE certificates.general
      SET 
        name = ${data.name},
        symbol = ${data.symbol},
        token_uri = ${data.token_uri},
        description = ${data.description || null},
        pool_address = ${data.pool_address},
        payout_recipient = ${data.payout_recipient}
      WHERE contract_address = ${cert.contract_address}
    `;
  },

  /**
   * Update certificate with market data
   */
  async updateMarketData(cert: GeneralCertificate, data: {
    total_supply: string;
    total_volume: string;
    volume_24h: string;
    market_cap: string;
    creator_earnings: any[];
    unique_holders: number;
  }): Promise<void> {
    await sql`
      UPDATE certificates.general 
      SET 
        total_supply = ${data.total_supply},
        total_volume = ${data.total_volume},
        volume_24h = ${data.volume_24h},
        market_cap = ${data.market_cap},
        creator_earnings = ${JSON.stringify(data.creator_earnings)},
        unique_holders = ${data.unique_holders},
        last_market_update = NOW()
      WHERE 
        contract_address = ${cert.contract_address} 
        AND chain = ${cert.chain}
    `;
  },

  /**
   * Get all certificates with optional market data
   */
  async getAll(): Promise<GeneralCertificate[]> {
    const { rows } = await sql`SELECT * FROM certificates.general`;
    return rows as GeneralCertificate[];
  },

  /**
   * Get single certificate by contract address
   */
  async getByContractAddress(contract_address: string): Promise<GeneralCertificate | null> {
    const { rows } = await sql`
      SELECT * FROM certificates.general 
      WHERE contract_address = ${contract_address}
    `;
    return rows[0] as GeneralCertificate || null;
  },

  /**
   * Sync a single certificate's data from the blockchain
   */
  async syncFromChain(cert: GeneralCertificate): Promise<SyncResult> {
    try {
      // Get basic data from chain (these are common to both V3 and V4)
      const [name, symbol, tokenUri, payoutRecipient] = await Promise.all([
        client.readContract({
          address: cert.contract_address as `0x${string}`,
          abi: ZORA_COIN_ABI,
          functionName: 'name'
        }) as Promise<string>,
        client.readContract({
          address: cert.contract_address as `0x${string}`,
          abi: ZORA_COIN_ABI,
          functionName: 'symbol'
        }) as Promise<string>,
        client.readContract({
          address: cert.contract_address as `0x${string}`,
          abi: ZORA_COIN_ABI,
          functionName: 'tokenURI'
        }) as Promise<string>,
        client.readContract({
          address: cert.contract_address as `0x${string}`,
          abi: ZORA_COIN_ABI,
          functionName: 'payoutRecipient'
        }) as Promise<string>
      ]);

      // Try to get pool address (V3 only)
      let poolAddress: string | undefined;
      try {
        poolAddress = await client.readContract({
          address: cert.contract_address as `0x${string}`,
          abi: ZORA_COIN_ABI,
          functionName: 'poolAddress'
        }) as string;
      } catch (err) {
        // If poolAddress() fails, it's likely a V4 contract
        console.log(`No pool address for ${cert.contract_address} (likely V4 contract)`);
      }

      // Fetch description from token URI metadata
      let description: string | undefined;
      try {
        const metadata = await fetchMetadataFromUri(tokenUri);
        description = metadata.description;
      } catch (err) {
        console.log(`Failed to fetch metadata for ${cert.contract_address}:`, err);
      }

      // Update certificate in database
      await this.updateFromChain(cert, {
        name,
        symbol,
        token_uri: tokenUri,
        description,
        pool_address: poolAddress,
        payout_recipient: payoutRecipient
      });

      const data: GeneralCertificateData = {
        contract_address: cert.contract_address,
        chain: cert.chain,
        name,
        symbol,
        token_uri: tokenUri,
        description,
        pool_address: poolAddress,
        payout_recipient: payoutRecipient
      };

      return {
        id: cert.contract_address,
        status: 'success',
        data
      };

    } catch (err: any) {
      return {
        id: cert.contract_address,
        status: 'failed',
        error: err.message
      };
    }
  },

  /**
   * Sync multiple certificates with rate limiting
   */
  async syncBatch(certificates: GeneralCertificate[], options: { batchSize?: number; batchDelay?: number } = {}): Promise<SyncResult[]> {
    const { batchSize = 3, batchDelay = 500 } = options;
    const results: SyncResult[] = [];

    console.log(`Processing ${certificates.length} certificates in batches of ${batchSize}...`);

    for (let i = 0; i < certificates.length; i += batchSize) {
      const batch = certificates.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(certificates.length / batchSize);
      
      console.log(`\nProcessing batch ${batchNumber}/${totalBatches} (${batch.length} certificates)...`);
      console.log(`Addresses: ${batch.map(c => c.contract_address).join(', ')}`);
      
      // Process each certificate in the current batch in parallel
      const batchPromises = batch.map(cert => this.syncFromChain(cert));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Log batch results
      const batchSuccess = batchResults.filter(r => r.status === 'success').length;
      const batchFailed = batchResults.filter(r => r.status === 'failed').length;
      console.log(`Batch ${batchNumber} complete: ${batchSuccess} success, ${batchFailed} failed`);

      // Add delay between batches (except for the last batch)
      if (i + batchSize < certificates.length) {
        console.log(`Waiting ${batchDelay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    return results;
  }
};
