import { getFullCharacterData } from './db';

async function main() {
  // Get command line args if any
  const characterName = process.argv[2];
  
  try {
    const data = await getFullCharacterData(characterName);
    console.log('Character data:', JSON.stringify(data, null, 2));
    
    // TODO: Format into Eliza character JSON
    // TODO: Write to characters/generated/
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
