'use client'

import { createContext, useContext, ReactNode } from 'react'
import { usePrivy } from '@privy-io/react-auth'

interface AccountData {
  full_account_name: string
  token_id: number
  tba_address: string
  og_name: string
  is_agent: boolean
  description?: string
  pool_type?: string | null
}

interface AccountContextType {
  accountData: AccountData
  isOwner: boolean
}

const AccountContext = createContext<AccountContextType | null>(null)

export function AccountProvider({ 
  children, 
  accountData 
}: { 
  children: ReactNode
  accountData: AccountData
}) {
  const { user } = usePrivy()
  
  // For now, we'll consider the user the owner if they're connected
  // Later we can add the actual token ownership check
  const isOwner = !!user?.wallet?.address

  const value = {
    accountData,
    isOwner
  }

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider')
  }
  return context
} 