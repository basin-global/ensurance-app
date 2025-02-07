import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { toast } from 'react-toastify';
import { ensure } from '../actions/ensure';
import { type EnsuranceChain } from '../collect/client';

interface UseEnsureParams {
  chain: EnsuranceChain;
  tokenId: string;
  quantity: number;
}

export function useEnsure() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [isEnsuring, setIsEnsuring] = useState(false);

  const ensureCertificate = async ({ chain, tokenId, quantity }: UseEnsureParams) => {
    if (!authenticated) {
      login();
      return;
    }

    const wallet = wallets[0];
    if (!wallet?.address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setIsEnsuring(true);
      const result = await ensure({
        chain,
        tokenId,
        recipient: wallet.address as `0x${string}`,
        quantity
      });

      if (!result.success) {
        throw new Error('Failed to prepare transaction');
      }

      const provider = await wallet.getEthereumProvider();

      // Switch to the correct chain first
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${result.chainId.toString(16)}` }]
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          toast.error('Please add this network to your wallet first');
          return;
        }
        throw switchError;
      }

      // Handle ERC20 token payment if required
      if (result.erc20Approval) {
        const approvalParams = convertBigInts(result.erc20Approval);
        
        // First approve the token spend
        const approvalTx = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            ...approvalParams,
            from: wallet.address
          }]
        });

        // Wait a bit for the approval to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Send the mint transaction
      const finalTxParams = {
        ...result.parameters,
        from: wallet.address
      };

      await provider.request({
        method: 'eth_sendTransaction',
        params: [finalTxParams]
      });

      toast.success('Successfully ensured certificate!');
    } catch (error: any) {
      console.error('Error ensuring:', error);
      if (error.code === 4001) {
        toast.error('Transaction was cancelled');
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to ensure certificate');
      }
    } finally {
      setIsEnsuring(false);
    }
  };

  // Helper function for BigInt conversion
  const convertBigInts = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (typeof obj === 'bigint') return `0x${obj.toString(16)}`;
    
    return Object.entries(obj).reduce((acc, [key, value]) => {
      acc[key] = convertBigInts(value);
      return acc;
    }, {} as any);
  };

  return {
    isEnsuring,
    ensureCertificate,
    isAuthenticated: authenticated,
    wallet: wallets[0]
  };
}
