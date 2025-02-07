import { FixedPriceActions } from './FixedPrice';
import { TimedSaleActions } from './TimedSale';
import { type SaleActionsProps } from './types';

export function SaleActions({ asset, tokenDetails, onEnsure }: SaleActionsProps) {
  // Determine if this is a timed sale by checking the mintFeePerQuantity
  const isTimedSale = tokenDetails.mintPrice.toString() === '111000000000000';

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