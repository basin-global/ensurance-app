import { Asset } from '@/types';
import { TokenDetails } from '@/modules/certificates/specific/collect/client';

// Strategy Contract Addresses
export const FIXED_PRICE_MINTER = '0x04E2516A2c207E84a1839755675dfd8eF6302F0a';
export const ERC20_MINTER = '0x777777E8850d8D6d98De2B5f64fae401F96eFF31';
export const TIMED_SALE_MINTER = '0x777777722D078c97c6ad07d9f36801e653E356Ae';

export type SaleMode = 'collect' | 'create' | 'admin';
export type DisplayVariant = 'full' | 'card' | 'minimal';

// Base Props
export interface BaseSaleProps {
  asset: Asset;
  tokenDetails: TokenDetails;
  mode: SaleMode;
}

export interface DisplayProps {
  variant?: DisplayVariant;
  showDebug?: boolean;
}

export interface CollectSaleProps extends BaseSaleProps {
  mode: 'collect';
  onEnsure: (quantity: number) => Promise<void>;
}

export interface CreateSaleProps extends BaseSaleProps {
  mode: 'create';
  onSave: (config: SaleConfig) => Promise<void>;
}

export interface AdminSaleProps extends BaseSaleProps {
  mode: 'admin';
  onUpdate: (config: SaleConfig) => Promise<void>;
}

export type SaleProps = CollectSaleProps | CreateSaleProps | AdminSaleProps;

// Error Types
export interface SaleError {
  code: string;
  message: string;
}

// Fixed Price Errors
export type FixedPriceError = 
  | { code: 'SaleEnded' }
  | { code: 'SaleHasNotStarted' }
  | { code: 'WrongValueSent' }
  | { 
      code: 'UserExceedsMintLimit';
      params: {
        user: string;
        limit: bigint;
        requestedAmount: bigint;
      }
    };

// ERC20 Errors
export type ERC20Error = 
  | { code: 'InvalidCurrency' }
  | { code: 'PricePerTokenTooLow' }
  | { code: 'SaleEnded' }
  | { code: 'SaleHasNotStarted' }
  | { code: 'UserExceedsMintLimit' }
  | { code: 'ERC20TransferSlippage' };

// Timed Sale Errors
export type TimedSaleError = 
  | { code: 'EndTimeCannotBeInThePast' }
  | { code: 'MarketAlreadyLaunched' }
  | { code: 'MarketMinimumNotReached' }
  | { code: 'MinimumMarketEthNotMet' }
  | { code: 'NeedsToBeAtLeastOneSaleToStartMarket' }
  | { code: 'SaleAlreadySet' }
  | { code: 'SaleEnded' }
  | { code: 'SaleHasNotStarted' }
  | { code: 'SaleInProgress' }
  | { code: 'SaleNotSet' }
  | { code: 'SaleV2AlreadyStarted' }
  | { code: 'SaleV2Ended' }
  | { code: 'SaleV2NotSet' }
  | { code: 'StartTimeCannotBeAfterEndTime' };

// Base config shared by all sale types
interface BaseSaleConfig {
  saleStart: number;      // uint64 timestamp
  saleEnd: number;        // uint64 timestamp
  maxTokensPerAddress: number;  // uint64, 0 for unlimited
  fundsRecipient: string;  // address
}

// Fixed price sale (ETH only)
export interface FixedPriceSaleConfig extends BaseSaleConfig {
  saleType: 'fixedPrice';  // Match Zora SDK display type
  pricePerToken: string;  // uint96 in wei
}

// ERC20 sale config
export interface ERC20SaleConfig extends BaseSaleConfig {
  saleType: 'erc20';  // Match Zora SDK display type
  pricePerToken: string;  // uint256 in token decimals
  currency: `0x${string}`;  // ERC20 token contract address
}

// Timed sale config (Zero ETH with secondary market)
export interface TimedSaleConfig {
  saleType: 'timed';
  saleStart: number;           // uint64 timestamp
  marketCountdown: number;     // uint64 seconds until market launch
  minimumMarketEth: string;    // uint256 in wei
  name: string;                // For ERC20z token
  symbol: string;              // For ERC20z token
}

export type SaleConfig = FixedPriceSaleConfig | ERC20SaleConfig | TimedSaleConfig; 