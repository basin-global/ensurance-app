'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { createPublicClient, http, createWalletClient, custom } from 'viem'
import { base } from 'viem/chains'
import SITUS_ABI from '@/abi/SitusOG.json'
import { TokenboundClient } from '@tokenbound/sdk'
import type { Address } from 'viem'

interface Group {
  group_name: string
  contract_address: string
}

interface AccountData {
  full_account_name: string
  token_id: number
  tba_address: string
  group_name: string
  is_agent: boolean
  description?: string
  pool_type?: string | null
  specific_asset_id?: number
}

interface AccountContextType {
  accountData: AccountData
  isOwner: boolean
  isDeployed: boolean
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
  const [isOwner, setIsOwner] = useState(false)
  const [isDeployed, setIsDeployed] = useState(false)
  
  useEffect(() => {
    async function checkStatus() {
      if (!user?.wallet?.address) return

      try {
        const client = createPublicClient({
          chain: base,
          transport: http()
        })

        // Get the contract address from the group name
        const factoryResponse = await fetch('/api/groups')
        const groups = (await factoryResponse.json()) as Group[]
        const group = groups.find(g => g.group_name === `.${accountData.group_name}`)
        
        if (!group?.contract_address) {
          console.warn('Group contract address not found')
          return
        }

        // Check ownership
        const owner = await client.readContract({
          address: group.contract_address as `0x${string}`,
          abi: SITUS_ABI,
          functionName: 'ownerOf',
          args: [BigInt(accountData.token_id)]
        }) as Address

        setIsOwner(owner.toLowerCase() === user.wallet.address.toLowerCase())

        // Check TBA deployment using Tokenbound SDK
        const tokenboundClient = new TokenboundClient({
          chainId: base.id,
          walletClient: createWalletClient({
            account: user.wallet.address as `0x${string}`,
            chain: base,
            transport: custom(window.ethereum)
          })
        })

        const deployed = await tokenboundClient.checkAccountDeployment({
          accountAddress: accountData.tba_address as `0x${string}`
        })

        setIsDeployed(deployed)
      } catch (error) {
        console.error('Error checking status:', error)
        setIsOwner(false)
        setIsDeployed(false)
      }
    }

    checkStatus()
  }, [user?.wallet?.address, accountData])

  const value = {
    accountData,
    isOwner,
    isDeployed
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