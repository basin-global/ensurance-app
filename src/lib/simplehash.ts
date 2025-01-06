import axios from 'axios';
import { getActiveChains } from '@/config/chains';
import { isSpamContract } from '@/config/spamContracts';
import { getApiPrefix } from '@/lib/config/routes';
import { useSite } from '@/contexts/site-context';

const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY;
const ACTIVE_CHAINS = getActiveChains().map(chain => chain.simplehashName).join(',');

console.log('Active chains:', ACTIVE_CHAINS);
console.log('SimpleHash library loaded');

// Helper function to get the correct API path prefix
function getApiPathPrefix() {
  if (typeof window === 'undefined') return '/api'; // Server-side
  
  // Client-side
  const isDev = process.env.NODE_ENV === 'development';
  const hostname = window.location.hostname;
  const isOnchainAgents = hostname.includes('onchain-agents.ai') || 
    (isDev && window.location.pathname.split('/')[1] === 'site-onchain-agents');
  
  // In production, API calls don't need the /onchain-agents prefix
  // Only need the prefix in development for onchain-agents
  return isOnchainAgents && isDev ? '/site-onchain-agents/api' : '/api';
}

export const simpleHashApi = axios.create({
  baseURL: 'https://api.simplehash.com/api/v0',
  headers: {
    'X-API-KEY': SIMPLEHASH_API_KEY,
  },
});

export type ActiveChain = string; // Rename this type

// Add a type for the SimpleHash API response
interface SimpleHashResponse {
  nfts: any[];
  next?: string;
}

// Add pagination parameters type
interface PaginationParams {
  limit?: number;
  cursor?: string;
  fetchAll?: boolean;
}

export async function fetchNFTsByAddress(
  address: string, 
  chain?: ActiveChain,
  pagination: PaginationParams = { limit: 50, fetchAll: false }
) {
  try {
    const params: any = {
      wallet_addresses: address,
      chains: chain || ACTIVE_CHAINS,
      queried_wallet_balances: 1,
      limit: pagination.limit || 50
    };

    if (pagination.cursor) {
      params.cursor = pagination.cursor;
    }

    // If chain is specified or fetchAll is true, get all NFTs
    const shouldFetchAll = pagination.fetchAll || !!chain;

    let allNfts: any[] = [];
    let hasMore = true;
    let cursor = undefined;

    do {
      if (cursor) {
        params.cursor = cursor;
      }

      const response = await simpleHashApi.get<SimpleHashResponse>('/nfts/owners_v2', { params });
      const { nfts, next } = response.data;
      
      allNfts = [...allNfts, ...nfts];
      cursor = next;
      hasMore = !!next && shouldFetchAll;

    } while (hasMore);

    // Filter spam after getting all NFTs
    const filteredNfts = allNfts.filter((nft: any) => {
      return !isSpamContract(nft.chain, nft.contract_address);
    });

    return {
      nfts: filteredNfts,
      next: cursor // Return cursor for potential future pagination
    };
  } catch (error) {
    console.error('Error in fetchNFTsByAddress:', error);
    throw error;
  }
}

export async function fetchNFTDetails(chain: ActiveChain, contractAddress: string, tokenId: string) {
  try {
    const response = await simpleHashApi.get(`/nfts/${chain}/${contractAddress}/${tokenId}`);
    console.log('SimpleHash NFT Details Raw Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error fetching NFT details:', error);
    throw error;
  }
}

export async function fetchERC20Balances(tbaAddress: string) {
  console.log('fetchERC20Balances: Called with tbaAddress:', tbaAddress);
  try {
    console.log('Chains to query:', ACTIVE_CHAINS);

    const url = `/fungibles/balances?chains=${ACTIVE_CHAINS}&wallet_addresses=${tbaAddress}&include_prices=1`;
    console.log('SimpleHash API URL:', `${simpleHashApi.defaults.baseURL}${url}`);

    const response = await simpleHashApi.get(url);
    const data = response.data;

    const chainsInResponse = Array.from(new Set(data.fungibles.map((token: any) => token.chain)));
    console.log('Chains in response:', chainsInResponse);

    const missingChains = ACTIVE_CHAINS.split(',').filter(chain => !chainsInResponse.includes(chain));
    console.log('Missing chains:', missingChains);

    // Log all Polygon tokens before filtering
    const polygonTokens = data.fungibles.filter((token: any) => token.chain === 'polygon');
    console.log('All Polygon tokens before filtering:', polygonTokens);

    // Filter out spam tokens
    const filteredTokens = data.fungibles.filter((token: any) => {
      const isSpam = isSpamContract(token.chain, token.fungible_id);
      if (token.chain === 'polygon') {
        console.log(`Polygon token ${token.fungible_id}: isSpam = ${isSpam}`);
      }
      return !isSpam;
    });

    // Log Polygon tokens after filtering
    const filteredPolygonTokens = filteredTokens.filter((token: any) => token.chain === 'polygon');
    console.log('Filtered Polygon tokens:', filteredPolygonTokens);

    console.log('Filtered tokens count:', filteredTokens.length);

    // Add empty arrays for missing chains
    const result = { ...data, fungibles: filteredTokens };
    missingChains.forEach(chain => {
      if (!result[chain]) {
        result[chain] = [];
      }
    });

    return result;
  } catch (error) {
    console.error('Error fetching ERC20 balances:', error);
    throw error;
  }
}

