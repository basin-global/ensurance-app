import { db } from '../';

export const accounts = {
    // Get ALL accounts across all groups with pagination
    getAll: async () => {
        // First get all OG names
        const ogsResult = await db.query(`
            SELECT og_name FROM situs_ogs
        `);
        
        // Build UNION ALL query dynamically
        const unionQueries = ogsResult.rows.map(og => `
            SELECT 
                full_account_name,
                tba_address,
                token_id,
                is_agent,
                '${og.og_name}' as og_name
            FROM situs_accounts_${og.og_name.replace('.', '')}
        `).join('\nUNION ALL\n');

        const result = await db.query(`
            ${unionQueries}
            ORDER BY full_account_name
        `);
        
        return result.rows;
    },

    // Get single account by full name (e.g., "alice.earth")
    getByFullName: async (fullAccountName: string) => {
        // Extract group name from full account name
        const groupName = fullAccountName.split('.')[1];
        
        const result = await db.query(`
            SELECT 
                full_account_name,
                tba_address,
                token_id,
                is_agent,
                '.${groupName}' as og_name
            FROM situs_accounts_${groupName}
            WHERE full_account_name = $1
            LIMIT 1
        `, [fullAccountName]);
        
        console.log('Query result:', result.rows[0])
        return result.rows[0];
    }
}; 