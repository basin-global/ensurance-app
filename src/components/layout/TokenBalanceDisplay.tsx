import { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import ZORA_1155_ABI from '@/abi/Zora1155proxy.json'

interface TokenBalanceDisplayProps {
  contractAddress: `0x${string}`
  tokenId: bigint
  tokenName?: string
}

export function TokenBalanceDisplay({ contractAddress, tokenId, tokenName }: TokenBalanceDisplayProps) {
  const { user, authenticated } = usePrivy()
  const [balance, setBalance] = useState<bigint>(BigInt(0))

  useEffect(() => {
    const fetchBalance = async () => {
      if (!authenticated || !user?.wallet?.address) return
      try {
        const publicClient = createPublicClient({
          chain: base,
          transport: http()
        })
        const bal = await publicClient.readContract({
          address: contractAddress,
          abi: ZORA_1155_ABI,
          functionName: 'balanceOf',
          args: [user.wallet.address, tokenId]
        }) as bigint
        setBalance(bal)
      } catch (e) {
        setBalance(BigInt(0))
      }
    }
    fetchBalance()
  }, [authenticated, user?.wallet?.address, contractAddress, tokenId])

  return (
    <div className="text-sm text-gray-400 text-center">
      balance: {balance.toString()}
      <div className="text-xs text-gray-500 font-mono mt-0.5">{tokenName || 'Certificate'}</div>
    </div>
  )
} 