import { sql } from '@vercel/postgres';

export const accounts = {
    // Get minimal data for search results
    getSearchResults: async () => {
        try {
            // First get all groups
            const groups = await sql`SELECT og_name FROM situs_ogs ORDER BY og_name`;
            
            let allAccounts = [];
            
            // Query each group's table sequentially but only get search-relevant fields
            for (const group of groups.rows) {
                const tableName = `situs_accounts_${group.og_name.replace('.', '')}`;
                const query = `
                    SELECT 
                        full_account_name,
                        is_agent
                    FROM "${tableName}"
                `;
                
                const result = await sql.query(query);
                allAccounts = [...allAccounts, ...result.rows];
            }
            
            // Sort results
            return allAccounts.sort((a, b) => 
                a.full_account_name.localeCompare(b.full_account_name)
            );
            
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },

    // Get ALL accounts across all groups
    getAll: async () => {
        try {
            // First get all groups
            const groups = await sql`SELECT og_name FROM situs_ogs ORDER BY og_name`;
            
            let allAccounts = [];
            
            // Query each group's table sequentially to avoid connection issues
            for (const group of groups.rows) {
                const tableName = `situs_accounts_${group.og_name.replace('.', '')}`;
                const query = `
                    SELECT 
                        full_account_name,
                        token_id,
                        is_agent,
                        '${group.og_name}' as og_name
                    FROM "${tableName}"
                `;
                
                const result = await sql.query(query);
                allAccounts = [...allAccounts, ...result.rows];
            }
            
            // Sort results
            return allAccounts.sort((a, b) => 
                a.full_account_name.localeCompare(b.full_account_name)
            );
            
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },

    // Get single account by full name (e.g., "alice.earth")
    getByFullName: async (fullAccountName: string) => {
        const groupName = fullAccountName.split('.')[1];
        const tableName = `situs_accounts_${groupName}`;
        
        const query = `
            SELECT 
                full_account_name,
                tba_address,
                token_id,
                is_agent,
                description,
                '${groupName}' as og_name
            FROM "${tableName}"
            WHERE full_account_name = $1
            LIMIT 1
        `;
        
        // Add more detailed debug logging
        console.log('Running query:', query);
        console.log('For account:', fullAccountName);
        const result = await sql.query(query, [fullAccountName]);
        console.log('Raw Database Result:', result.rows[0]);
        console.log('Description from DB:', result.rows[0]?.description);
        const row = result.rows[0];
        
        // Log the final return object
        const returnObj = {
            full_account_name: row.full_account_name,
            tba_address: row.tba_address,
            token_id: row.token_id,
            is_agent: row.is_agent,
            description: row.description,
            og_name: groupName
        };
        console.log('Returning object:', returnObj);
        
        return returnObj;
    }
}; 