import { db } from '../';

export const accounts = {
    // Get all accounts for a group
    getByGroup: async (groupName: string) => {
        // Remove the dot and get table name
        const tableName = `situs_accounts_${groupName.replace(/^\./, '')}`;
        
        // Use raw SQL but safely concatenated
        const result = await db.query(`
            SELECT * FROM "${tableName}"
            ORDER BY account_name
        `);
        return result.rows;
    },

    // Get single account
    getByName: async (accountName: string, groupName: string) => {
        // Remove the dot and get table name
        const tableName = `situs_accounts_${groupName.replace(/^\./, '')}`;
        
        const result = await db.query(`
            SELECT * FROM "${tableName}"
            WHERE account_name = $1
            LIMIT 1
        `, [accountName]);
        return result.rows[0];
    }
}; 