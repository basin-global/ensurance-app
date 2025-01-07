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
  },
  timeout: 30000,
  maxRedirects: 5
});

// Core NFT fetching functionality
export async function fetchNFTsByAddress(address: string, chains = ACTIVE_CHAINS) {
  try {
    console.log('fetchNFTsByAddress called with:');
    console.log('- address:', address);
    console.log('- chains param:', chains);
    console.log('- ACTIVE_CHAINS constant:', ACTIVE_CHAINS);
    console.log('- API Key present:', !!SIMPLEHASH_API_KEY);

    if (!SIMPLEHASH_API_KEY) {
      throw new Error('SIMPLEHASH_API_KEY is not set');
    }

    const params: NFTParams = {
      wallet_addresses: address,
      chains,
      queried_wallet_balances: 1,
      limit: 50
    };

    console.log('Attempting fetch with native fetch API as fallback');
    const queryString = new URLSearchParams({
      wallet_addresses: address,
      chains: chains?.toString() || ACTIVE_CHAINS,
      queried_wallet_balances: '1',
      limit: '50'
    }).toString();

    const response = await fetch(`https://api.simplehash.com/api/v0/nfts/owners_v2?${queryString}`, {
      headers: {
        'X-API-KEY': SIMPLEHASH_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response received successfully');
    return data;
  } catch (error: any) {
    console.error('Error in fetchNFTsByAddress:', error);
    throw error;
  }
}

// NFT details fetching
export async function fetchNFTDetails(chain: string, contractAddress: string, tokenId: string) {
  try {
    const response = await simpleHashApi.get(`/nfts/${chain}/${contractAddress}/${tokenId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching NFT details:', error);
    throw error;
  }
}

// Contract NFTs fetching
export async function fetchNFTsByContract(chain: string, contractAddress: string) {
  try {
    const response = await simpleHashApi.get(`/nfts/${chain}/${contractAddress}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching NFTs for ${chain}/${contractAddress}:`, error);
    throw error;
  }
}

/*
 * Future expansion areas:
 * - ERC20 balances
 * - Native token balances
 * - ENS resolution
 * - NFT assets
 * Each will be added as needed with proper typing and error handling
 */
