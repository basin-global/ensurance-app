import { config } from 'dotenv';
import { createBasePolicy } from '../config/privy/policies';
import path from 'path';

// Load .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  try {
    // Log environment variables to debug
    console.log('Environment check:');
    console.log('NEXT_PUBLIC_PRIVY_APP_ID:', process.env.NEXT_PUBLIC_PRIVY_APP_ID?.slice(0, 5) + '...');
    console.log('PRIVY_APP_SECRET exists:', !!process.env.PRIVY_APP_SECRET);
    
    console.log('\nCreating base policy...');
    const policyId = await createBasePolicy();
    console.log('Policy created successfully!');
    console.log('Policy ID:', policyId);
  } catch (error) {
    console.error('Failed to create policy:', error);
  }
}

main(); 