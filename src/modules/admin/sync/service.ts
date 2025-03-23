import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { sql } from '@vercel/postgres'
import { TokenboundClient } from "@tokenbound/sdk"
import { getTokenBoundClientConfig } from '@/config/tokenbound'
import type { SyncEntity, SyncOperationResult } from './types'

// Initialize Viem client
const client = createPublicClient({
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
                is_active
              ) VALUES (
                $1, $2, $3, $4,
                COALESCE(
                  (SELECT is_active FROM members.${tableName} WHERE token_id = $1),
                  true  -- default to true for new accounts
                )
              )
              ON CONFLICT (token_id) DO UPDATE SET
                account_name = EXCLUDED.account_name,
                full_account_name = EXCLUDED.full_account_name,
                tba_address = EXCLUDED.tba_address`,
              [id, accountName, fullAccountName, tbaAddress]
            )

            results.push({
              group: group.group_name,
              token: id,
              status: 'success',
              data: {
                accountName: fullAccountName,
                tbaAddress
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

// Main sync function
export async function sync(entity: SyncEntity, options: { group_name?: string, token_id?: number } = {}): Promise<SyncOperationResult> {
  switch (entity) {
    case 'groups':
      return syncGroups()
    case 'accounts':
      return syncAccounts(options.group_name, options.token_id)
    default:
      throw new Error(`Unknown entity type: ${entity}`)
  }
} 