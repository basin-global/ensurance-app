import { db } from '../';

// All group operations in one place
export const groups = {
    // Get all groups
    getAll: async () => {
        const result = await db`SELECT * FROM situs_ogs ORDER BY og_name`;
        return result.rows;
    },
    
    // Get single group
    getByName: async (ogName: string) => {
        const result = await db`
            SELECT * FROM situs_ogs 
            WHERE og_name = ${ogName} 
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
        chat?: string
    }) => {
        const result = await db`
            INSERT INTO situs_ogs (
                og_name, 
                name_front, 
                tagline, 
                description, 
                email, 
                website, 
                chat
            ) VALUES (
                ${data.og_name},
                ${data.name_front},
                ${data.tagline},
                ${data.description},
                ${data.email},
                ${data.website},
                ${data.chat}
            ) 
            RETURNING *`;
        return result.rows[0];
    }
}; 