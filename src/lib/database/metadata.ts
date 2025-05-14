import { sql } from '@vercel/postgres';
import { ImageGenerator } from '@/modules/metadata/ImageGenerator';
import { sync } from '@/modules/admin/sync/service';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Initialize Viem client
const client = createPublicClient({
    chain: base,
    transport: http()
});

// Contract ABI for checking token existence
const GROUP_ABI = [
    {
        "inputs": [{"type": "uint256"}],
        "name": "domainIdsNames",
        "outputs": [{"type": "string"}],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

// Helper to check if image exists
async function checkImageExists(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

// Helper to check if table exists
async function checkTableExists(tableName: string): Promise<boolean> {
    try {
        const result = await sql.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'members'
                AND table_name = $1
            )
        `, [tableName.replace('members.', '')]);
        return result.rows[0].exists;
    } catch (error) {
        console.error('Error checking table existence:', error);
        return false;
    }
}

export const metadata = {
    // Get NFT metadata by contract and token ID
    getByContractAndToken: async (contract: string, tokenId: string) => {
        try {
            // Get group info from contract address
            const { rows: [group] } = await sql`
                SELECT * FROM members.groups 
                WHERE decode(replace(contract_address, '0x', ''), 'hex') = decode(replace(${contract}, '0x', ''), 'hex')
                LIMIT 1
            `;

            if (!group) {
                throw new Error('Group not found');
            }

            // Remove leading dot for table name
            const sanitizedGroup = group.group_name.startsWith('.') ? group.group_name.slice(1) : group.group_name;
            const tableName = `accounts_${sanitizedGroup}`;

            // Check if table exists
            const tableExists = await checkTableExists(tableName);
            if (!tableExists) {
                throw new Error(`Accounts table for group ${group.group_name} does not exist`);
            }

            // Check if token exists on-chain using domainIdsNames
            console.log('Checking if token exists on-chain:', tokenId);
            let accountName;
            try {
                accountName = await client.readContract({
                    address: contract as `0x${string}`,
                    abi: GROUP_ABI,
                    functionName: 'domainIdsNames',
                    args: [BigInt(tokenId)]
                });

                // If account name is empty or just the group name, token doesn't exist
                if (!accountName || accountName === group.group_name) {
                    console.log('Token does not exist on-chain');
                    
                    // Clean up any existing row
                    await sql.query(
                        `DELETE FROM members.${tableName} WHERE token_id = $1`,
                        [tokenId]
                    );
                    
                    return {
                        error: `Token ${tokenId} does not exist on-chain`,
                        status: 404
                    };
                }

                console.log('Token exists on-chain with name:', accountName);
            } catch (error) {
                console.error('Error checking token on-chain:', error);
                return {
                    error: `Failed to verify token ${tokenId} on chain`,
                    status: 500
                };
            }

            // If we get here, token exists on-chain
            console.log('Token exists on-chain, proceeding with sync');

            // Sync token data
            await sync('accounts', { 
                group_name: group.group_name, 
                token_id: parseInt(tokenId) 
            });

            // Get synced account data
            const { rows: [syncedAccount] } = await sql.query(
                `SELECT 
                    token_id,
                    account_name,
                    description,
                    tba_address,
                    full_account_name
                FROM members.${tableName}
                WHERE token_id = $1 
                LIMIT 1`,
                [tokenId]
            );

            if (!syncedAccount) {
                return {
                    error: 'Failed to sync token data',
                    status: 500
                };
            }

            // Get base image URL with fallbacks
            const baseUrl = process.env.NEXT_PUBLIC_BLOB_URL;
            const tokenImageUrl = `${baseUrl}/${sanitizedGroup}/${tokenId}.png`;
            const defaultImageUrl = `${baseUrl}/${sanitizedGroup}/0.png`;
            const fallbackImageUrl = `${baseUrl}/default.png`;

            // Check images in order: token specific -> group default -> global default
            let baseImageUrl = tokenImageUrl;
            if (!(await checkImageExists(tokenImageUrl))) {
                console.log('Token-specific image not found, checking group default');
                if (await checkImageExists(defaultImageUrl)) {
                    baseImageUrl = defaultImageUrl;
                } else {
                    console.log('Group default image not found, using global fallback');
                    baseImageUrl = fallbackImageUrl;
                }
            }

            // Generate metadata image with text overlay
            const imageUrl = await ImageGenerator.generate({
                baseImageUrl,
                fullAccountName: syncedAccount.full_account_name,
                groupName: sanitizedGroup,
                tokenId,
                contract
            });

            return {
                name: `${syncedAccount.account_name}${group.group_name}`,
                description: syncedAccount.description || '',
                animation_url: `https://iframe-tokenbound.vercel.app/${contract}/${tokenId}/8453`,
                image: imageUrl,
                group_name: sanitizedGroup,
                tba_address: syncedAccount.tba_address,
                full_account_name: syncedAccount.full_account_name
            };

        } catch (error) {
            console.error('Error in getMetadata:', error);
            return {
                error: error instanceof Error ? error.message : 'Unknown error',
                status: 500
            };
        }
    }
}; 