import { type WalletClient, type Account, type Chain } from 'viem'
import { base } from 'viem/chains'
import { TokenboundClient } from '@tokenbound/sdk'

// @keep TokenBound requires either a signer or walletClient for initialization
interface TokenBoundWalletConfig {
  walletClient: WalletClient;
  chain?: Chain;
}

// @keep Base chain configuration for TokenBound
export const tokenboundConfig = {
  chain: base,
  chainId: base.id
};

// @keep Helper function for TokenBound client configuration
export const getTokenBoundClientConfig = (wallet?: TokenBoundWalletConfig) => ({
  chainId: tokenboundConfig.chainId,
  chain: tokenboundConfig.chain,
  walletClient: wallet?.walletClient
});

// @keep Create a standardized TokenboundClient instance
export const createTokenboundClient = (walletClient: WalletClient) => {
  return new TokenboundClient({
    chainId: tokenboundConfig.chainId,
    chain: tokenboundConfig.chain,
    walletClient
  });
};

// @keep Validate we are operating on Base chain
export const isTokenBoundSupportedChain = (chainId: number) => 
  chainId === tokenboundConfig.chainId;
