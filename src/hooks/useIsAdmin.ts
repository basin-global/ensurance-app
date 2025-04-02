import { usePrivy } from '@privy-io/react-auth'

// List of admin wallet addresses
const ADMIN_ADDRESSES = [
  '0x6F7C23F9E5cF62E6Bf8f63d4Be94624F2B7C4D94'.toLowerCase() // Replace with actual admin addresses
]

export function useIsAdmin() {
  const { user, authenticated } = usePrivy()
  
  if (!authenticated || !user?.wallet?.address) return false
  
  return ADMIN_ADDRESSES.includes(user.wallet.address.toLowerCase())
} 