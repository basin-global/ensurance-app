export interface BaseToken {
  type: 'native' | 'erc20';  // Will add 'erc721' | 'erc1155' later
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  value?: {
    usd: number | null;
  };
  metadata?: {
    name?: string;
    image?: string;
  };
}

export interface NativeToken extends BaseToken {
  type: 'native';
}

export interface ERC20Token extends BaseToken {
  type: 'erc20';
  contractAddress: string;
}

export type PortfolioToken = NativeToken | ERC20Token;

export type ViewMode = 'grid' | 'list'; 