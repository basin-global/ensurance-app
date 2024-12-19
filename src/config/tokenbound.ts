import { supportedChains, getActiveChains } from './chains'
import { type WalletClient } from 'viem'
import { type Signer } from 'ethers'

// @keep TokenBound requires either a signer or walletClient for initialization
interface TokenBoundWalletConfig {
  signer?: Signer;
  walletClient?: WalletClient;
}

interface TokenBoundConfig {
  // @keep:chain Base chain where 721 collections live - this is where the TBA Registry exist
  collectionChain: {
    id: number;
    name: string;
  };
  // @keep:chain Chains where TBA can operate - these chains have implementations that can execute transactions
  activeChains: {
    id: number;
    name: string;
  }[];
}

export const tokenboundConfig: TokenBoundConfig = {
  collectionChain: {
    id: 8453,  // @keep:chain Base - where your 721 collections live
    name: 'base'
  },
  // @keep:chain These are chains where TBAs can execute transactions via bridge
  activeChains: getActiveChains().map(chain => ({
    id: chain.id,
    name: chain.simplehashName
  }))
};

// @keep Helper functions for TokenBound client configuration
export const getTokenBoundClientConfig = (operationChainId?: number, wallet?: TokenBoundWalletConfig) => ({
  chainId: operationChainId || tokenboundConfig.collectionChain.id,
  ...wallet  // Spread either signer or walletClient
});

export const isTokenBoundSupportedChain = (chainId: number) => 
  tokenboundConfig.activeChains.some(chain => chain.id === chainId);