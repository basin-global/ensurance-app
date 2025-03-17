import { sql } from '@vercel/postgres';

export const accounts = {
    // Get minimal data for search results
    getSearchResults: async () => {
        try {
            // First get all groups
            const groups = await sql`SELECT group_name FROM members.groups ORDER BY group_name`;
            
            let allAccounts = [];
            
            // Query each group's table sequentially but only get search-relevant fields
            for (const group of groups.rows) {
                const tableName = `accounts_${group.group_name.substring(1)}`; // Remove the leading dot
                try {
                    const result = await sql`
                        SELECT 
                            full_account_name,
                            token_id,
                            is_agent,
                            ${group.group_name} as group_name
                        FROM members.${tableName}
                    `;
                    allAccounts = [...allAccounts, ...result.rows];
                } catch (error) {
                    console.error(`Error querying ${tableName}:`, error.message);
                    continue;
                }
            }
            
            // Sort results: agents first, then alphabetically
            return allAccounts.sort((a, b) => {
                // First sort by is_agent
                if (a.is_agent !== b.is_agent) return a.is_agent ? -1 : 1;
                
                // Then handle null names and sort alphabetically
                if (!a.full_account_name && !b.full_account_name) return 0;
                if (!a.full_account_name) return 1;  // null values go to end
                if (!b.full_account_name) return -1;
                return a.full_account_name.localeCompare(b.full_account_name);
            });
            
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },

    // Get ALL accounts across all groups
    getAll: async () => {
        try {
            // First get all groups
            const groups = await sql`SELECT group_name FROM members.groups ORDER BY group_name`;
            
            let allAccounts = [];
            
            // Query each group's table sequentially to avoid connection issues
            for (const group of groups.rows) {
                const tableName = `accounts_${group.group_name.substring(1)}`; // Remove the leading dot
                const isEnsurance = group.group_name === '.ensurance';
                
                // Conditionally include pool_type, display_name, and stats only for .ensurance group
                const ensuranceColumns = isEnsurance 
                    ? 'pool_type, display_name, total_currency_value, total_assets, ensured_assets,' 
                    : '';
                
                try {
                    const result = await sql`
                        SELECT 
                            full_account_name,
                            token_id,
                            is_agent,
                            ${ensuranceColumns}
                            ${group.group_name} as group_name
                        FROM members.${tableName}
                    `;
                    
                    // Add default values for stats only for ensurance accounts
                    const accounts = isEnsurance 
                        ? result.rows.map(account => ({
                            ...account,
                            total_currency_value: account.total_currency_value || 0,
                            total_assets: account.total_assets || 0,
                            ensured_assets: account.ensured_assets || 0
                        }))
                        : result.rows;
                        
                    allAccounts = [...allAccounts, ...accounts];
                } catch (error) {
                    // If table doesn't exist, skip this group
                    console.log(`No account table for group ${group.group_name}`);
                    continue;
                }
            }
            
            // Sort results: agents first, then alphabetically
            return allAccounts.sort((a, b) => {
                // First sort by is_agent
                if (a.is_agent !== b.is_agent) return a.is_agent ? -1 : 1;
                
                // Then handle null names and sort alphabetically
                if (!a.full_account_name && !b.full_account_name) return 0;
                if (!a.full_account_name) return 1;  // null values go to end
                if (!b.full_account_name) return -1;
                return a.full_account_name.localeCompare(b.full_account_name);
            });
            
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },

    // Get single account by full name (e.g., "alice.earth")
    getByFullName: async (fullAccountName: string) => {
        // Validate account name format
        const parts = fullAccountName.split('.');
        if (parts.length !== 2) {
            console.log('Invalid account name format:', fullAccountName);
            return null;
        }

        const groupName = parts[1];
        const tableName = `accounts_${groupName}`;
        const isEnsurance = groupName === 'ensurance';
        
        // Conditionally include pool_type and display_name only for .ensurance group
        const ensuranceColumns = isEnsurance ? 'pool_type, display_name,' : '';
        
        try {
            const result = await sql`
                SELECT 
                    full_account_name,
                    tba_address,
                    token_id,
                    is_agent,
                    ${ensuranceColumns}
                    description,
                    ${groupName} as group_name
                FROM members.${tableName}
                WHERE full_account_name = ${fullAccountName}
                LIMIT 1
            `;
            
            if (!result.rows.length) {
                console.log('No account found for:', fullAccountName);
                return null;
            }
            
            const row = result.rows[0];
            
            // Log the final return object
            const returnObj = {
                full_account_name: row.full_account_name,
                tba_address: row.tba_address,
                token_id: row.token_id,
                is_agent: row.is_agent,
                description: row.description,
                group_name: groupName,
                ...(isEnsurance && { 
                    pool_type: row.pool_type,
                    display_name: row.display_name
                })
            };
            console.log('Returning object:', returnObj);
                        
            return returnObj;
        } catch (error) {
            console.error('Error fetching account:', error);
            return null;
        }
    }
}; 