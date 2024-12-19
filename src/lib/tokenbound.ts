// @keep Core TokenBound functionality and types
import { TokenboundClient } from "@tokenbound/sdk";
import { getTokenBoundClientConfig } from '@/config/tokenbound';
import { getChainBySimplehashName } from '@/config/chains';
import type { Asset } from '@/modules/assets';

export interface TokenboundActions {
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
export const createTokenboundActions = (activeWallet: any, tbaAddress: string): TokenboundActions => ({
  transferNFT: async (asset: Asset, toAddress: `0x${string}`, amount?: number) => {
    if (!activeWallet) {
      throw new Error("Please connect your wallet first");
    }

    const chainConfig = getChainBySimplehashName(asset.chain);
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${asset.chain}`);
    }

    let provider = await activeWallet.getEthersProvider();
    const network = await provider.getNetwork();
    
    if (network.chainId !== chainConfig.id) {
      try {
        await provider.send('wallet_switchEthereumChain', [
          { chainId: `0x${chainConfig.id.toString(16)}` }
        ]);
        await new Promise(resolve => setTimeout(resolve, 1000));
        provider = await activeWallet.getEthersProvider();
      } catch (error) {
        throw new Error(`Please switch to ${chainConfig.name} network`);
      }
    }

    const signer = provider.getSigner();
    const client = new TokenboundClient(
      getTokenBoundClientConfig(chainConfig.id, { signer })
    );

    const tx = await client.transferNFT({
      account: tbaAddress as `0x${string}`,
      tokenType: asset.contract.type === 'ERC1155' ? 'ERC1155' : 'ERC721',
      tokenContract: asset.contract_address as `0x${string}`,
      tokenId: asset.token_id,
      recipientAddress: toAddress,
      amount: asset.contract.type === 'ERC1155' ? amount : undefined,
      chainId: chainConfig.id
    });

    return {
      hash: tx,
      isCrossChain: false
    };
  },
  
  isAccountDeployed: async (asset: Asset): Promise<boolean> => {
    try {
      const chainConfig = getChainBySimplehashName(asset.chain);
      if (!chainConfig) {
        console.warn(`Chain ${asset.chain} not supported for tokenbound operations`);
        return false;
      }

      // Check if chain is active and has a viemName
      if (!chainConfig.isActive || !chainConfig.viemName) {
        console.warn(`Chain ${asset.chain} not active or not supported by TokenboundClient`);
        return false;
      }

      if (!activeWallet) {
        console.warn('No wallet available for tokenbound operations');
        return false;
      }

      const provider = await activeWallet.getEthersProvider();
      const signer = provider.getSigner();

      const client = new TokenboundClient(
        getTokenBoundClientConfig(chainConfig.id, { signer })
      );

      return client.checkAccountDeployment({
        accountAddress: tbaAddress as `0x${string}`,
      });
    } catch (error) {
      console.error('Error checking account deployment:', error);
      return false;
    }
  },

  transferETH: async ({ amount, recipientAddress, chainId }) => {
    if (!activeWallet) {
      throw new Error("Please connect your wallet first");
    }

    let provider = await activeWallet.getEthersProvider();
    const signer = provider.getSigner();

    const client = new TokenboundClient(
      getTokenBoundClientConfig(chainId, { signer })
    );

    await client.transferETH({
      account: tbaAddress as `0x${string}`,
      amount,
      recipientAddress,
      chainId: chainId
    });
  },

  transferERC20: async ({ amount, recipientAddress, erc20tokenAddress, erc20tokenDecimals, chainId }) => {
    if (!activeWallet) {
      throw new Error("Please connect your wallet first");
    }

    let provider = await activeWallet.getEthersProvider();
    const signer = provider.getSigner();

    const client = new TokenboundClient(
      getTokenBoundClientConfig(chainId, { signer })
    );

    await client.transferERC20({
      account: tbaAddress as `0x${string}`,
      amount,
      recipientAddress,
      erc20tokenAddress,
      erc20tokenDecimals,
      chainId: chainId
    });
  },
}); 