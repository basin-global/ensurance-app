export type SyncEntity = 'groups' | 'accounts' | 'general_certificates';

export interface GroupData {
  group_name: string;
  contract_address: string;
  total_supply?: number;
}

export interface GeneralCertificateData {
  contract_address: string;
  chain: string;
  name: string;
  symbol: string;
  token_uri: string;
  pool_address: string;
}

export interface AccountData {
  token_id: number;
  account_name: string;
  full_account_name: string;
  holder: string;
  group_name: string;
  tba_address?: string;
}

export interface SyncOptions {
  entity: SyncEntity;
  group_name?: string; // For syncing accounts of a specific group
  token_id?: number; // For syncing a specific account
  empty_only?: boolean; // For syncing only empty general certificates
}

export interface SyncResult {
  id: string; // contract address for groups, full_account_name for accounts
  status: 'success' | 'failed';
  error?: string;
  data?: GroupData | AccountData;
}

export interface SyncOperationResult {
  options: SyncOptions;
  timestamp: number;
  results: SyncResult[];
  stats: {
    total: number;
    success: number;
    failed: number;
  }
} 