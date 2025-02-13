import { useState } from 'react';
import { formatEther, parseEther } from 'viem';
import { Asset } from '@/types';
import { TokenDetails } from '@/modules/certificates/collect/client';
import { QuantityInput } from '../collect/components/quantity';
import { EnsureButton } from '../collect/components/button';
import { Button } from '@/components/ui/button';
import { SaleProps, FixedPriceSaleConfig, FixedPriceError, DisplayProps } from './types';
import { BaseSaleInfo } from './components/BaseSaleInfo';

// Contract address is imported from types.ts
import { FIXED_PRICE_MINTER } from './types';

export function FixedPriceStrategy(props: SaleProps) {
  const { asset, tokenDetails, mode } = props;
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<FixedPriceError | null>(null);
  const [config, setConfig] = useState<Partial<FixedPriceSaleConfig>>({
    saleType: 'fixedPrice',
    pricePerToken: tokenDetails.mintPrice?.toString() || '0',
    saleStart: Math.floor(Date.now() / 1000),  // Now
    saleEnd: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),  // 1 year from now
    maxTokensPerAddress: 0,  // Unlimited
    fundsRecipient: '0x0000000000000000000000000000000000000000'  // Default to zero address
  });

  const validateConfig = () => {
    const now = Math.floor(Date.now() / 1000);
    if (config.saleStart && config.saleStart > now) {
      setError({ code: 'SaleHasNotStarted' });
      return false;
    }
    if (config.saleEnd && config.saleEnd < now) {
      setError({ code: 'SaleEnded' });
      return false;
    }

    setError(null);
    return true;
  };

  const handleSave = () => {
    if (!validateConfig() || !('onSave' in props)) return;
    props.onSave(config as FixedPriceSaleConfig);
  };

  const renderCollectUI = () => (
    <>
      {error && (
        <div className="p-4 bg-red-900/20 rounded-lg mb-4">
          <p className="text-red-400">{error.code}</p>
        </div>
      )}
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
            {`${Number(formatEther(tokenDetails.mintPrice)).toFixed(4)} ETH`}
          </p>
        </div>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-800">
          <p className="text-gray-400">Total</p>
          <p className="font-mono">
            {`${(Number(formatEther(tokenDetails.mintPrice)) * quantity).toFixed(4)} ETH`}
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
      {error && (
        <div className="p-4 bg-red-900/20 rounded-lg">
          <p className="text-red-400">{error.code}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {/* Price */}
        <div>
          <label className="block text-sm font-medium mb-1">Price (ETH)</label>
          <input
            type="number"
            className="w-full rounded-md border-gray-300"
            value={Number(formatEther(BigInt(config.pricePerToken || '0')))}
            onChange={(e) => {
              try {
                const ethValue = e.target.value || '0';
                const weiValue = parseEther(ethValue);
                // Ensure it fits in uint96
                if (weiValue > BigInt('79228162514264337593543950335')) {
                  setError({ code: 'WrongValueSent' });
                  return;
                }
                setConfig({
                  ...config,
                  pricePerToken: weiValue.toString()
                });
                setError(null);
              } catch (err) {
                setError({ code: 'WrongValueSent' });
              }
            }}
            step="0.000000000000000001"
            min="0"
          />
        </div>

        {/* Max Tokens Per Address */}
        <div>
          <label className="block text-sm font-medium mb-1">Max Per Wallet (0 for unlimited)</label>
          <input
            type="number"
            className="w-full rounded-md border-gray-300"
            value={config.maxTokensPerAddress}
            onChange={(e) => {
              const value = Number(e.target.value);
              // Ensure it fits in uint64
              if (value > 18446744073709551615) {
                setError({ 
                  code: 'UserExceedsMintLimit',
                  params: {
                    user: '0x0000000000000000000000000000000000000000',
                    limit: BigInt(18446744073709551615),
                    requestedAmount: BigInt(value)
                  }
                });
                return;
              }
              setConfig({
                ...config,
                maxTokensPerAddress: value
              });
              setError(null);
            }}
            min="0"
          />
        </div>

        {/* Sale Start */}
        <div>
          <label className="block text-sm font-medium mb-1">Sale Start</label>
          <input
            type="datetime-local"
            className="w-full rounded-md border-gray-300"
            value={new Date(config.saleStart! * 1000).toISOString().slice(0, 16)}
            onChange={(e) => {
              const timestamp = Math.floor(new Date(e.target.value).getTime() / 1000);
              setConfig({
                ...config,
                saleStart: timestamp
              });
              setError(null);
            }}
          />
        </div>

        {/* Sale End */}
        <div>
          <label className="block text-sm font-medium mb-1">Sale End</label>
          <input
            type="datetime-local"
            className="w-full rounded-md border-gray-300"
            value={new Date(config.saleEnd! * 1000).toISOString().slice(0, 16)}
            onChange={(e) => {
              const timestamp = Math.floor(new Date(e.target.value).getTime() / 1000);
              setConfig({
                ...config,
                saleEnd: timestamp
              });
              setError(null);
            }}
          />
        </div>

        {/* Funds Recipient */}
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Funds Recipient (optional)</label>
          <input
            type="text"
            className="w-full rounded-md border-gray-300"
            value={config.fundsRecipient}
            onChange={(e) => {
              setConfig({
                ...config,
                fundsRecipient: e.target.value
              });
              setError(null);
            }}
            placeholder="0x..."
          />
        </div>
      </div>

      <Button 
        onClick={handleSave}
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
          <p>Current Price: {`${Number(formatEther(tokenDetails.mintPrice)).toFixed(4)} ETH`}</p>
          {tokenDetails.saleEnd && (
            <p>Sale Ends: {new Date(Number(tokenDetails.saleEnd) * 1000).toLocaleString()}</p>
          )}
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

export const FixedPriceDisplay = ({ 
  config, 
  variant = 'full',
  showDebug = false 
}: { 
  config: FixedPriceSaleConfig 
} & DisplayProps) => {
  // Minimal variant (for cards)
  if (variant === 'minimal') {
    return (
      <div className="space-y-1 text-sm">
        <BaseSaleInfo
          saleStart={config.saleStart}
          saleEnd={config.saleEnd}
          maxTokensPerAddress={config.maxTokensPerAddress}
          fundsRecipient={config.fundsRecipient}
          variant="minimal"
        />
        <div className="flex justify-between">
          <span className="text-gray-400">Price:</span>
          <span>{formatEther(BigInt(config.pricePerToken))} ETH</span>
        </div>
      </div>
    );
  }

  // Card variant (for grid views)
  if (variant === 'card') {
    return (
      <div className="space-y-2">
        <BaseSaleInfo
          saleStart={config.saleStart}
          saleEnd={config.saleEnd}
          maxTokensPerAddress={config.maxTokensPerAddress}
          fundsRecipient={config.fundsRecipient}
          variant="card"
        />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-400">Price Per Token</p>
            <p className="font-mono">{formatEther(BigInt(config.pricePerToken))} ETH</p>
          </div>
        </div>
      </div>
    );
  }

  // Full variant (default, for detail views)
  return (
    <div className="space-y-4">
      <BaseSaleInfo
        saleStart={config.saleStart}
        saleEnd={config.saleEnd}
        maxTokensPerAddress={config.maxTokensPerAddress}
        fundsRecipient={config.fundsRecipient}
        variant="full"
        showDebug={showDebug}
      />
      
      <div className="grid grid-cols-2 gap-4 border-t border-gray-700 pt-4">
        <div>
          <p className="text-gray-400">Price Per Token</p>
          <p className="font-mono">{formatEther(BigInt(config.pricePerToken))} ETH</p>
        </div>
      </div>

      {showDebug && (
        <details className="text-xs mt-4">
          <summary className="cursor-pointer text-gray-400">Fixed Price Info</summary>
          <pre className="mt-2 p-2 bg-black rounded overflow-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}; 