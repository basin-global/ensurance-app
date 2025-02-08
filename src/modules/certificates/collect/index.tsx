import { FixedPriceActions } from './FixedPrice';
import { TimedSaleActions } from './TimedSale';
import { type SaleActionsProps } from './types';

export function SaleActions({ asset, tokenDetails, onEnsure }: SaleActionsProps) {
  // Use Zora's saleType directly
  const isTimedSale = tokenDetails.saleType === 'timed';

  if (isTimedSale) {
    return (
      <TimedSaleActions
        asset={asset}
        tokenDetails={tokenDetails}
        onEnsure={onEnsure}
      />
    );
  }

  return (
    <FixedPriceActions
      asset={asset}
      tokenDetails={tokenDetails}
      onEnsure={onEnsure}
    />
  );
} 