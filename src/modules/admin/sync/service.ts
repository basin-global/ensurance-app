import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { sql } from '@vercel/postgres'
import { TokenboundClient } from "@tokenbound/sdk"
import { getTokenBoundClientConfig } from '@/config/tokenbound'
import type { SyncEntity, SyncOperationResult, GeneralCertificateData, SyncOptions, SyncResult } from './types'
import ZORA_COIN_ABI from '../../../abi/ZoraCoin.json'
import { generalCertificates } from '@/lib/database/certificates/general'
import { getCoin, getCoins } from '@zoralabs/coins-sdk'

// Initialize Viem client
export const client = createPublicClient({
  chain: base,
  transport: http()
})

// Initialize Tokenbound client
const tokenboundClient = new TokenboundClient(getTokenBoundClientConfig())

// Contract addresses from docs
const FACTORY_ADDRESS = '0x67c814835e1920324634fd6da416a0e79c949970'
const FACTORY_ABI = [
  {
    "inputs": [],
    "name": "getTldsArray",
    "outputs": [{"type": "string[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"type": "string"}],
    "name": "tldNamesAddresses",
    "outputs": [{"type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
]

const GROUP_ABI = [
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"type": "uint256"}],
    "name": "domainIdsNames",
    "outputs": [{"type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
]

// Sync groups from chain
async function syncGroups(): Promise<SyncOperationResult> {
  const startTime = Date.now()
  const results = []
  let success = 0
  let failed = 0

  try {
    // First get all groups from Factory contract
    const groupNames = await client.readContract({
      address: FACTORY_ADDRESS as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'getTldsArray',
      args: []
    }) as string[]

    for (const groupName of groupNames) {
      try {
        // Get contract address for this group
        const contractAddress = await client.readContract({
          address: FACTORY_ADDRESS as `0x${string}`,
          abi: FACTORY_ABI,
          functionName: 'tldNamesAddresses',
          args: [groupName]
        }) as `0x${string}`

        // Get total supply from group contract
        const totalSupply = await client.readContract({
          address: contractAddress,
          abi: GROUP_ABI,
          functionName: 'totalSupply',
          args: []
        })

        // Update or insert group in database, preserving is_active status
        await sql`
          INSERT INTO members.groups (
            group_name,
            contract_address,
            total_supply,
            is_active
          ) VALUES (
            ${groupName},
            ${contractAddress},
            ${Number(totalSupply)},
            COALESCE(
              (SELECT is_active FROM members.groups WHERE group_name = ${groupName}),
              false  -- default to false for new groups
            )
          )
          ON CONFLICT (group_name) DO UPDATE SET
            contract_address = EXCLUDED.contract_address,
            total_supply = EXCLUDED.total_supply
            -- is_active is intentionally not updated to preserve manual control
        `

        results.push({
          group: groupName,
          status: 'success',
          data: { 
            contractAddress,
            totalSupply: Number(totalSupply)
          }
        })
        success++
      } catch (err: any) {
        results.push({
          group: groupName,
          status: 'failed',
          error: err.message
        })
        failed++
      }
    }

  } catch (err: any) {
    throw new Error(`Failed to sync groups: ${err.message}`)
  }

  return {
    options: { entity: 'groups' },
    timestamp: startTime,
    stats: { total: results.length, success, failed },
    results
  }
}

// Get contract data
async function getContractData(address: string) {
  // For now, return a basic ERC721 ABI
  const abi = [
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [{"type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTldsArray",
      "outputs": [{"type": "string[]"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"type": "uint256"}],
      "name": "tokenURI",
      "outputs": [{"type": "string"}],
      "stateMutability": "view",
      "type": "function"
    }
  ]
  return { abi }
}

// Sync accounts from chain
async function syncAccounts(group_name?: string, token_id?: number): Promise<SyncOperationResult> {
  const startTime = Date.now()
  const results = []
  let success = 0
  let failed = 0

  try {
    // Get target groups
    const { rows: targetGroups } = group_name 
      ? await sql`
          SELECT * FROM members.groups 
          WHERE group_name = ${group_name} AND is_active = true
        `
      : await sql`
          SELECT * FROM members.groups 
          WHERE is_active = true
        `

    console.log(`\nStarting accounts sync for ${targetGroups.length} groups...`)

    for (const [groupIndex, group] of targetGroups.entries()) {
      try {
        if (!group.contract_address) {
          throw new Error('No contract address')
        }

        console.log(`\nProcessing group ${groupIndex + 1}/${targetGroups.length}: ${group.group_name}`)

        // Process specific token or all tokens
        const tokens = token_id ? [token_id] : Array.from({ length: group.total_supply }, (_, i) => i + 1)
        console.log(`Total tokens to process: ${tokens.length}`)
        let processedTokens = 0

        for (const id of tokens) {
          try {
            // Get account name from chain
            const accountName = await client.readContract({
              address: group.contract_address as `0x${string}`,
              abi: GROUP_ABI,
              functionName: 'domainIdsNames',
              args: [BigInt(id)]
            })

            // Generate TBA address
            const tbaAddress = await tokenboundClient.getAccount({
              tokenContract: group.contract_address as `0x${string}`,
              tokenId: id.toString()
            })

            // Check if TBA is deployed
            const isDeployed = await tokenboundClient.checkAccountDeployment({
              accountAddress: tbaAddress
            })

            // Construct full account name
            const fullAccountName = `${accountName}${group.group_name}`

            // Update account in database
            const tableName = `accounts_${group.group_name.replace('.', '')}`
            await sql.query(
              `INSERT INTO members.${tableName} (
                token_id,
                account_name,
                full_account_name,
                tba_address,
                tba_deployed,
                is_active
              ) VALUES (
                $1, $2, $3, $4, $5,
                COALESCE(
                  (SELECT is_active FROM members.${tableName} WHERE token_id = $1),
                  true  -- default to true for new accounts
                )
              )
              ON CONFLICT (token_id) DO UPDATE SET
                account_name = EXCLUDED.account_name,
                full_account_name = EXCLUDED.full_account_name,
                tba_address = EXCLUDED.tba_address,
                tba_deployed = EXCLUDED.tba_deployed`,
              [id, accountName, fullAccountName, tbaAddress, isDeployed]
            )

            results.push({
              group: group.group_name,
              token: id,
              status: 'success',
              data: {
                accountName: fullAccountName,
                tbaAddress,
                isDeployed
              }
            })
            success++

            // Log progress
            processedTokens++
            if (processedTokens % 10 === 0 || processedTokens === tokens.length) {
              console.log(`Progress: ${processedTokens}/${tokens.length} tokens (${Math.round(processedTokens/tokens.length * 100)}%)`)
            }

          } catch (err: any) {
            results.push({
              group: group.group_name,
              token: id,
              status: 'failed',
              error: err.message
            })
            failed++
            console.log(`Failed to sync token ${id}: ${err.message}`)
          }
        }

        console.log(`Completed group ${group.group_name}: ${success} succeeded, ${failed} failed`)

      } catch (err: any) {
        results.push({
          group: group.group_name,
          status: 'failed',
          error: err.message
        })
        failed++
        console.log(`Failed to process group ${group.group_name}: ${err.message}`)
      }
    }

    console.log(`\nSync completed in ${((Date.now() - startTime)/1000).toFixed(1)}s`)
    console.log(`Total: ${results.length}, Success: ${success}, Failed: ${failed}`)

  } catch (err: any) {
    throw new Error(`Failed to sync accounts: ${err.message}`)
  }

  return {
    options: { entity: 'accounts', group_name, token_id },
    timestamp: startTime,
    stats: { total: results.length, success, failed },
    results
  }
}

// Helper to add delay between batches
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Sync general certificates from chain
async function syncGeneralCertificates(empty_only: boolean = false): Promise<SyncOperationResult> {
  const startTime = Date.now();
  
  try {
    // Get certificates that need syncing
    const certificates = await generalCertificates.getCertificatesForSync(empty_only);
    
    console.log(`\nStarting general certificates sync for ${certificates.length} contracts...`);
    if (empty_only) {
      console.log('Only syncing certificates with missing data...');
    }

    // Sync certificates in batches
    const results = await generalCertificates.syncBatch(certificates, {
      batchSize: 1,  // Each cert makes 4 RPC calls
      batchDelay: 800 // 800ms delay between certs (4 calls per cert = 5 calls/sec)
    });

    const success = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(`\nSync completed in ${((Date.now() - startTime)/1000).toFixed(1)}s`);
    console.log(`Total: ${results.length}, Success: ${success}, Failed: ${failed}`);

    return {
      options: { entity: 'general_certificates', empty_only },
      timestamp: startTime,
      stats: { total: results.length, success, failed },
      results
    };

  } catch (err: any) {
    throw new Error(`Failed to sync general certificates: ${err.message}`);
  }
}

// Sync market data for general certificates
async function syncGeneralCertificatesMarketData(): Promise<SyncOperationResult> {
  console.log('\n=== Starting Market Data Sync ===');
  const startTime = Date.now();
  const results: SyncResult[] = [];
  let success = 0;
  let failed = 0;

  try {
    // Get all certificates
    console.log('Fetching certificates from database...');
    const certificates = await generalCertificates.getAll();
    console.log(`Found ${certificates.length} certificates to sync`);
    
    // Process in smaller batches to avoid rate limits
    const BATCH_SIZE = 3;  // 3 coins per batch
    const BATCH_DELAY = 3000; // 3 seconds between batches
    const CALL_DELAY = 1000;   // 1 second between API calls

    for (let i = 0; i < certificates.length; i += BATCH_SIZE) {
      const batch = certificates.slice(i, i + BATCH_SIZE);
      
      console.log('\n-------------------');
      console.log(`Processing Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(certificates.length/BATCH_SIZE)}`);
      console.log('Addresses:', batch.map(c => c.contract_address).join(', '));

      // Process each certificate in the batch
      for (const cert of batch) {
        try {
          console.log(`\nProcessing ${cert.contract_address}...`);
          
          // Get market data from Zora
          console.log('Calling Zora API...');
          const response = await getCoin({ 
            address: cert.contract_address,
            chain: 8453
          });
          
          // Debug logging
          console.log('Full Zora API response:', JSON.stringify(response, null, 2));
          
          if (!response?.data?.zora20Token) {
            console.log(`❌ No market data available for ${cert.contract_address}`);
            console.log('Response structure:', {
              hasResponse: !!response,
              hasData: !!response?.data,
              hasZora20Token: !!response?.data?.zora20Token
            });
            results.push({
              id: cert.contract_address,
              status: 'failed',
              error: 'No market data available'
            });
            failed++;
            continue;
          }

          const coinData = response.data.zora20Token;

          // Log the market data we found
          console.log('Found market data:', {
            totalVolume: coinData.totalVolume,
            volume24h: coinData.volume24h,
            marketCap: coinData.marketCap,
            creatorEarnings: coinData.creatorEarnings,
            uniqueHolders: coinData.uniqueHolders
          });

          // Update market data in database
          await generalCertificates.updateMarketData(cert, {
            total_volume: coinData.totalVolume || '0',
            volume_24h: coinData.volume24h || '0',
            market_cap: coinData.marketCap || '0',
            creator_earnings: coinData.creatorEarnings || [],
            unique_holders: coinData.uniqueHolders || 0
          });

          console.log(`✓ Updated ${cert.contract_address}`);
          results.push({
            id: cert.contract_address,
            status: 'success',
            data: {
              contract_address: cert.contract_address,
              chain: cert.chain,
              name: cert.name || '',
              symbol: cert.symbol || '',
              token_uri: cert.token_uri || '',
              pool_address: cert.pool_address || '',
              total_volume: coinData.totalVolume || '0',
              volume_24h: coinData.volume24h || '0',
              market_cap: coinData.marketCap || '0',
              creator_earnings: coinData.creatorEarnings || [],
              unique_holders: coinData.uniqueHolders || 0
            }
          });
          success++;

          // Add delay between API calls
          await sleep(CALL_DELAY);

        } catch (err: any) {
          console.error(`❌ Failed to process ${cert.contract_address}:`, err);
          results.push({
            id: cert.contract_address,
            status: 'failed',
            error: err.message
          });
          failed++;
        }
      }

      // Add delay between batches
      if (i + BATCH_SIZE < certificates.length) {
        console.log(`\nWaiting ${BATCH_DELAY/1000} seconds before next batch...`);
        await sleep(BATCH_DELAY);
      }

      // Log progress
      const progress = Math.min(i + BATCH_SIZE, certificates.length);
      const percentage = ((progress / certificates.length) * 100).toFixed(1);
      console.log('\n-------------------');
      console.log(`Progress: ${progress}/${certificates.length} (${percentage}%)`);
      console.log(`Success: ${success}, Failed: ${failed}`);
    }

    const duration = ((Date.now() - startTime)/1000).toFixed(1);
    console.log('\n=== Market Data Sync Complete ===');
    console.log(`Duration: ${duration}s`);
    console.log(`Final Stats - Total: ${results.length}, Success: ${success}, Failed: ${failed}`);

    return {
      options: { entity: 'general_certificates', market_data: true },
      timestamp: startTime,
      stats: { total: results.length, success, failed },
      results
    };

  } catch (err: any) {
    console.error('❌ Fatal error:', err);
    throw new Error(`Market data sync failed: ${err.message}`);
  }
}

// Main sync function
export async function sync(entity: SyncEntity, options: Omit<SyncOptions, 'entity'> = {}): Promise<SyncOperationResult> {
  console.log('Starting sync operation:', { entity, options });
  
  switch (entity) {
    case 'groups':
      return syncGroups()
    case 'accounts':
      return syncAccounts(options.group_name, options.token_id)
    case 'general_certificates':
      if (options.market_data) {
        console.log('Starting market data sync...');
        return syncGeneralCertificatesMarketData();
      } else {
        console.log('Starting regular sync...');
        return syncGeneralCertificates(options.empty_only);
      }
    default:
      throw new Error(`Unknown entity type: ${entity}`)
  }
} 