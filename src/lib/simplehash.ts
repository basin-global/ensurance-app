import axios from 'axios';
import { getActiveChains } from '@/config/chains';
import https from 'https';

// Types
export type ActiveChain = string;

interface SimpleHashResponse {
  nfts: any[];
  next?: string;
}

interface NFTParams {
  wallet_addresses?: string;
  chains?: string;
  queried_wallet_balances?: number;
  limit?: number;
  cursor?: string;
  contract_ids?: string;
}

// Core SimpleHash client setup
const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY;

if (!SIMPLEHASH_API_KEY) {
  console.error('SIMPLEHASH_API_KEY is not set');
}

const ACTIVE_CHAINS = getActiveChains().map(chain => chain.simplehashName).join(',');
console.log('SimpleHash initialized with ACTIVE_CHAINS:', ACTIVE_CHAINS);

export const simpleHashApi = axios.create({
  baseURL: 'https://api.simplehash.com/api/v0',
  headers: {
    'X-API-KEY': SIMPLEHASH_API_KEY,
  }
});

// Temporary override for API migration
export const fetchNFTsByAddress = async (address: string, chain?: string) => {
  return {
    nfts: [],
    next: null,
    previous: null,
    message: "API migration in progress - NFT functionality will be restored soon"
  };
};

export const fetchNFTDetails = async (chain: string, contractAddress: string, tokenId: string) => {
  return {
    message: "API migration in progress - NFT details will be restored soon"
  };
};

export const fetchNFTsByContract = async (chain: string, contractAddress: string) => {
  return {
    nfts: [],
    next: null,
    previous: null,
    message: "API migration in progress - Contract NFT functionality will be restored soon"
  };
};

/*
 * Future expansion areas:
 * - ERC20 balances
 * - Native token balances
 * - ENS resolution
 * - NFT assets
 * Each will be added as needed with proper typing and error handling
 */
