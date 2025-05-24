import { sql } from '@vercel/postgres';
import { specificContract } from '@/modules/specific/config/ERC1155';
import type { SpecificMetadata } from '@/modules/specific/types';

interface SpecificCertificate {
  token_id: number;
  contract_address: string;
  chain: string;
  name: string;
  description: string | null;
  image: string;
  animation_url: string | null;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export const specificCertificates = {
  /**
   * Store metadata for a specific certificate
   */
  async storeMetadata(
    tokenId: string,
    metadata: SpecificMetadata
  ): Promise<void> {
    await sql`
      INSERT INTO certificates.specific (
        token_id,
        contract_address,
        chain,
        name,
        description,
        image,
        animation_url,
        mime_type
      ) VALUES (
        ${Number(tokenId)},
        ${specificContract.address},
        'base',
        ${metadata.name},
        ${metadata.description},
        ${metadata.image},
        ${metadata.animation_url || null},
        ${metadata.content?.mime || 'image/png'}
      )
      ON CONFLICT (token_id, contract_address) 
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        image = EXCLUDED.image,
        animation_url = EXCLUDED.animation_url,
        mime_type = EXCLUDED.mime_type,
        updated_at = NOW()
    `;
  },

  /**
   * Get metadata for a specific certificate
   */
  async getMetadata(tokenId: string): Promise<SpecificCertificate | null> {
    const { rows } = await sql`
      SELECT * FROM certificates.specific 
      WHERE token_id = ${Number(tokenId)}
      AND contract_address = ${specificContract.address}
    `;
    return rows[0] as SpecificCertificate || null;
  },

  /**
   * Get all specific certificates
   */
  async getAll(): Promise<SpecificCertificate[]> {
    const { rows } = await sql`
      SELECT * FROM certificates.specific 
      WHERE contract_address = ${specificContract.address}
    `;
    return rows as SpecificCertificate[];
  }
}; 