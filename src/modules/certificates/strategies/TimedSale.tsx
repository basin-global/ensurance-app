import { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Asset } from '@/types';
import { TokenDetails } from '@/modules/certificates/collect/client';
import { QuantityInput } from '../collect/components/quantity';
import { EnsureButton } from '../collect/components/button';
import { formatEther } from 'viem';
import { SaleProps, SaleConfig } from './types';

export function TimedSaleStrategy(props: SaleProps) {
  const { asset, tokenDetails, mode } = props;
  const [quantity, setQuantity] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [config, setConfig] = useState<Partial<SaleConfig>>({
    saleType: 'timed',
    price: tokenDetails.mintPrice?.toString() || '0',
    maxSupply: Number(tokenDetails.maxSupply) || 0,
    saleStart: Number(tokenDetails.saleStart) || 0,
    saleEnd: Number(tokenDetails.saleEnd) || 0
  });

  // Calculate time remaining if sale has started
  useEffect(() => {
    if (mode !== 'collect') return;
    
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

    setTimeRemaining(calculateTimeRemaining());
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenDetails.saleEnd, mode]);

  const renderCollectUI = () => (
    <>
      <QuantityInput
        quantity={quantity}
        onChange={setQuantity}
        maxQuantity={tokenDetails.maxSupply}
        disabled={tokenDetails.saleStatus !== 'active'}
      />

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
          </div>
        </div>
      )}

      <EnsureButton
        chain={asset.chain as any}
        tokenId={asset.token_id}
        quantity={quantity}
        tokenDetails={tokenDetails}
        onEnsure={'onEnsure' in props ? props.onEnsure : undefined}
      />
    </>
  );

  const renderCreateUI = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Time</label>
          <input
            type="datetime-local"
            className="w-full rounded-md border-gray-300"
            value={new Date(config.saleStart! * 1000).toISOString().slice(0, 16)}
            onChange={(e) => setConfig({
              ...config,
              saleStart: Math.floor(new Date(e.target.value).getTime() / 1000)
            })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Time</label>
          <input
            type="datetime-local"
            className="w-full rounded-md border-gray-300"
            value={new Date(config.saleEnd! * 1000).toISOString().slice(0, 16)}
            onChange={(e) => setConfig({
              ...config,
              saleEnd: Math.floor(new Date(e.target.value).getTime() / 1000)
            })}
          />
        </div>
      </div>

      <Button 
        onClick={() => 'onSave' in props && props.onSave(config as SaleConfig)}
        className="w-full"
      >
        Save Timed Sale Configuration
      </Button>
    </div>
  );

  const renderAdminUI = () => (
    <div className="space-y-4">
      {renderCreateUI()}
      <div className="p-4 bg-gray-900 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Current Sale Status</h3>
        <div className="space-y-2">
          <p>Status: {tokenDetails.saleStatus}</p>
          <p>Minted: {tokenDetails.totalMinted?.toString()} / {tokenDetails.maxSupply?.toString()}</p>
          {timeRemaining && <p>Time Remaining: {timeRemaining}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {mode === 'collect' && renderCollectUI()}
      {mode === 'create' && renderCreateUI()}
      {mode === 'admin' && renderAdminUI()}
    </div>
  );
} 