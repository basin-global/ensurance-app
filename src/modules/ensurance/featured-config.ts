import { ensuranceContracts, EnsuranceChain } from './config';

interface FeaturedToken {
  chain: EnsuranceChain;
  tokenId: string;
}

interface OGFeaturedTokens {
  [ogName: string]: {
    base?: string;     // Base Mainnet
    zora?: string;     // Zora
    arbitrum?: string; // Arbitrum One
    optimism?: string; // Optimism
  };
}

// Define featured tokens for each OG - add dots to match OG naming convention
const ogFeaturedTokens: OGFeaturedTokens = {
  '.basin': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,3',   
    optimism: '1,4'   
  },
  '.situs': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  },
  '.boulder': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  },
  '.regen': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  },
  'mumbai': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  },
  'refi': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  },
  'ebf': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  },
  'bloom': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  },
  'bioregion': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  },
  'kokonut': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  },
  'ogallala': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  },
  'sicilia': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  },
  'tokyo': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  },
  'earth': {
    base: '1,2',      
    zora: '5,23',      
    arbitrum: '12,7',   
    optimism: '1,4'   
  }
};

// Convert config to FeaturedToken arrays by OG
export function getFeaturedTokensForOG(ogName: string): FeaturedToken[] {
  const ogTokens = ogFeaturedTokens[ogName];
  if (!ogTokens) return [];

  return Object.entries(ogTokens).flatMap(([chain, tokenList]) => 
    tokenList ? tokenList.split(',').map(id => ({
      chain: chain as EnsuranceChain,
      tokenId: id.trim()
    })) : []
  );
}

export function getFeaturedTokenContract(token: FeaturedToken): string {
  return ensuranceContracts[token.chain];
} 