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
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
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
  minterType: 'default' | 'allowlist' | 'custom' | 'unknown'
  minterAddress: `0x${string}`
  userAllowlisted?: boolean
  userHasMinted?: boolean
  error?: string
}

export function GroupCreateAccount({ groupName, contractAddress }: GroupCreateAccountProps) {
  const { authenticated, user, login } = usePrivy()
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
  const [validationError, setValidationError] = useState<string | null>(null)
  const [ethBalance, setEthBalance] = useState<bigint | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  const debouncedAccountName = useDebounce(accountName, 500)

  // Retry function with exponential backoff
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error | null = null
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        // If it's a rate limit error, wait and retry
        if (error instanceof Error && (error.message.includes('429') || error.message.includes('rate'))) {
          const delayMs = baseDelay * Math.pow(2, i) + Math.random() * 1000
          console.log(`Rate limit hit, retrying in ${delayMs}ms...`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
          continue
        }
        
        // For other errors, don't retry
        throw error
      }
    }
    
    throw lastError || new Error('Maximum retries exceeded')
  }

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

  // Fetch contract info with minter type detection
  useEffect(() => {
    const fetchContractInfo = async () => {
      try {
        const { createPublicClient, http } = await import('viem')
        
        // Use Alchemy transport with fallback
        const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
        const publicClient = createPublicClient({
          chain: base,
          transport: http(alchemyApiKey 
            ? `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
            : 'https://mainnet.base.org'
          )
        })

        // First get basic contract info with retry logic
        const [buyingEnabled, price, minterAddress] = await Promise.all([
          retryWithBackoff(() => publicClient.readContract({
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
          })),
          retryWithBackoff(() => publicClient.readContract({
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
          })),
          retryWithBackoff(() => publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: [
              {
                inputs: [],
                name: 'minter',
                outputs: [{ type: 'address' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'minter'
          }))
        ])

        const minterAddr = minterAddress as `0x${string}`
        let minterType: 'default' | 'allowlist' | 'custom' | 'unknown' = 'unknown'
        let userAllowlisted = false
        let userHasMinted = false
        let finalBuyingEnabled = buyingEnabled as boolean

        // Determine minter type
        if (minterAddr === '0x0000000000000000000000000000000000000000') {
          minterType = 'default'
        } else {
          console.log(`Checking minter type for ${groupName}, minter address: ${minterAddr}`)
          // Check if it's an allowlist minter by reading the allowlist mapping (exists in both V1 and V2)
          try {
            // Try to read allowlist mapping to confirm it's an allowlist minter
            await retryWithBackoff(() => publicClient.readContract({
              address: minterAddr as `0x${string}`,
              abi: [
                {
                  inputs: [{ name: '', type: 'address' }],
                  name: 'allowlist',
                  outputs: [{ type: 'bool' }],
                  stateMutability: 'view',
                  type: 'function'
                }
              ],
              functionName: 'allowlist',
              args: ['0x0000000000000000000000000000000000000000'] // dummy address to test
            }))

            console.log(`✅ ${groupName}: Detected as allowlist minter (has allowlist mapping)`)
            // If we get here, it's an allowlist minter
            minterType = 'allowlist'
            finalBuyingEnabled = false // Will be set to true only if user is allowlisted and hasn't minted

            // Check user's allowlist status if authenticated
            if (authenticated && user?.wallet?.address) {
              const userAddress = user.wallet.address as `0x${string}`
              const [allowlisted, hasMinted] = await Promise.all([
                retryWithBackoff(() => publicClient.readContract({
                  address: minterAddr as `0x${string}`,
                  abi: [
                    {
                      inputs: [{ name: '', type: 'address' }],
                      name: 'allowlist',
                      outputs: [{ type: 'bool' }],
                      stateMutability: 'view',
                      type: 'function'
                    }
                  ],
                  functionName: 'allowlist',
                  args: [userAddress]
                })),
                retryWithBackoff(() => publicClient.readContract({
                  address: minterAddr as `0x${string}`,
                  abi: [
                    {
                      inputs: [{ name: '', type: 'address' }],
                      name: 'hasMinted',
                      outputs: [{ type: 'bool' }],
                      stateMutability: 'view',
                      type: 'function'
                    }
                  ],
                  functionName: 'hasMinted',
                  args: [userAddress]
                }))
              ])

              userAllowlisted = allowlisted as boolean
              userHasMinted = hasMinted as boolean
              
              // Enable buying only if user is allowlisted and hasn't minted
              finalBuyingEnabled = userAllowlisted && !userHasMinted
            }
          } catch (error) {
            console.log(`❌ ${groupName}: Failed allowlist detection, error:`, error)
            console.log(`Setting as custom minter type`)
            // If allowlist functions fail, it's a custom minter
            minterType = 'custom'
            finalBuyingEnabled = false
          }
        }

        setContractInfo({
          buyingEnabled: finalBuyingEnabled,
          price: price as bigint,
          minterType,
          minterAddress,
          userAllowlisted,
          userHasMinted
        })
      } catch (error) {
        console.error('Error fetching contract info:', error)
        setContractInfo({
          buyingEnabled: false,
          price: BigInt(0),
          minterType: 'unknown',
          minterAddress: '0x0000000000000000000000000000000000000000' as `0x${string}`,
          error: 'Failed to load contract information'
        })
      } finally {
        setIsLoadingContract(false)
      }
    }

    if (contractAddress) {
      fetchContractInfo()
    }
  }, [contractAddress, authenticated, user?.wallet?.address])

  // Fetch ETH balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!authenticated || !user?.wallet?.address) {
        setEthBalance(null)
        return
      }

      setIsLoadingBalance(true)
      try {
        const { createPublicClient, http } = await import('viem')
        
        // Use Alchemy transport with fallback
        const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
        const publicClient = createPublicClient({
          chain: base,
          transport: http(alchemyApiKey 
            ? `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
            : 'https://mainnet.base.org'
          )
        })

        const balance = await retryWithBackoff(() => 
          publicClient.getBalance({
            address: user.wallet!.address as `0x${string}`
          })
        )

        setEthBalance(balance)
      } catch (error) {
        console.error('Error fetching ETH balance:', error)
        setEthBalance(null)
      } finally {
        setIsLoadingBalance(false)
      }
    }

    fetchBalance()
  }, [authenticated, user?.wallet?.address])

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
          setNameCheckResult({
            available: false,
            accountName: debouncedAccountName,
            groupName,
            fullAccountName: `${debouncedAccountName}.${groupName}`
          })
        }
      } catch (error) {
        console.error('Error checking name availability:', error)
        setNameCheckResult({
          available: false,
          accountName: debouncedAccountName,
          groupName,
          fullAccountName: `${debouncedAccountName}.${groupName}`
        })
      } finally {
        setIsCheckingName(false)
      }
    }

    checkNameAvailability()
  }, [debouncedAccountName, groupName])

  const handleMint = async () => {
    if (!authenticated || !wallets.length || !nameCheckResult?.available || !contractInfo) return

    setIsMinting(true)
    const pendingToast = toast.loading('Preparing transaction...')

    try {
      const activeWallet = wallets[0]
      const { createPublicClient, http } = await import('viem')
      
      // Use Alchemy transport with fallback
      const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      const publicClient = createPublicClient({
        chain: base,
        transport: http(alchemyApiKey 
          ? `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
          : 'https://mainnet.base.org'
        )
      })

      const provider = await activeWallet.getEthereumProvider()
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(provider)
      })

      // Double-check name availability on contract
      const existingDomain = await retryWithBackoff(() => publicClient.readContract({
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
      }))

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

      let hash: `0x${string}`

      if (contractInfo.minterType === 'allowlist') {
        // Use allowlist minter contract
        hash = await walletClient.writeContract({
          address: contractInfo.minterAddress as `0x${string}`,
          abi: [
            {
              inputs: [
                { name: '_domainName', type: 'string' },
                { name: '_domainHolder', type: 'address' },
                { name: '_referrer', type: 'address' }
              ],
              name: 'mint',
              outputs: [{ type: 'uint256' }],
              stateMutability: 'nonpayable',
              type: 'function'
            }
          ],
          functionName: 'mint',
          args: [
            accountName,
            activeWallet.address as `0x${string}`,
            '0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e' as `0x${string}`
          ],
          account: activeWallet.address as `0x${string}`
        })
      } else {
        // Use default minting (direct from contract)
        hash = await walletClient.writeContract({
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
      }

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

  // Render mint success state
  if (mintSuccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="mb-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-mono text-white mb-4">
            congratulations!
          </h2>
          <p className="text-lg text-gray-400 mb-6">
            your account <span className="text-white font-mono">{newAccountName}</span> has been created successfully.
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

  // Render loading state
  if (isLoadingContract) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 font-mono">loading contract information...</p>
      </div>
    )
  }

  // Render error state
  if (contractInfo?.error || !contractInfo) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-mono text-white mb-4">
          error loading contract
        </h2>
        <p className="text-gray-400">
          {contractInfo?.error || 'failed to load contract information'}
        </p>
      </div>
    )
  }

  // Render different disabled states based on minter type
  if (!contractInfo.buyingEnabled) {
    if (contractInfo.minterType === 'allowlist') {
      if (!authenticated) {
        return (
          <div className="max-w-2xl mx-auto text-center py-12">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-mono text-white mb-4">
              connect to check eligibility
            </h2>
            <p className="text-gray-400 mb-6">
              this group uses allowlist for account creation. <button 
                onClick={() => login()}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                connect
              </button> to check if you're eligible.
            </p>
            <p className="text-sm text-gray-500">
              group: <span className="text-white font-mono">.{groupName}</span>
            </p>
          </div>
        )
      }

      if (contractInfo.userHasMinted) {
        return (
          <div className="max-w-2xl mx-auto text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-mono text-white mb-4">
              you've already created an account
            </h2>
            <p className="text-gray-400 mb-6">
              each address can only create one account in this allowlist group.
            </p>
            <Link
              href={`/groups/${groupName}/mine`}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-mono px-6 py-3 rounded-lg transition-colors mb-4"
            >
              see your accounts
            </Link>
            <p className="text-sm text-gray-500">
              group: <span className="text-white font-mono">.{groupName}</span>
            </p>
          </div>
        )
      }

      if (!contractInfo.userAllowlisted) {
        return (
          <div className="max-w-2xl mx-auto text-center py-12">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-mono text-white mb-4">
              not eligible for allowlist minting
            </h2>
            <p className="text-gray-400 mb-6">
              your address is not on the allowlist for this group.
            </p>
            <p className="text-sm text-gray-500">
              group: <span className="text-white font-mono">.{groupName}</span>
            </p>
          </div>
        )
      }
    } else if (contractInfo.minterType === 'custom') {
      return (
        <div className="max-w-2xl mx-auto text-center py-12">
          <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-mono text-white mb-4">
            custom minting not supported
          </h2>
          <p className="text-gray-400 mb-6">
            this group uses a custom minting contract that is not currently supported.
          </p>
          <p className="text-sm text-gray-500">
            group: <span className="text-white font-mono">.{groupName}</span>
          </p>
        </div>
      )
    } else {
      return (
        <div className="max-w-2xl mx-auto text-center py-12">
          <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-mono text-white mb-4">
            account creation is currently inactive
          </h2>
          <p className="text-gray-400 mb-6">
            please contact the group admin to enable account creation.
          </p>
          <p className="text-sm text-gray-500">
            group: <span className="text-white font-mono">.{groupName}</span>
          </p>
        </div>
      )
    }
  }

  const ethAmount = parseFloat(formatEther(contractInfo.price)).toFixed(4)
  const usdAmount = ethPrice ? (parseFloat(ethAmount) * ethPrice).toFixed(2) : null
  const hasInsufficientBalance = contractInfo.minterType === 'default' && authenticated && ethBalance !== null && ethBalance < contractInfo.price

  // Domain name validation function that matches contract requirements
  const validateDomainName = (input: string): { value: string; error: string | null } => {
    // Check for dots and spaces (contract will reject these)
    const hasDots = input.includes('.')
    const hasSpaces = input.includes(' ')
    
    if (hasDots || hasSpaces) {
      const issues = []
      if (hasDots) issues.push('dots')
      if (hasSpaces) issues.push('spaces')
      return { value: accountName, error: `${issues.join(' and ')} are not allowed` }
    }
    
    // Convert to lowercase - works for most Unicode characters
    let cleaned = input.toLowerCase()
    
    // Enforce length limit (contract default is 140 characters)
    if (cleaned.length > 140) {
      cleaned = cleaned.substring(0, 140)
    }
    
    return { value: cleaned, error: null }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="space-y-6">
        {/* Streamlined Header */}
        <div className="text-center mb-8">
          <p className="text-gray-400 mb-4">
            choose your agent account name for <span className="text-white font-mono">.{groupName}</span>
          </p>
          {contractInfo.minterType === 'allowlist' && (
            <p className="text-sm text-green-400">
              ✓ you're eligible for allowlist minting
            </p>
          )}
        </div>

        {/* Account Name Input - Focal Point */}
        <div className="space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center">
              <div className="relative flex items-baseline">
                <Input
                  type="text"
                  value={accountName}
                  onChange={(e) => {
                    const result = validateDomainName(e.target.value)
                    setAccountName(result.value)
                    setValidationError(result.error)
                  }}
                  placeholder="yourname"
                  className="bg-transparent border-none text-4xl font-mono text-white placeholder:text-gray-600 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none text-right pr-0"
                  style={{ width: `${Math.max(accountName.length || 12, 12)}ch` }}
                  disabled={isMinting}
                />
                <span className="text-4xl font-mono text-gray-400">.{groupName}</span>
              </div>
            </div>
            <div className="mt-2 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="flex items-center justify-center space-x-2 text-sm">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-400 font-mono">{validationError}</span>
            </div>
          )}

          {/* Name Availability Check */}
          {accountName && !validationError && (
            <div className="flex items-center justify-center space-x-2 text-sm">
              {isCheckingName ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-gray-400 font-mono">checking availability...</span>
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

          {/* Pricing Info */}
          {contractInfo.minterType === 'default' && (
            <div className="flex justify-center">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 w-80">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 font-mono">price:</span>
                  <div className="text-right">
                    <div className="text-white font-mono">{ethAmount} ETH</div>
                    {usdAmount && (
                      <div className="text-sm text-gray-400">${usdAmount} USD</div>
                    )}
                  </div>
                </div>
                
                {/* Balance Display */}
                {authenticated && (
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
                    <span className="text-gray-400 font-mono">your balance:</span>
                    <div className="text-right">
                      {isLoadingBalance ? (
                        <div className="text-gray-400 font-mono">loading...</div>
                      ) : ethBalance !== null ? (
                        <div className={`font-mono ${hasInsufficientBalance ? 'text-red-400' : 'text-white'}`}>
                          {parseFloat(formatEther(ethBalance)).toFixed(4)} ETH
                        </div>
                      ) : (
                        <div className="text-gray-400 font-mono">unable to load</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Allowlist Minting Info */}
          {contractInfo.minterType === 'allowlist' && (
            <div className="flex justify-center">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 w-80">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-400 font-mono">allowlist minting</span>
                </div>
                <p className="text-sm text-gray-300 text-center">
                  you're eligible for free allowlist minting. no payment required.
                </p>
              </div>
            </div>
          )}

          {/* Create Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleMint}
              disabled={!authenticated || !nameCheckResult?.available || isMinting || hasInsufficientBalance}
              className="bg-blue-600 hover:bg-blue-700 text-white font-mono px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  creating account...
                </>
              ) : hasInsufficientBalance ? (
                'insufficient balance'
              ) : (
                'create agent account'
              )}
            </Button>
          </div>

          {/* Connection Prompt */}
          {!authenticated && (
            <p className="text-center text-sm text-gray-400">
              please connect to create an account
            </p>
          )}

          {/* Sales Points */}
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="text-center space-y-3">
              <h3 className="text-lg font-mono text-white">full onchain agent with three modes</h3>
              <div className="flex justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-gray-300">own forever</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-gray-300">ai trading</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-gray-300">funds nature</span>
                </div>
              </div>
              <a 
                href="#learn-more" 
                className="text-blue-400 hover:text-blue-300 text-sm underline font-mono"
              >
                unsure? learn more about agent accounts
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 