import axios from 'axios';
import { getActiveChains } from '@/config/chains';

// Types
export type ActiveChain = string;

interface MoralisToken {
  token_address: string;
  symbol: string;
  name: string;
  logo?: string;
  thumbnail?: string;
  decimals: string;
  balance: string;
  possible_spam: boolean;
  verified_contract: boolean;
  balance_formatted: string;
  usd_price?: number;
  usd_price_24hr_percent_change?: number;
  usd_value?: number;
  native_token: boolean;
  portfolio_percentage: number;
}

interface MoralisResponse {
  cursor: string;
  page: number;
  page_size: number;
  block_number: number;
  result: MoralisToken[];
}

// Core Moralis client setup
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;

if (!MORALIS_API_KEY) {
  console.error('MORALIS_API_KEY is not set');
}

export const moralisApi = axios.create({
  baseURL: 'https://deep-index.moralis.io/api/v2.2',
  headers: {
    'X-API-Key': MORALIS_API_KEY,
  }
});

// Fetch both native and ERC20 token balances for a wallet
export const fetchTokenBalances = async (address: string, chain?: string): Promise<MoralisResponse> => {
  try {
    const response = await moralisApi.get(`/wallets/${address}/tokens`, {
      params: {
        chain: chain || 'base', // Default to Base if no chain specified
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching token balances:', error);
    throw error;
  }
}; 