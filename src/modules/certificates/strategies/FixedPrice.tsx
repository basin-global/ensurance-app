import { useState } from 'react';
import { formatEther } from 'viem';
import { Asset } from '@/types';
import { TokenDetails } from '@/modules/certificates/collect/client';
import { QuantityInput } from '../collect/components/quantity';
import { EnsureButton } from '../collect/components/button';
import { Button } from '@/components/ui/button';
import { SaleProps, SaleConfig } from './types';

export function FixedPriceStrategy(props: SaleProps) {
  const { asset, tokenDetails, mode } = props;
  const [quantity, setQuantity] = useState(1);
  const [config, setConfig] = useState<Partial<SaleConfig>>({
    saleType: 'fixed',
    price: tokenDetails.mintPrice?.toString() || '0',
    maxSupply: Number(tokenDetails.maxSupply) || 0,
    paymentToken: tokenDetails.paymentToken
  });

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
          <p className="text-gray-400">Price Per Unit</p>
          <p className="font-mono">
            {tokenDetails.paymentToken ? (
              `${(Number(tokenDetails.mintPrice) / Math.pow(10, tokenDetails.paymentToken.decimals)).toFixed(2)} ${tokenDetails.paymentToken.symbol}`
            ) : (
              `${Number(formatEther(tokenDetails.mintPrice)).toFixed(4)} ETH`
            )}
          </p>
        </div>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-800">
          <p className="text-gray-400">Total</p>
          <p className="font-mono">
            {tokenDetails.paymentToken ? (
              `${((Number(tokenDetails.mintPrice) * quantity) / Math.pow(10, tokenDetails.paymentToken.decimals)).toFixed(2)} ${tokenDetails.paymentToken.symbol}`
            ) : (
              `${(Number(formatEther(tokenDetails.mintPrice)) * quantity).toFixed(4)} ETH`
            )}
          </p>
        </div>
      </div>

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
          <label className="block text-sm font-medium mb-1">Price</label>
          <input
            type="number"
            className="w-full rounded-md border-gray-300"
            value={Number(formatEther(BigInt(config.price || '0')))}
            onChange={(e) => setConfig({
              ...config,
              price: (BigInt(Math.floor(Number(e.target.value) * 1e18))).toString()
            })}
            step="0.000000000000000001"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max Supply</label>
          <input
            type="number"
            className="w-full rounded-md border-gray-300"
            value={config.maxSupply}
            onChange={(e) => setConfig({
              ...config,
              maxSupply: Number(e.target.value)
            })}
            min="1"
          />
        </div>
      </div>

      <Button 
        onClick={() => 'onSave' in props && props.onSave(config as SaleConfig)}
        className="w-full"
      >
        Save Fixed Price Configuration
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
          <p>Current Price: {
            tokenDetails.paymentToken ? (
              `${(Number(tokenDetails.mintPrice) / Math.pow(10, tokenDetails.paymentToken.decimals)).toFixed(2)} ${tokenDetails.paymentToken.symbol}`
            ) : (
              `${Number(formatEther(tokenDetails.mintPrice)).toFixed(4)} ETH`
            )
          }</p>
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