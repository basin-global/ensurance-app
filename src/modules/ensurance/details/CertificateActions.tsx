import { Plus, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { SplitsBar } from '@/modules/splits/components/SplitsBar';
import { Asset } from '@/types';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ensure } from '@/modules/actions/assets/ensure';
import { toast } from 'react-toastify';
import { useState } from 'react';
import { formatEther } from 'viem';

interface CertificateActionsProps {
  asset: Asset;
  ensuranceData?: {
    creator_reward_recipient: string;
    creator_reward_recipient_split?: {
      recipients: Array<{
        percentAllocation: number;
        recipient: {
          address: string;
          ens?: string;
        }
      }>
    };
  };
  chain: string;
  tokenDetails?: any; // We'll type this properly later
}

export function CertificateActions({ 
  asset,
  ensuranceData,
  chain,
  tokenDetails
}: CertificateActionsProps) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && (!tokenDetails?.maxSupply || newQuantity <= tokenDetails.maxSupply)) {
      setQuantity(newQuantity);
    }
  };

  const handleEnsure = async () => {
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
        chain: chain as any,
        tokenId: asset.token_id,
        recipient: wallet.address as `0x${string}`,
        quantity
      });

      if (!result.success) {
        throw new Error('Failed to prepare transaction');
      }

      // Convert any remaining BigInt values in parameters
      const convertBigIntsToHex = (obj: any): any => {
        if (typeof obj === 'bigint') {
          return `0x${obj.toString(16)}`;
        }
        if (Array.isArray(obj)) {
          return obj.map(convertBigIntsToHex);
        }
        if (typeof obj === 'object' && obj !== null) {
          return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, convertBigIntsToHex(value)])
          );
        }
        return obj;
      };

      const txParams = convertBigIntsToHex(result.parameters);
      
      console.log('Raw parameters from Zora:', JSON.stringify(result.parameters, null, 2));
      console.log('Converted parameters:', JSON.stringify(txParams, null, 2));
      console.log('ERC20 approval data:', JSON.stringify(result.erc20Approval, null, 2));

      // Ensure we have a valid contract address
      if (!txParams.to) {
        // Get contract address from asset if available
        if (asset.contract_address && asset.contract_address !== 'ensurance') {
          txParams.to = asset.contract_address;
        } else {
          // Import the contract address from config
          const { ensuranceContracts } = await import('@/modules/ensurance/config');
          txParams.to = ensuranceContracts[chain as any];
        }
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
        const approvalParams = convertBigIntsToHex(result.erc20Approval);
        console.log('ERC20 approval params:', JSON.stringify(approvalParams, null, 2));
        
        // Ensure 'to' address is properly formatted for approval
        if (!approvalParams.to?.startsWith('0x')) {
          throw new Error('Invalid token address format');
        }

        // First approve the token spend
        const approvalTx = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            ...approvalParams,
            from: wallet.address
          }]
        });

        console.log('Token approval transaction:', approvalTx);

        // Wait a bit for the approval to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Ensure 'to' address is properly formatted for mint
      if (!txParams.to?.startsWith('0x')) {
        throw new Error('Invalid contract address format');
      }

      // Send the mint transaction
      const finalTxParams = {
        ...txParams,
        from: wallet.address
      };
      
      console.log('Final transaction parameters:', JSON.stringify(finalTxParams, null, 2));

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

  return (
    <div className="flex flex-col gap-4">
      {/* Quantity Selector */}
      <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
        <p className="text-gray-400">Quantity</p>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="font-mono w-12 text-center">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleQuantityChange(1)}
            disabled={tokenDetails?.maxSupply ? quantity >= tokenDetails.maxSupply : false}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Total Price */}
      <div className="p-4 bg-gray-900 rounded-lg">
        <div className="flex justify-between items-center">
          <p className="text-gray-400">TOTAL</p>
          <p className="font-mono">
            {tokenDetails?.mintPrice ? (
              <span>
                {tokenDetails.paymentToken ? (
                  // Format ERC20 total price using token decimals
                  `${((Number(tokenDetails.mintPrice) * quantity) / Math.pow(10, tokenDetails.paymentToken.decimals)).toFixed(2)} ${tokenDetails.paymentToken.symbol}`
                ) : (
                  // Format ETH total price
                  `${(Number(formatEther(tokenDetails.mintPrice)) * quantity).toFixed(4)} ETH`
                )}
              </span>
            ) : '...'}
          </p>
        </div>
      </div>

      <Button 
        onClick={handleEnsure}
        disabled={isEnsuring}
        className="w-full px-6 py-3 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600"
      >
        <Plus className="h-6 w-6 mr-2" />
        {isEnsuring ? 'ENSURING...' : 'ENSURE'}
      </Button>

      {ensuranceData?.creator_reward_recipient_split && (
        <a 
          href={`/flow/${chain}/${ensuranceData.creator_reward_recipient}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full p-4 bg-background dark:bg-background-dark rounded-xl hover:bg-gray-900 transition-colors duration-200"
        >
          <SplitsBar 
            recipients={ensuranceData.creator_reward_recipient_split.recipients} 
          />
        </a>
      )}
    </div>
  );
} 