import { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Asset } from '@/types';
import { TokenDetails } from '@/modules/certificates/collect/client';
import { QuantityInput } from './components/quantity';
import { EnsureButton } from './components/button';
import { formatEther } from 'viem';
import { type SaleActionsProps } from './types';

interface TimedSaleProps {
  asset: Asset;
  tokenDetails: TokenDetails;
}

export function TimedSaleActions({ asset, tokenDetails }: TimedSaleProps) {
  const [quantity, setQuantity] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // Calculate time remaining if sale has started
  useEffect(() => {
    const calculateTimeRemaining = () => {
      if (!tokenDetails.saleEnd) return null;
      const now = Math.floor(Date.now() / 1000);
      const end = Number(tokenDetails.saleEnd);
      if (now >= end) return null;
      
      const seconds = end - now;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    };

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    // Update every second
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenDetails.saleEnd]);

  return (
    <div className="flex flex-col gap-4">
      {/* Quantity Selector */}
      <QuantityInput
        quantity={quantity}
        onChange={setQuantity}
        maxQuantity={tokenDetails.maxSupply}
        disabled={tokenDetails.saleStatus !== 'active'}
      />

      {/* Timed Sale Info */}
      <div className="p-4 bg-gray-900 rounded-lg">
        <div className="flex justify-between items-center">
          <p className="text-gray-400">Base Fee</p>
          <p className="font-mono">✧111 (0.000111 ETH)</p>
        </div>
        {timeRemaining && (
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-800">
            <p className="text-gray-400">Time Remaining</p>
            <p className="font-mono">{timeRemaining}</p>
          </div>
        )}
      </div>

      {/* Secondary Market Info */}
      {tokenDetails.secondaryActive && (
        <div className="p-4 bg-gray-900 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Secondary Market</h3>
          <div className="grid grid-cols-2 gap-4">
            {tokenDetails.secondaryToken && (
              <>
                <div>
                  <p className="text-gray-400">Trading Token</p>
                  <p className="font-mono">{tokenDetails.secondaryToken.symbol}</p>
                </div>
                <div>
                  <p className="text-gray-400">Token Name</p>
                  <p className="font-mono">{tokenDetails.secondaryToken.name}</p>
                </div>
              </>
            )}
            {tokenDetails.secondaryCountdown && (
              <>
                <div>
                  <p className="text-gray-400">Market Countdown</p>
                  <p className="font-mono">{tokenDetails.secondaryCountdown.timeInSeconds.toString()} seconds</p>
                </div>
                <div>
                  <p className="text-gray-400">Required Mints</p>
                  <p className="font-mono">{tokenDetails.secondaryCountdown.minimumMints.toString()}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Ensure Button */}
      <EnsureButton
        chain={asset.chain as any}
        tokenId={asset.token_id}
        quantity={quantity}
        tokenDetails={tokenDetails}
      />
    </div>
  );
} 