'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth'
import { createWalletClient, custom, formatEther, parseEther } from 'viem'
import { base } from 'viem/chains'
import { toast } from 'react-toastify'
import { useDebounce } from '@/hooks/useDebounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface GroupCreateAccountProps {
  groupName: string
  contractAddress: string
}

interface NameCheckResult {
  available: boolean
  accountName: string
  groupName: string
  fullAccountName: string
}

interface GroupContractInfo {
  buyingEnabled: boolean
  price: bigint
  error?: string
}

export function GroupCreateAccount({ groupName, contractAddress }: GroupCreateAccountProps) {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [accountName, setAccountName] = useState('')
  const [nameCheckResult, setNameCheckResult] = useState<NameCheckResult | null>(null)
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [contractInfo, setContractInfo] = useState<GroupContractInfo | null>(null)
  const [isLoadingContract, setIsLoadingContract] = useState(true)
  const [isMinting, setIsMinting] = useState(false)
  const [ethPrice, setEthPrice] = useState<number | null>(null)
  const [mintSuccess, setMintSuccess] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')

  const debouncedAccountName = useDebounce(accountName, 500)

  // Fetch ETH price
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('/api/eth-price')
        if (response.ok) {
          const data = await response.json()
          setEthPrice(data.price)
        }
      } catch (error) {
        console.error('Error fetching ETH price:', error)
      }
    }
    fetchEthPrice()
  }, [])

  // Fetch contract info
  useEffect(() => {
    const fetchContractInfo = async () => {
      try {
        const { createPublicClient, http } = await import('viem')
        const publicClient = createPublicClient({
          chain: base,
          transport: http()
        })

        const [buyingEnabled, price] = await Promise.all([
          publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: [
              {
                inputs: [],
                name: 'buyingEnabled',
                outputs: [{ type: 'bool' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'buyingEnabled'
          }),
          publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: [
              {
                inputs: [],
                name: 'price',
                outputs: [{ type: 'uint256' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'price'
          })
        ])

        setContractInfo({
          buyingEnabled: buyingEnabled as boolean,
          price: price as bigint
        })
      } catch (error) {
        console.error('Error fetching contract info:', error)
        setContractInfo({
          buyingEnabled: false,
          price: BigInt(0),
          error: 'Failed to load contract information'
        })
      } finally {
        setIsLoadingContract(false)
      }
    }

    if (contractAddress) {
      fetchContractInfo()
    }
  }, [contractAddress])

  // Check name availability
  useEffect(() => {
    const checkNameAvailability = async () => {
      if (!debouncedAccountName.trim()) {
        setNameCheckResult(null)
        return
      }

      // Basic validation
      if (debouncedAccountName.length < 2) {
        setNameCheckResult({
          available: false,
          accountName: debouncedAccountName,
          groupName,
          fullAccountName: `${debouncedAccountName}.${groupName}`
        })
        return
      }

      setIsCheckingName(true)
      try {
        const response = await fetch('/api/accounts/check-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountName: debouncedAccountName,
            groupName
          })
        })

        if (response.ok) {
          const result = await response.json()
          setNameCheckResult(result)
        } else {
          console.error('Error checking name availability')
        }
      } catch (error) {
        console.error('Error checking name availability:', error)
      } finally {
        setIsCheckingName(false)
      }
    }

    checkNameAvailability()
  }, [debouncedAccountName, groupName])

  const handleMint = async () => {
    const activeWallet = wallets[0]
    if (!authenticated || !activeWallet?.address || !contractInfo || !nameCheckResult?.available) {
      toast.error('Please connect your wallet and ensure name is available')
      return
    }

    setIsMinting(true)
    const pendingToast = toast.loading('Creating account...')

    try {
      const provider = await activeWallet.getEthereumProvider()
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(provider)
      })

      // Check if name is still available on-chain
      const { createPublicClient, http } = await import('viem')
      const publicClient = createPublicClient({
        chain: base,
        transport: http()
      })

      const existingDomain = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: [
          {
            inputs: [{ name: '', type: 'string' }],
            name: 'domains',
            outputs: [
              { name: 'name', type: 'string' },
              { name: 'tokenId', type: 'uint256' },
              { name: 'holder', type: 'address' },
              { name: 'data', type: 'string' }
            ],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'domains',
        args: [accountName]
      })

      // If holder is not zero address, name is taken
      if (existingDomain[2] !== '0x0000000000000000000000000000000000000000') {
        toast.update(pendingToast, {
          render: 'Name is no longer available',
          type: 'error',
          isLoading: false,
          autoClose: 5000
        })
        return
      }

      toast.update(pendingToast, {
        render: 'Confirming transaction...',
        type: 'info',
        isLoading: true
      })

      // Mint the account
      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: [
          {
            inputs: [
              { name: '_domainName', type: 'string' },
              { name: '_domainHolder', type: 'address' },
              { name: '_referrer', type: 'address' }
            ],
            name: 'mint',
            outputs: [{ type: 'uint256' }],
            stateMutability: 'payable',
            type: 'function'
          }
        ],
        functionName: 'mint',
                 args: [
           accountName,
           activeWallet.address as `0x${string}`,
           '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e' as `0x${string}`
         ],
         value: contractInfo.price,
         account: activeWallet.address as `0x${string}`
      })

      await publicClient.waitForTransactionReceipt({ hash })

      toast.update(pendingToast, {
        render: 'Account created successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 5000
      })

      // Update database
      try {
        await fetch('/api/admin/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'accounts',
            group_name: `.${groupName}`
          })
        })
      } catch (syncError) {
        console.error('Error syncing account to database:', syncError)
      }

      setMintSuccess(true)
      setNewAccountName(`${accountName}.${groupName}`)
    } catch (error) {
      console.error('Error minting account:', error)
      toast.update(pendingToast, {
        render: error instanceof Error ? error.message : 'Failed to create account',
        type: 'error',
        isLoading: false,
        autoClose: 5000
      })
    } finally {
      setIsMinting(false)
    }
  }

  if (mintSuccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="mb-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-mono text-white mb-4">
            congratulations!
          </h2>
          <p className="text-lg text-gray-400 mb-6">
            Your account <span className="text-white font-mono">{newAccountName}</span> has been created successfully.
          </p>
          <Link
            href={`/${newAccountName}`}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-mono px-6 py-3 rounded-lg transition-colors"
          >
            manage your agent
          </Link>
        </div>
      </div>
    )
  }

  if (isLoadingContract) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 font-mono">Loading contract information...</p>
      </div>
    )
  }

  if (contractInfo?.error || !contractInfo) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-mono text-white mb-4">
          Error loading contract
        </h2>
        <p className="text-gray-400">
          {contractInfo?.error || 'Failed to load contract information'}
        </p>
      </div>
    )
  }

  if (!contractInfo.buyingEnabled) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-mono text-white mb-4">
          Account creation is currently inactive
        </h2>
        <p className="text-gray-400 mb-6">
          Please contact the group admin to enable account creation.
        </p>
        <p className="text-sm text-gray-500">
          Group: <span className="text-white font-mono">.{groupName}</span>
        </p>
      </div>
    )
  }

  const ethAmount = formatEther(contractInfo.price)
  const usdAmount = ethPrice ? (parseFloat(ethAmount) * ethPrice).toFixed(2) : null

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-mono text-white mb-2">
            create agent account
          </h2>
          <p className="text-gray-400">
            Choose your account name for <span className="text-white font-mono">.{groupName}</span>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-mono text-gray-300 mb-2">
              Account Name
            </label>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                placeholder="yourname"
                className="flex-1 bg-gray-800 border-gray-700 text-white font-mono"
                disabled={isMinting}
              />
              <span className="text-gray-400 font-mono">.{groupName}</span>
            </div>
          </div>

          {accountName && (
            <div className="flex items-center space-x-2 text-sm">
              {isCheckingName ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-gray-400 font-mono">Checking availability...</span>
                </>
              ) : nameCheckResult ? (
                nameCheckResult.available ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-400 font-mono">
                      {nameCheckResult.fullAccountName} is available
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-400 font-mono">
                      {nameCheckResult.fullAccountName} is not available
                    </span>
                  </>
                )
              ) : null}
            </div>
          )}

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 font-mono">Price:</span>
              <div className="text-right">
                <div className="text-white font-mono">{ethAmount} ETH</div>
                {usdAmount && (
                  <div className="text-sm text-gray-400">${usdAmount} USD</div>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={handleMint}
            disabled={!authenticated || !nameCheckResult?.available || isMinting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono py-3"
          >
            {isMinting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              'Create Agent Account'
            )}
          </Button>

          {!authenticated && (
            <p className="text-center text-sm text-gray-400">
              Please connect your wallet to create an account
            </p>
          )}
        </div>
      </div>
    </div>
  )
} 