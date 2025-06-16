import { EnsuranceFlags } from '@/types';

export interface BaseToken {
  type: 'native' | 'erc20' | 'erc721' | 'erc1155';
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  value?: {
    usd: number | null;
    floorPrice?: number | null;
    floorPriceUsd?: number | null;
    averagePrice?: number | null;
    averagePriceUsd?: number | null;
  };
  ensurance?: EnsuranceFlags;
}

export interface NativeToken extends BaseToken {
  type: 'native';
  metadata?: {
    name?: string;
    image?: string;
  };
}

export interface ERC20Token extends BaseToken {
  type: 'erc20';
  contractAddress: string;
  metadata?: {
    name?: string;
    image?: string;
  };
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: {
    cachedUrl: string;
    thumbnailUrl: string | null;
    contentType: string;
    originalUrl: string;
  };
  animation?: {
    cachedUrl: string | null;
    contentType: string | null;
  };
  content?: {
    uri: string;
    mime: string;
  };
}

export interface NFTContract {
  address: string;
  name: string;
  symbol: string | null;
  tokenType: 'ERC721' | 'ERC1155';
}

export interface NFTToken extends BaseToken {
  type: 'erc721' | 'erc1155';
  contractAddress: string;
  tokenId: string;
  tokenType: 'ERC721' | 'ERC1155';
  contract: NFTContract;
  description: string;
  tokenUri: string;
  nftMetadata: NFTMetadata;
  metadata?: {
    name?: string;
    image?: string;
  };
}

export type PortfolioToken = NativeToken | ERC20Token | NFTToken;

export type ViewMode = 'grid' | 'list';

export type TokenFilter = 'all' | 'currency' | 'assets';

export type SortField = 'name' | 'balance' | 'value';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
} 