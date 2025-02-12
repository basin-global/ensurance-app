import { useState } from 'react';
import { formatEther, parseEther } from 'viem';
import { Button } from "@/components/ui/button";
import { Asset } from '@/types';
import { TokenDetails } from '@/modules/certificates/collect/client';
import { QuantityInput } from '../collect/components/quantity';
import { EnsureButton } from '../collect/components/button';
import { SaleProps, TimedSaleConfig, TimedSaleError } from './types';
import { TIMED_SALE_MINTER } from './types';

export function TimedSaleStrategy(props: SaleProps) {
  const { asset, tokenDetails, mode } = props;
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<TimedSaleError | null>(null);
  const [config, setConfig] = useState<Partial<TimedSaleConfig>>({
    saleType: 'timed',
    saleStart: Math.floor(Date.now() / 1000),  // Now
    marketCountdown: 24 * 60 * 60,  // 24 hours until market launch
    minimumMarketEth: parseEther('0.01').toString(),  // 0.01 ETH minimum
    name: `${asset.name || 'Token'} Market`,
    symbol: `${asset.symbol || 'TKN'}z`
  });

  const validateConfig = () => {
    const now = Math.floor(Date.now() / 1000);
    
    if (!config.saleStart || !config.marketCountdown) {
      setError({ code: 'SaleNotSet' });
      return false;
    }

    if (config.saleStart <= now) {
      setError({ code: 'SaleHasNotStarted' });
      return false;
    }

    if (!config.name || !config.symbol) {
      setError({ code: 'SaleNotSet' });
      return false;
    }

    setError(null);
    return true;
  };

  // Calculate end time for display
  const getEndTime = () => {
    if (!config.saleStart || !config.marketCountdown) return null;
    return new Date((config.saleStart + config.marketCountdown) * 1000);
  };

  const handleSave = () => {
    if (!validateConfig() || !('onSave' in props)) return;
    props.onSave(config as TimedSaleConfig);
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
          <p className="text-gray-400">Base Fee</p>
          <p className="font-mono">✧111 (0.000111 ETH)</p>
        </div>
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
      {error && (
        <div className="p-4 bg-red-900/20 rounded-lg">
          <p className="text-red-400">{error.code}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
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

        {/* Market Countdown */}
        <div>
          <label className="block text-sm font-medium mb-1">Market Launch Delay (hours)</label>
          <input
            type="number"
            className="w-full rounded-md border-gray-300"
            value={Math.floor((config.marketCountdown || 0) / 3600)}
            onChange={(e) => {
              const hours = Number(e.target.value);
              setConfig({
                ...config,
                marketCountdown: hours * 3600
              });
              setError(null);
            }}
            min="1"
            max="168"  // 1 week
          />
        </div>

        {/* Sale End (Read Only) */}
        <div>
          <label className="block text-sm font-medium mb-1">Sale End (Calculated)</label>
          <input
            type="text"
            className="w-full rounded-md border-gray-300 bg-gray-100"
            value={getEndTime()?.toLocaleString() || 'Not set'}
            disabled
          />
        </div>

        {/* Minimum Market ETH */}
        <div>
          <label className="block text-sm font-medium mb-1">Minimum Market ETH</label>
          <input
            type="number"
            className="w-full rounded-md border-gray-300"
            value={Number(formatEther(BigInt(config.minimumMarketEth || '0')))}
            onChange={(e) => {
              try {
                const ethValue = e.target.value || '0';
                setConfig({
                  ...config,
                  minimumMarketEth: parseEther(ethValue).toString()
                });
                setError(null);
              } catch (err) {
                setError({ code: 'MinimumMarketEthNotMet' });
              }
            }}
            step="0.01"
            min="0"
          />
        </div>

        {/* Token Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Market Token Name</label>
          <input
            type="text"
            className="w-full rounded-md border-gray-300"
            value={config.name}
            onChange={(e) => {
              setConfig({
                ...config,
                name: e.target.value
              });
              setError(null);
            }}
            placeholder="Token Market Name"
          />
        </div>

        {/* Token Symbol */}
        <div>
          <label className="block text-sm font-medium mb-1">Market Token Symbol</label>
          <input
            type="text"
            className="w-full rounded-md border-gray-300"
            value={config.symbol}
            onChange={(e) => {
              setConfig({
                ...config,
                symbol: e.target.value.toUpperCase()
              });
              setError(null);
            }}
            placeholder="TKNz"
          />
        </div>
      </div>

      <Button 
        onClick={handleSave}
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
          {tokenDetails.secondaryToken && (
            <>
              <p>Market Token: {tokenDetails.secondaryToken.name} ({tokenDetails.secondaryToken.symbol})</p>
              <p className="text-xs text-gray-500 break-all">Token Address: {tokenDetails.secondaryToken.address}</p>
            </>
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