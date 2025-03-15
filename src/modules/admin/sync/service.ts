import { sql } from '@vercel/postgres'
import { getGeneralCertificateData } from '@/modules/certificates/general/contracts'
import type { 
  SyncOptions, 
  SyncOperationResult, 
  SyncResult,
  SyncEntity,
  CertificateType 
} from './types'

class SyncService {
  // Main sync method that routes to specific handlers
  async sync(options: SyncOptions): Promise<SyncOperationResult> {
    const startTime = Date.now()
    let results: SyncResult[] = []

    try {
      switch(options.entity) {
        case 'certificates':
          results = await this.syncCertificates(options)
          break
        case 'accounts':
          results = await this.syncAccounts(options)
          break
        case 'groups':
          results = await this.syncGroups(options)
          break
        case 'syndicates':
          results = await this.syncSyndicates(options)
          break
        default:
          throw new Error(`Unknown entity type: ${options.entity}`)
      }

      // Calculate stats
      const stats = results.reduce((acc, result) => ({
        total: acc.total + 1,
        success: acc.success + (result.status === 'success' ? 1 : 0),
        failed: acc.failed + (result.status === 'failed' ? 1 : 0)
      }), { total: 0, success: 0, failed: 0 })

      return {
        options,
        timestamp: startTime,
        results,
        stats
      }
    } catch (error) {
      console.error('Sync operation failed:', error)
      throw error
    }
  }

  // Certificate sync handler
  private async syncCertificates(options: SyncOptions): Promise<SyncResult[]> {
    const { type = 'general', chain, id } = options
    
    // Build query conditions
    const conditions = []
    const params = []
    
    if (chain) {
      conditions.push(`chain = $${params.length + 1}`)
      params.push(chain)
    }
    if (id) {
      conditions.push(`contract_address = $${params.length + 1}`)
      params.push(id)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    
    // Get certificates to sync
    const query = `
      SELECT contract_address, chain 
      FROM ensurance_${type}
      ${whereClause}
    `
    
    const { rows } = await sql.query(query, params)
    
    // Sync each certificate
    const results = await Promise.all(
      rows.map(async (cert): Promise<SyncResult> => {
        try {
          if (type === 'general') {
            const onchainData = await getGeneralCertificateData(cert.contract_address)
            
            if (!onchainData.success) {
              return {
                id: cert.contract_address,
                status: 'failed',
                error: onchainData.error
              }
            }

            // Update database with onchain data
            await sql`
              UPDATE ensurance_general 
              SET 
                symbol = ${onchainData.data.symbol},
                decimals = ${onchainData.data.decimals},
                name = ${onchainData.data.name}
              WHERE contract_address = ${cert.contract_address}
            `

            return {
              id: cert.contract_address,
              status: 'success',
              data: onchainData.data
            }
          }
          
          // TODO: Handle specific certificates
          throw new Error('Specific certificate sync not implemented')
          
        } catch (error) {
          console.error(`Failed to sync certificate ${cert.contract_address}:`, error)
          return {
            id: cert.contract_address,
            status: 'failed',
            error: error.message
          }
        }
      })
    )

    return results
  }

  // Account sync handler
  private async syncAccounts(options: SyncOptions): Promise<SyncResult[]> {
    // TODO: Implement account sync
    return []
  }

  // Group sync handler
  private async syncGroups(options: SyncOptions): Promise<SyncResult[]> {
    // TODO: Implement group sync
    return []
  }

  // Syndicate sync handler
  private async syncSyndicates(options: SyncOptions): Promise<SyncResult[]> {
    // TODO: Implement syndicate sync
    return []
  }
}

// Export singleton instance
export const syncService = new SyncService() 