// Entity types that can be synced
export type SyncEntity = 'accounts' | 'groups' | 'certificates' | 'syndicates'

// Certificate types
export type CertificateType = 'general' | 'specific'

// Status of a sync operation
export type SyncStatus = 'pending' | 'success' | 'failed'

// Result of a single item sync
export interface SyncResult {
  id: string // contract address, account name, etc
  status: SyncStatus
  error?: string
  data?: any
}

// Options for sync operations
export interface SyncOptions {
  entity: SyncEntity
  type?: CertificateType // For certificates only
  chain?: string // For chain-specific syncs
  id?: string // For single item syncs
}

// Overall sync operation result
export interface SyncOperationResult {
  options: SyncOptions
  timestamp: number
  results: SyncResult[]
  stats: {
    total: number
    success: number
    failed: number
  }
} 