import { Asset } from '@/types';
import { TokenDetails } from '@/modules/certificates/collect/client';

export interface SaleActionsProps {
  asset: Asset;
  tokenDetails: TokenDetails;
  onEnsure: (quantity: number) => Promise<void>;
} 