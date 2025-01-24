import { sql } from '@vercel/postgres';

// Get basic info from registry
export async function getRegistryData(name?: string) {
  const query = name 
    ? sql`
        SELECT name, id, is_active 
        FROM registry 
        WHERE name = ${name}
      `
    : sql`
        SELECT name, id, is_active 
        FROM registry 
        WHERE is_active = true
      `;
  
  return (await query).rows;
}

// Get character data
export async function getCharacterData(name: string) {
  const query = sql`
    SELECT * FROM character_data 
    WHERE full_account_name = ${name}
  `;
  
  return (await query).rows[0];
}

// Main function to get all data for a character
export async function getFullCharacterData(name?: string) {
  const registryEntries = await getRegistryData(name);
  
  const results = await Promise.all(
    registryEntries.map(async (entry) => {
      const characterData = await getCharacterData(entry.name);
      return {
        registry: entry,
        character: characterData
      };
    })
  );

  return results;
}