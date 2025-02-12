import { Asset } from '@/types';
import { TokenDetails } from '@/modules/certificates/collect/client';

export type SaleMode = 'collect' | 'create' | 'admin';

export interface BaseSaleProps {
  asset: Asset;
  tokenDetails: TokenDetails;
  mode: SaleMode;
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

export interface SaleConfig {
  saleType: 'fixed' | 'timed';
  price: string;
  maxSupply?: number;
  // Timed sale specific
  saleStart?: number;
  saleEnd?: number;
  // Payment token (optional, defaults to ETH)
  paymentToken?: {
    address: string;
    symbol: string;
    decimals: number;
  };
} 