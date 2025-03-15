import { FixedPriceStrategy } from '../strategies/FixedPrice';
import { TimedSaleStrategy } from '../strategies/TimedSale';
import { type CollectSaleProps } from '../strategies/types';

export function SaleActions({ asset, tokenDetails, onEnsure }: CollectSaleProps) {
  // Use Zora's saleType directly
  const isTimedSale = tokenDetails.saleType === 'timed';

  if (isTimedSale) {
    return (
      <TimedSaleStrategy
        mode="collect"
        asset={asset}
        tokenDetails={tokenDetails}
        onEnsure={onEnsure}
      />
    );
  }

  return (
    <FixedPriceStrategy
      mode="collect"
      asset={asset}
      tokenDetails={tokenDetails}
      onEnsure={onEnsure}
    />
  );
} 