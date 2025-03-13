import { sql } from '@vercel/postgres';

// All group operations in one place
export const groups = {
    // Get minimal data for search results
    getSearchResults: async () => {
        try {
            const result = await sql`
                SELECT 
                    og_name,
                    name_front
                FROM situs_ogs 
                ORDER BY og_name
            `;
            return result.rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },
    
    // Get all groups
    getAll: async (includeInactive = false) => {
        const result = await sql`
            SELECT * FROM situs_ogs 
            WHERE is_active = true 
            ORDER BY og_name`;
        return result.rows;
    },
    
    // Get single group
    getByName: async (ogName: string) => {
        const result = await sql`
            WITH group_data AS (
                SELECT 
                    og_name,
                    name_front,
                    tagline,
                    description,
                    email,
                    website,
                    chat,
                    situs_account,
                    contract_address,
                    total_supply
                FROM situs_ogs 
                WHERE og_name = ${ogName}
            )
            SELECT 
                g.*,
                s.tba_address
            FROM group_data g
            LEFT JOIN situs_accounts_situs s ON s.full_account_name = g.situs_account
            LIMIT 1`;
        return result.rows[0];
    },
    
    // Create group
    create: async (data: {
        og_name: string,
        name_front?: string,
        tagline?: string,
        description?: string,
        email?: string,
        website?: string,
        chat?: string,
        situs_account?: string
    }) => {
        const result = await sql`
            INSERT INTO situs_ogs (
                og_name, 
                name_front, 
                tagline, 
                description, 
                email, 
                website, 
                chat,
                situs_account
            ) VALUES (
                ${data.og_name},
                ${data.name_front},
                ${data.tagline},
                ${data.description},
                ${data.email},
                ${data.website},
                ${data.chat},
                ${data.situs_account}
            ) 
            RETURNING *`;
        return result.rows[0];
    }
}; 