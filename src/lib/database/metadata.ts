import { sql } from '@vercel/postgres';
import { ImageGenerator } from '@/modules/metadata/ImageGenerator';
import { sync } from '@/modules/admin/sync/service';

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

            // Get account info
            const accountQuery = await sql.query(
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
            
            let account = accountQuery.rows[0];
            if (!account) {
                throw new Error('Account not found');
            }

            // If we're missing critical data, trigger a sync for this token
            if (!account.full_account_name || !account.tba_address) {
                console.log('Missing data, triggering sync for token:', tokenId);
                await sync('accounts', { 
                    group_name: group.group_name, 
                    token_id: parseInt(tokenId) 
                });
                
                // Get updated account data
                const { rows: [updatedAccount] } = await sql.query(
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
                account = updatedAccount;
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
                fullAccountName: account.full_account_name,
                groupName: sanitizedGroup,
                tokenId,
                contract
            });

            return {
                name: `${account.account_name}${group.group_name}`,
                description: account.description || '',
                animation_url: `https://iframe-tokenbound.vercel.app/${contract}/${tokenId}/8453`,
                image: imageUrl,
                group_name: sanitizedGroup,
                tba_address: account.tba_address,
                full_account_name: account.full_account_name
            };
        } catch (error) {
            console.error('Error in getMetadata:', error);
            throw error;
        }
    }
}; 