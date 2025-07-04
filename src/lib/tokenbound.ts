// @keep Core TokenBound functionality and types
import { TokenboundClient } from "@tokenbound/sdk";
import { createTokenboundClient } from '@/config/tokenbound';
import { getChainByName } from '@/config/chains';
import type { Asset } from '@/types/index';
import { type WalletClient } from 'viem';

export interface TokenboundActions {
  // 6-17-25 note: buttons, aave, portfolio etc. all use this file (or extension of it) as the https://docs.tokenbound.org/sdk/methods#tokenboundclient-sdk-methods are basically shared
  // TODO: Consider ERC721 transfer safety:
  // 1. Add token ID validation to prevent self-transfers
  // 2. Consider disabling ERC721 transfers in favor of external tools
  // 3. If keeping ERC721 transfers, implement user confirmation flow with risk warning
  transferNFT: (asset: Asset, toAddress: `0x${string}`, amount?: number) => Promise<{ hash: string; isCrossChain?: boolean }>;
  isAccountDeployed: (asset: Asset) => Promise<boolean>;
  transferETH: (params: {
    amount: number;
    recipientAddress: `0x${string}`;
    chainId: number;
  }) => Promise<void>;
  transferERC20: (params: {
    amount: number;
    recipientAddress: `0x${string}`;
    erc20tokenAddress: `0x${string}`;
    erc20tokenDecimals: number;
    chainId: number;
  }) => Promise<void>;
}

// @keep Create TokenBound actions with wallet and TBA address
export const createTokenboundActions = (walletClient: WalletClient, tbaAddress: string): TokenboundActions => {
  const client = createTokenboundClient(walletClient);

  return {
    transferNFT: async (asset: Asset, toAddress: `0x${string}`, amount?: number) => {
      if (!walletClient) {
        throw new Error("Please connect your wallet first");
      }

      const chainConfig = getChainByName(asset.chain);
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${asset.chain}`);
      }

      const tx = await client.transferNFT({
        account: tbaAddress as `0x${string}`,
        tokenType: asset.contract?.type === 'ERC1155' ? 'ERC1155' : 'ERC721',
        tokenContract: asset.contract_address as `0x${string}`,
        tokenId: asset.token_id,
        recipientAddress: toAddress,
        amount: asset.contract?.type === 'ERC1155' ? amount : undefined
      });

      return {
        hash: tx,
        isCrossChain: false
      };
    },
    
    isAccountDeployed: async (asset: Asset): Promise<boolean> => {
      try {
        const chainConfig = getChainByName(asset.chain);
        if (!chainConfig) {
          console.warn(`Chain ${asset.chain} not supported for tokenbound operations`);
          return false;
        }

        if (!walletClient) {
          console.warn('No wallet available for tokenbound operations');
          return false;
        }

        return client.checkAccountDeployment({
          accountAddress: tbaAddress as `0x${string}`,
        });
      } catch (error) {
        console.error('Error checking account deployment:', error);
        return false;
      }
    },

    transferETH: async ({ amount, recipientAddress, chainId }) => {
      if (!walletClient) {
        throw new Error("Please connect your wallet first");
      }

      await client.transferETH({
        account: tbaAddress as `0x${string}`,
        amount,
        recipientAddress,
        chainId: chainId
      });
    },

    transferERC20: async ({ amount, recipientAddress, erc20tokenAddress, erc20tokenDecimals, chainId }) => {
      if (!walletClient) {
        throw new Error("Please connect your wallet first");
      }

      await client.transferERC20({
        account: tbaAddress as `0x${string}`,
        amount,
        recipientAddress,
        erc20tokenAddress,
        erc20tokenDecimals,
        chainId: chainId
      });
    },
  };
}; 