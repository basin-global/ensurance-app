import { sql } from '@vercel/postgres';
import { ensurance } from '@/lib/database/queries/ensurance';
import { ensuranceContracts } from '@/modules/ensurance/config';

export type EnsuranceChain = 'base' | 'zora' | 'arbitrum' | 'optimism';

export interface EnsuranceCertificate {
  token_id: string;
  name: string;
  description: string;
  image_ipfs: string;
  animation_url_ipfs: string;
  creator_reward_recipient: string;
  creator_reward_recipient_split: string;
  mime_type: string;
  chain: EnsuranceChain;
  nft_id: string;
  image_url: string | null;
  video_url: string | null;
  contract_address: string;
}

// Get certificate details
export const getCertificate = async (chain: EnsuranceChain, tokenId: string) => {
  return ensurance.getByChainAndTokenId(chain, tokenId);
};

// Get all certificates for a chain
export const getChainCertificates = async (chain: EnsuranceChain) => {
  return ensurance.getByChain(chain);
}; 