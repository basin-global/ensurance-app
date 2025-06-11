import { type WalletClient, type Account } from 'viem'

// @keep TokenBound requires either a signer or walletClient for initialization
interface TokenBoundWalletConfig {
  signer?: Account;
  walletClient?: WalletClient;
}

// @keep Base chain configuration for TokenBound
export const tokenboundConfig = {
  chainId: 8453,  // Base chain ID
  name: 'base'
};

// @keep Helper function for TokenBound client configuration
export const getTokenBoundClientConfig = (wallet?: TokenBoundWalletConfig) => ({
  chainId: tokenboundConfig.chainId,
  ...wallet  // Spread either signer or walletClient
});

// @keep Validate we are operating on Base chain
export const isTokenBoundSupportedChain = (chainId: number) => 
  chainId === tokenboundConfig.chainId;
