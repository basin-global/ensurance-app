import { setApiKey } from '@zoralabs/coins-sdk'

// Set Zora API key from environment variable
if (process.env.ZORA_COINS_API_KEY) {
  setApiKey(process.env.ZORA_COINS_API_KEY)
  console.log('Zora API key configured')
} else {
  console.warn('ZORA_COINS_API_KEY not found in environment variables')
} 