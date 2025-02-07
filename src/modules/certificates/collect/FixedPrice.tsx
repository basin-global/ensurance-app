import { useState } from 'react';
import { formatEther } from 'viem';
import { Asset } from '@/types';
import { TokenDetails } from './client';
import { QuantityInput } from './components/quantity';
import { EnsureButton } from './components/button';

interface FixedPriceProps {
  asset: Asset;
  tokenDetails: TokenDetails;
}

export function FixedPriceActions({ asset, tokenDetails }: FixedPriceProps) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex flex-col gap-4">
      {/* Quantity Selector */}
      <QuantityInput
        quantity={quantity}
        onChange={setQuantity}
        maxQuantity={tokenDetails.maxSupply}
        disabled={tokenDetails.saleStatus !== 'active'}
      />

      {/* Price Info */}
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