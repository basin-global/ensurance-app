export type SyncEntity = 'groups' | 'accounts';

export interface GroupData {
  group_name: string;
  contract_address: string;
  total_supply?: number;
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