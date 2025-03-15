import { useState } from 'react';
import { Asset } from '@/types';
import { TokenDetails } from '@/modules/certificates/specific/collect/client';
import { QuantityInput } from '../collect/components/quantity';
import { EnsureButton } from '../collect/components/button';
import { Button } from '@/components/ui/button';
import { SaleProps, ERC20SaleConfig, ERC20Error, ERC20_MINTER } from './types';
import { supportedERC20s } from '@/modules/certificates/specific/config/erc20';

export function ERC20Strategy(props: SaleProps) {
  const { asset, tokenDetails, mode } = props;
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<ERC20Error | null>(null);
  const [config, setConfig] = useState<Partial<ERC20SaleConfig>>({
    saleType: 'erc20',
    pricePerToken: tokenDetails.mintPrice?.toString() || '0',
    saleStart: Math.floor(Date.now() / 1000),  // Now
    saleEnd: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),  // 1 year from now
    maxTokensPerAddress: 0,  // Unlimited
    fundsRecipient: '0x0000000000000000000000000000000000000000',  // Default to zero address
    currency: tokenDetails.paymentToken?.address as `0x${string}` || '0x0000000000000000000000000000000000000000'
  });

  const validateConfig = () => {
    // Validate currency address format
    if (!config.currency?.startsWith('0x') || config.currency === '0x0000000000000000000000000000000000000000') {
      setError({ code: 'InvalidCurrency' });
      return false;
    }

    // Validate price is a valid uint256
    try {
      const price = BigInt(config.pricePerToken || '0');
      if (price === BigInt(0)) {
        setError({ code: 'PricePerTokenTooLow' });
        return false;
      }
      // Max uint256 check
      const maxUint256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');
      if (price > maxUint256) {
        setError({ code: 'PricePerTokenTooLow' });
        return false;
      }
    } catch (err) {
      setError({ code: 'PricePerTokenTooLow' });
      return false;
    }

    setError(null);
    return true;
  };

  const handleSave = () => {
    if (!validateConfig() || !('onSave' in props)) return;
    props.onSave(config as ERC20SaleConfig);
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
            {tokenDetails.paymentToken && (
              `${(Number(tokenDetails.mintPrice) / Math.pow(10, tokenDetails.paymentToken.decimals)).toFixed(2)} ${tokenDetails.paymentToken.symbol}`
            )}
          </p>
        </div>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-800">
          <p className="text-gray-400">Total</p>
          <p className="font-mono">
            {tokenDetails.paymentToken && (
              `${((Number(tokenDetails.mintPrice) * quantity) / Math.pow(10, tokenDetails.paymentToken.decimals)).toFixed(2)} ${tokenDetails.paymentToken.symbol}`
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
      {error && (
        <div className="p-4 bg-red-900/20 rounded-lg">
          <p className="text-red-400">{error.code}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {/* Price */}
        <div>
          <label className="block text-sm font-medium mb-1">Price</label>
          <input
            type="number"
            className="w-full rounded-md border-gray-300"
            value={Number(config.pricePerToken || '0') / Math.pow(10, tokenDetails.paymentToken?.decimals || 18)}
            onChange={(e) => {
              const decimals = tokenDetails.paymentToken?.decimals || 18;
              const rawValue = Math.floor(Number(e.target.value) * Math.pow(10, decimals));
              setConfig({
                ...config,
                pricePerToken: rawValue.toString()
              });
              setError(null);
            }}
            step="0.01"
            min="0"
          />
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
          <select
            className="w-full rounded-md border-gray-300"
            value={config.currency}
            onChange={(e) => {
              setConfig({
                ...config,
                currency: e.target.value as `0x${string}`
              });
              setError(null);
            }}
          >
            <option value="">Select token...</option>
            {Object.entries(supportedERC20s[asset.chain] || {}).map(([symbol, token]) => (
              <option key={token.address} value={token.address}>
                {symbol} ({token.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Max Tokens Per Address */}
        <div>
          <label className="block text-sm font-medium mb-1">Max Per Wallet (0 for unlimited)</label>
          <input
            type="number"
            className="w-full rounded-md border-gray-300"
            value={config.maxTokensPerAddress}
            onChange={(e) => setConfig({
              ...config,
              maxTokensPerAddress: Number(e.target.value)
            })}
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
            onChange={(e) => setConfig({
              ...config,
              saleStart: Math.floor(new Date(e.target.value).getTime() / 1000)
            })}
          />
        </div>

        {/* Sale End */}
        <div>
          <label className="block text-sm font-medium mb-1">Sale End</label>
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

        {/* Funds Recipient */}
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Funds Recipient (optional)</label>
          <input
            type="text"
            className="w-full rounded-md border-gray-300"
            value={config.fundsRecipient}
            onChange={(e) => setConfig({
              ...config,
              fundsRecipient: e.target.value
            })}
            placeholder="0x..."
          />
        </div>
      </div>

      <Button 
        onClick={handleSave}
        className="w-full"
      >
        Save ERC20 Sale Configuration
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
          {tokenDetails.paymentToken && (
            <>
              <p>Current Price: {
                `${(Number(tokenDetails.mintPrice) / Math.pow(10, tokenDetails.paymentToken.decimals)).toFixed(2)} ${tokenDetails.paymentToken.symbol}`
              }</p>
              <p>Payment Token: {tokenDetails.paymentToken.name} ({tokenDetails.paymentToken.symbol})</p>
              <p className="text-xs text-gray-500 break-all">Token Address: {tokenDetails.paymentToken.address}</p>
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