export async function fetchNativeBalances(tbaAddress: string) {
  console.log('fetchNativeBalances: Called with tbaAddress:', tbaAddress);
  try {
    const url = `/native_tokens/balances?chains=${ACTIVE_CHAINS}&wallet_addresses=${tbaAddress}`;
    console.log('SimpleHash API URL for native tokens:', `${simpleHashApi.defaults.baseURL}${url}`);

    const response = await simpleHashApi.get(url);
    const data = response.data;

    console.log('Native tokens count:', data.native_tokens.length);

    return data.native_tokens;
  } catch (error) {
    console.error('Error fetching native balances:', error);
    throw error;
  }
}

export async function fetchAllBalances(address: string) {
  try {
    const [erc20Data, nativeTokens] = await Promise.all([
      fetchERC20Balances(address),
      fetchNativeBalances(address)
    ]);

    // Combine ERC20 and native tokens
    const combinedTokens = [...nativeTokens, ...erc20Data.fungibles];

    // Group tokens by chain
    const groupedTokens = combinedTokens.reduce((acc, token) => {
      if (!acc[token.chain]) {
        acc[token.chain] = [];
      }
      acc[token.chain].push(token);
      return acc;
    }, {} as Record<string, any[]>);

    return { ...erc20Data, fungibles: combinedTokens, groupedBalances: groupedTokens };
  } catch (error) {
    console.error('Error fetching all balances:', error);
    throw error;
  }
}

export async function fetchNFTsByContract(chain: string, contractAddress: string) {
  try {
    const apiPrefix = getApiPathPrefix();
    // Use our API route instead of direct SimpleHash call
    const response = await fetch(`${apiPrefix}/simplehash/nft?chain=${chain}&contractAddress=${contractAddress}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch NFTs from API');
    }

    const data = await response.json();
    
    if (!data || !data.nfts) {
      throw new Error('Invalid response format from API');
    }

    // Transform the data to match the format expected by AssetCard
    const transformedNfts = data.nfts.map((nft: any) => ({
      ...nft,
      // Ensure all required fields are present
      nft_id: nft.nft_id || `${chain}-${contractAddress}-${nft.token_id}`,
      name: nft.name || 'Unnamed NFT',
      image_url: nft.image_url || '',
      collection: nft.collection || { name: 'Unknown Collection' },
      contract_address: nft.contract_address || contractAddress,
      token_id: nft.token_id || '',
      chain: nft.chain || chain,
      contract: nft.contract || { type: 'ERC1155' },
      owners: nft.owners || []
    }));

    console.log('Transformed NFTs:', transformedNfts);
    return transformedNfts;
  } catch (error) {
    console.error(`Error fetching NFTs for ${chain}/${contractAddress}:`, error);
    throw error;
  }
}

export async function fetchENSName(address: string): Promise<string | null> {
  console.log('fetchENSName function called');
  try {
    const apiPrefix = getApiPathPrefix();
    const response = await fetch(`${apiPrefix}/simplehash/ens?address=${address}`);
    if (!response.ok) throw new Error('Failed to fetch ENS name');
    const data = await response.json();
    return data.name || null;
  } catch (error) {
    console.error('fetchENSName - Error:', error);
    return null;
  }
}

export async function fetchNFTAssets(nftIds: string) {
  try {
    console.log('Fetching NFT assets for IDs:', nftIds);
    const apiPrefix = getApiPathPrefix();
    const response = await fetch(`${apiPrefix}/simplehash/nft/assets?nft_ids=${nftIds}`);
    if (!response.ok) throw new Error('Failed to fetch NFT assets');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching NFT assets:', error);
    throw error;
  }
}

export async function fetchENSAddress(ensName: string): Promise<string | null> {
  try {
    const apiPrefix = getApiPathPrefix();
    const response = await fetch(`${apiPrefix}/simplehash/ens?name=${ensName}`);
    if (!response.ok) throw new Error('Failed to fetch ENS address');
    const data = await response.json();
    return data.address || null;
  } catch (error) {
    console.error('Error fetching ENS address:', error);
    return null;
  }
}

// Add this new version that uses our API routes
export async function fetchNFTsByContracts(
  address: string,
  contracts: Record<string, string>,
  selectedChain?: string
) {
  try {
    // If selectedChain is undefined, fetch all chains
    const chainsToFetch = selectedChain ? [selectedChain] : Object.keys(contracts);
    
    console.log('=== fetchNFTsByContracts DEBUG ===');
    console.log('Address:', address);
    console.log('Contracts:', contracts);
    console.log('Selected Chain:', selectedChain || 'all chains');
    console.log('Chains to fetch:', chainsToFetch);
    
    const fetchPromises = chainsToFetch.map(async (chain) => {
      const nfts = await fetchNFTsByContract(chain, contracts[chain]);
      console.log(`Chain ${chain} - Found ${nfts.length} NFTs`);
      return nfts;
    });

    const results = await Promise.all(fetchPromises);
    const flatResults = results.flat();
    console.log('Total NFTs found:', flatResults.length);
    return flatResults;
  } catch (error) {
    console.error('Error in fetchNFTsByContracts:', error);
    throw error;
  }
}
