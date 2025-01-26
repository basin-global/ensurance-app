import { sql } from '@vercel/postgres';
import { ImageGenerator } from '@/modules/metadata/ImageGenerator';

// Helper to check if image exists
async function checkImageExists(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

export const metadata = {
    // Get NFT metadata by contract and token ID
    getByContractAndToken: async (contract: string, tokenId: string) => {
        try {
            // Get OG info from contract address
            const { rows: [og] } = await sql`
                SELECT * FROM situs_ogs 
                WHERE decode(replace(contract_address, '0x', ''), 'hex') = decode(replace(${contract}, '0x', ''), 'hex')
                LIMIT 1
            `;

            if (!og) {
                throw new Error('OG not found');
            }

            const sanitizedOG = og.og_name.replace('.', '');
            const tableName = `situs_accounts_${sanitizedOG}`;

            // Get account info
            const accountQuery = await sql.query(
                `SELECT 
                    token_id,
                    account_name,
                    description,
                    tba_address,
                    full_account_name
                FROM "${tableName}" 
                WHERE token_id = $1 
                LIMIT 1`,
                [tokenId]
            );
            
            const account = accountQuery.rows[0];
            if (!account) {
                throw new Error('Account not found');
            }

            // Get base image URL with fallbacks
            const baseUrl = process.env.NEXT_PUBLIC_BLOB_URL;
            const tokenImageUrl = `${baseUrl}/${sanitizedOG}/${tokenId}.png`;
            const defaultImageUrl = `${baseUrl}/${sanitizedOG}/0.png`;
            const fallbackImageUrl = `${baseUrl}/default.png`;

            // Check images in order: token specific -> OG default -> global default
            let baseImageUrl = tokenImageUrl;
            if (!(await checkImageExists(tokenImageUrl))) {
                console.log('Token-specific image not found, checking OG default');
                if (await checkImageExists(defaultImageUrl)) {
                    baseImageUrl = defaultImageUrl;
                } else {
                    console.log('OG default image not found, using global fallback');
                    baseImageUrl = fallbackImageUrl;
                }
            }

            // Generate metadata image with text overlay
            const imageUrl = await ImageGenerator.generate({
                baseImageUrl,
                fullAccountName: account.full_account_name,
                ogName: sanitizedOG,
                tokenId
            });

            return {
                name: `${account.account_name}${og.og_name}`,
                description: account.description || '',
                animation_url: `https://iframe-tokenbound.vercel.app/${contract}/${tokenId}/8453`,
                image: imageUrl,
                og_name: sanitizedOG,
                tba_address: account.tba_address,
                full_account_name: account.full_account_name
            };
        } catch (error) {
            console.error('Error in getMetadata:', error);
            throw error;
        }
    }
}; 