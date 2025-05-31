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
            
            let allAccounts: Array<{
                full_account_name: string;
                token_id: string;
                is_agent: boolean;
                group_name: string;
            }> = [];
            
            // Query each active group's table
            for (const group of groups.rows) {
                const tableName = `accounts_${group.group_name.startsWith('.') ? group.group_name.substring(1) : group.group_name}`; // Handle both formats
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
                } catch (error: unknown) {
                    if (error instanceof Error) {
                        console.error(`Error querying ${tableName}:`, error.message);
                    }
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
            
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Database query error:', error);
            }
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
            
            let allAccounts: Array<{
                full_account_name: string;
                is_agent: boolean;
                group_name: string;
            }> = [];
            
            // Query each active group's table
            for (const group of groups.rows) {
                const tableName = `accounts_${group.group_name.startsWith('.') ? group.group_name.substring(1) : group.group_name}`; // Handle both formats
                try {
                    const result = await sql.query(
                        `SELECT DISTINCT
                            full_account_name,
                            is_agent,
                            token_id,
                            '${group.group_name}' as group_name
                        FROM members.${tableName}
                        WHERE is_active = true`
                    );
                    allAccounts = [...allAccounts, ...result.rows];
                } catch (error: unknown) {
                    if (error instanceof Error) {
                        console.error(`Error querying ${tableName}:`, error.message);
                    }
                    continue; // Skip failed tables and continue with others
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
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error fetching search results:', error);
            }
            return [];
        }
    },

    // Get single account by full name (e.g., "alice.earth")
    getByFullName: async (fullAccountName: string) => {
        // Ensure we're working with the decoded version of the account name
        const decodedName = decodeURIComponent(fullAccountName);
        const parts = decodedName.split('.');
        if (parts.length !== 2) {
            console.log('Invalid account name format:', decodedName);
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
            
            // Query by full_account_name - use the decoded name for comparison
            const query = `
                SELECT 
                    full_account_name,
                    tba_address,
                    token_id,
                    is_agent,
                    account_name,
                    ${isEnsurance ? 'stock_or_flow, display_name,' : ''}
                    description,
                    $2 as group_name
                FROM members.${tableName}
                WHERE full_account_name = $1
                LIMIT 1
            `;
            
            const result = await sql.query(query, [decodedName, groupName]);
            
            if (!result.rows.length) {
                console.log('No account found for:', decodedName);
                return null;
            }
            
            const row = result.rows[0];
            
            // Return the account data
            const returnObj = {
                full_account_name: row.full_account_name,
                tba_address: row.tba_address,
                token_id: row.token_id,
                is_agent: row.is_agent,
                description: row.description,
                group_name: groupName,
                ...(isEnsurance && { 
                    stock_or_flow: row.stock_or_flow,
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
            const isEnsurance = cleanGroupName === 'ensurance';
            
            console.log(`Querying group table: members.${tableName}`);
            const result = await sql.query(
                `SELECT 
                    full_account_name,
                    token_id,
                    is_agent,
                    '.${cleanGroupName}' as group_name
                    ${isEnsurance ? ', stock_or_flow, display_name' : ''}
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
            
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(`Error fetching accounts for group ${groupName}:`, error);
            }
            throw error;
        }
    }
};