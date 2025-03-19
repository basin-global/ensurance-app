import { sql } from '@vercel/postgres';
import { TokenboundClient } from "@tokenbound/sdk";
import { getTokenBoundClientConfig } from '@/config/tokenbound';
import { Group, GroupAccount } from '@/types';

export const accounts = {
    // Get ALL accounts across active groups
    getAll: async () => {
        try {
            // Get active groups from database
            const groups = await sql`
                SELECT group_name 
                FROM members.groups 
                WHERE is_active = true 
                ORDER BY group_name
            `;
            
            let allAccounts = [];
            
            // Query each active group's table
            for (const group of groups.rows) {
                const tableName = `accounts_${group.group_name.substring(1)}`; // Remove the leading dot
                try {
                    console.log(`Querying table: members.${tableName}`);
                    const result = await sql.query(
                        `SELECT 
                            full_account_name,
                            token_id,
                            is_agent,
                            '${group.group_name}' as group_name
                        FROM members.${tableName}`
                    );
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

    // Get minimal data for search results
    getSearchResults: async () => {
        try {
            // Get active groups from database
            const groups = await sql`
                SELECT group_name 
                FROM members.groups 
                WHERE is_active = true 
                ORDER BY group_name
            `;
            
            let allAccounts = [];
            
            // Query each active group's table
            for (const group of groups.rows) {
                const tableName = `accounts_${group.group_name.substring(1)}`; // Remove the leading dot
                try {
                    console.log(`Querying table: members.${tableName}`);
                    const result = await sql.query(
                        `SELECT 
                            full_account_name,
                            token_id,
                            is_agent,
                            '${group.group_name}' as group_name
                        FROM members.${tableName}`
                    );
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
        
        try {
            // Keep schema for groups table
            const groupResult = await sql`
                SELECT contract_address
                FROM members.groups
                WHERE group_name = ${`.${groupName}`}
                LIMIT 1
            `;

            if (!groupResult.rows.length) {
                console.log('No group found for:', groupName);
                return null;
            }

            const contractAddress = groupResult.rows[0].contract_address;
            
            // Remove schema for dynamic table query
            const query = `
                SELECT 
                    full_account_name,
                    tba_address,
                    token_id,
                    is_agent,
                    account_name,
                    ${isEnsurance ? 'pool_type, display_name,' : ''}
                    description,
                    ${groupName} as group_name
                FROM ${tableName}
                WHERE token_id = $1
                LIMIT 1
            `;
            
            const result = await sql.query(query, [parts[0]]);
            
            if (!result.rows.length) {
                console.log('No account found for:', fullAccountName);
                return null;
            }
            
            const row = result.rows[0];

            // If full_account_name is NULL, generate and update it
            if (!row.full_account_name) {
                console.log('Generating full_account_name for token_id:', row.token_id);
                const generatedFullName = `${row.account_name}.${groupName}`;
                await sql`
                    UPDATE members.${tableName}
                    SET full_account_name = ${generatedFullName}
                    WHERE token_id = ${row.token_id}
                    RETURNING *
                `;
                row.full_account_name = generatedFullName;
            }

            // If tba_address is NULL, generate and update it
            if (!row.tba_address) {
                console.log('Generating tba_address for token_id:', row.token_id);
                const tokenboundClient = new TokenboundClient(getTokenBoundClientConfig());
                const tba = await tokenboundClient.getAccount({
                    tokenContract: contractAddress,
                    tokenId: row.token_id.toString()
                });
                
                await sql`
                    UPDATE members.${tableName}
                    SET tba_address = ${tba}
                    WHERE token_id = ${row.token_id}
                    RETURNING *
                `;
                row.tba_address = tba;
            }
            
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
    },

    // Get accounts for a specific group
    getByGroup: async (groupName: string): Promise<GroupAccount[]> => {
        try {
            // Remove leading dot if present
            const cleanGroupName = groupName.startsWith('.') ? groupName.substring(1) : groupName;
            const tableName = `accounts_${cleanGroupName}`;
            
            console.log(`Querying group table: members.${tableName}`);
            const result = await sql.query(
                `SELECT 
                    full_account_name,
                    token_id,
                    is_agent,
                    '.${cleanGroupName}' as group_name
                FROM members.${tableName}`
            );
            
            // Sort results: agents first, then alphabetically
            return result.rows.sort((a, b) => {
                // First sort by is_agent
                if (a.is_agent !== b.is_agent) return a.is_agent ? -1 : 1;
                
                // Then handle null names and sort alphabetically
                if (!a.full_account_name && !b.full_account_name) return 0;
                if (!a.full_account_name) return 1;  // null values go to end
                if (!b.full_account_name) return -1;
                return a.full_account_name.localeCompare(b.full_account_name);
            });
            
        } catch (error) {
            console.error(`Error fetching accounts for group ${groupName}:`, error);
            throw error;
        }
    }
}; 