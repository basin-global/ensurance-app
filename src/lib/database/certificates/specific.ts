/**
 * TRIAL CODE - NOT FOR PRODUCTION
 * 
 * TODO:
 * - Review and test all database operations
 * - Add proper error handling
 * - Add validation for input parameters
 * - Consider adding batch operations for efficiency
 * - Add proper logging
 * - Add proper transaction handling
 */

import { sql } from '@vercel/postgres';
import { client } from '@/modules/admin/sync/service';
import type { SyncResult } from '@/modules/admin/sync/types';

interface SpecificCertificate {
  contract_address: string;
  chain: string;
  token_id: string;
  name: string | null;
  description: string | null;
  image_uri: string | null;
  metadata_uri: string | null;
  owner_address: string | null;
  last_sync: Date | null;
}

export const ensurance = {
  /**
   * Get minimal data for search results
   */
  async getSearchResults() {
    try {
      const { rows } = await sql`
        SELECT DISTINCT
          name,
          contract_address,
          token_id,
          owner_address
        FROM certificates.specific 
        WHERE chain = 'base'
        AND name IS NOT NULL
        ORDER BY name
      `;
      return rows;
    } catch (error) {
      console.error('Error fetching search results:', error);
      return [];
    }
  },

  /**
   * Get all specific certificates that need syncing
   */
  async getCertificatesForSync(empty_only: boolean = false): Promise<SpecificCertificate[]> {
    const query = empty_only 
      ? sql`SELECT * FROM certificates.specific WHERE chain = 'base' AND (name IS NULL OR metadata_uri IS NULL)`
      : sql`SELECT * FROM certificates.specific WHERE chain = 'base'`;

    const { rows } = await query;
    return rows as SpecificCertificate[];
  },

  /**
   * Update certificate with on-chain data
   */
  async updateFromChain(cert: SpecificCertificate, data: {
    name: string;
    description: string;
    image_uri: string;
    metadata_uri: string;
    owner_address: string;
  }): Promise<void> {
    await sql`
      UPDATE certificates.specific 
      SET 
        name = ${data.name},
        description = ${data.description},
        image_uri = ${data.image_uri},
        metadata_uri = ${data.metadata_uri},
        owner_address = ${data.owner_address},
        last_sync = NOW()
      WHERE 
        contract_address = ${cert.contract_address} 
        AND chain = ${cert.chain}
        AND token_id = ${cert.token_id}
    `;
  },

  /**
   * Get all specific certificates
   */
  async getAll(): Promise<SpecificCertificate[]> {
    const { rows } = await sql`SELECT * FROM certificates.specific`;
    return rows as SpecificCertificate[];
  },

  /**
   * Get single certificate by contract address and token ID
   */
  async getByContractAndToken(contract_address: string, token_id: string): Promise<SpecificCertificate | null> {
    const { rows } = await sql`
      SELECT * FROM certificates.specific 
      WHERE contract_address = ${contract_address}
      AND token_id = ${token_id}
    `;
    return rows[0] as SpecificCertificate || null;
  },

  /**
   * Get all certificates owned by an address
   */
  async getByOwner(owner_address: string): Promise<SpecificCertificate[]> {
    const { rows } = await sql`
      SELECT * FROM certificates.specific 
      WHERE owner_address = ${owner_address}
    `;
    return rows as SpecificCertificate[];
  }
};