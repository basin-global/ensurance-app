import { config } from 'dotenv';
import { updatePolicy } from '../config/privy/policies';
import path from 'path';

// Load .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const POLICY_ID = 'n2n8fersss2671k7zi8f3vab'; // The policy ID we just created

async function main() {
  try {
    console.log('Environment check:');
    console.log('NEXT_PUBLIC_PRIVY_APP_ID:', process.env.NEXT_PUBLIC_PRIVY_APP_ID?.slice(0, 5) + '...');
    console.log('PRIVY_APP_SECRET exists:', !!process.env.PRIVY_APP_SECRET);
    
    console.log('\nUpdating policy...');
    await updatePolicy(POLICY_ID);
    console.log('Policy updated successfully!');
  } catch (error) {
    console.error('Failed to update policy:', error);
  }
}

main(); 