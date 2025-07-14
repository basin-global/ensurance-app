import { sql } from '@vercel/postgres';

// All group operations in one place
export const groups = {
    // Get minimal data for search results
    getSearchResults: async () => {
        try {
            const result = await sql`
                SELECT 
                    group_name,
                    name_front
                FROM members.groups 
                WHERE is_active = true
                ORDER BY group_name
            `;
            return result.rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },
    
    // Get all groups
    getAll: async (includeInactive = false) => {
        const result = includeInactive 
            ? await sql`SELECT * FROM members.groups ORDER BY group_name`
            : await sql`SELECT * FROM members.groups WHERE is_active = true ORDER BY group_name`;
        return result.rows;
    },
    
    // Get single group
    getByName: async (groupName: string) => {
        const result = await sql`
            WITH group_data AS (
                SELECT 
                    group_name,
                    name_front,
                    tagline,
                    description,
                    email,
                    website,
                    chat,
                    situs_account,
                    contract_address,
                    total_supply
                FROM members.groups 
                WHERE group_name = ${groupName}
            )
            SELECT 
                g.*,
                s.tba_address
            FROM group_data g
            LEFT JOIN members.accounts_situs s ON s.full_account_name = g.situs_account
            LIMIT 1`;
        return result.rows[0];
    },
    
    // Create group
    // Note: This is for initial group creation only. contract_address (which is NOT NULL in DB) 
    // must be added separately after contract deployment. For groups found during sync,
    // we'll need a different approach that includes contract_address.
    create: async (data: {
        group_name: string,
        name_front?: string,
        tagline?: string,
        description?: string,
        email?: string,
        website?: string,
        chat?: string,
        situs_account?: string
    }) => {
        const result = await sql`
            INSERT INTO members.groups (
                group_name, 
                name_front, 
                tagline, 
                description, 
                email, 
                website, 
                chat,
                situs_account
            ) VALUES (
                ${data.group_name},
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