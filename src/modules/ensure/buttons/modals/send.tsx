'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { usePrivy } from '@privy-io/react-auth'
import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'
import Image from 'next/image'
import { Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import AccountImage from '@/modules/accounts/AccountImage'
import type { ButtonContext, TokenType, AccountSearchResult } from '../types'
import { handleAmountChange, truncateAddress } from '../utils/input'
import { formatBalance, getTokenDecimals } from '../utils/formatting'
import { useOperations } from '../hooks/useOperations'

interface SendModalProps {
  isOpen: boolean
  onClose: () => void
  tokenSymbol: string
  tokenName?: string
  imageUrl?: string
  context: ButtonContext
  tokenType?: TokenType
  contractAddress: string
  tokenId?: string
  tbaAddress?: string
  onRefreshBalance?: () => void
}

export function SendModal({
  isOpen,
  onClose,
  tokenSymbol,
  tokenName,
  imageUrl = '/assets/no-image-found.png',
  context,
  tokenType = 'erc20',
  contractAddress,
  tokenId,
  tbaAddress,
  onRefreshBalance
}: SendModalProps) {
  const { authenticated, user, login } = usePrivy()
  
  // Modal state
  const [localAmount, setLocalAmount] = useState('')
  const [localFormattedAmount, setLocalFormattedAmount] = useState('')
  const [localAmountError, setLocalAmountError] = useState('')
  
  // Account search state
  const [accountSearchQuery, setAccountSearchQuery] = useState('')
  const [allAccounts, setAllAccounts] = useState<AccountSearchResult[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<AccountSearchResult[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountSearchResult | null>(null)
  const [recipientAddress, setRecipientAddress] = useState('')
  
  // Keyboard navigation state
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  // Token balance and decimals state
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))
  const [targetTokenDecimals, setTargetTokenDecimals] = useState<number>(18)
  
  // Debounce search query
  const debouncedSearchQuery = useDebounce(accountSearchQuery, 300)
  
  // Create public client
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  })

  const {
    isLoading,
    executeSend
  } = useOperations({
    context,
    contractAddress,
    tokenId,
    tokenType,
    tbaAddress,
    pricePerToken: undefined,
    primaryMintActive: false
  })

  // Fetch target token decimals using viem (like buy.tsx)
  const fetchTargetTokenDecimals = async () => {
    if ((tokenType as string) === 'erc1155') {
      setTargetTokenDecimals(0) // ERC1155 tokens don't have decimals
      return
    }

    if ((tokenType as string) === 'native') {
      setTargetTokenDecimals(18) // ETH has 18 decimals
      return
    }

    try {
      const decimals = await publicClient.readContract({
        address: contractAddress as Address,
        abi: [
          {
            inputs: [],
            name: 'decimals',
            outputs: [{ type: 'uint8' }],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'decimals'
      })
      setTargetTokenDecimals(Number(decimals))
    } catch (error) {
      console.error('Error fetching target token decimals:', error)
      setTargetTokenDecimals(18) // Default fallback
    }
  }

  // Fetch all accounts (like AccountsGrid does)
  const fetchAllAccounts = async () => {
    setIsLoadingAccounts(true)
    try {
      const response = await fetch('/api/accounts')
      if (!response.ok) throw new Error('Failed to fetch accounts')
      const accountsData = await response.json()
      
      // Transform to match AccountSearchResult interface
      const transformedAccounts: AccountSearchResult[] = accountsData.map((account: any) => ({
        full_account_name: account.full_account_name,
        token_id: account.token_id,
        is_agent: account.is_agent,
        group_name: account.group_name,
        tba_address: account.tba_address,
        name: account.full_account_name, // For display compatibility
        type: 'account' as const,
        path: `/${account.full_account_name}`
      }))

      // Add operator as special recipient if in tokenbound context
      const recipients: AccountSearchResult[] = []
      
      if (context === 'tokenbound' && user?.wallet?.address) {
        recipients.push({
          full_account_name: 'operator.wallet',
          token_id: 0,
          is_agent: false,
          group_name: 'system',
          tba_address: user.wallet.address, // Use wallet address directly
          name: 'OPERATOR (connected wallet)',
          type: 'operator' as const,
          path: '/operator'
        })
      }
      
      // Add all other accounts
      recipients.push(...transformedAccounts)
      
      setAllAccounts(recipients)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      setAllAccounts([])
    } finally {
      setIsLoadingAccounts(false)
    }
  }

  // Filter accounts based on search query
  const filterAccounts = (query: string) => {
    if (!query || query.length < 2) {
      setFilteredAccounts([])
      setSelectedIndex(-1)
      return
    }

    const searchLower = query.toLowerCase()
    const operatorTerms = ['me', 'my', 'wallet', 'operator', 'my wallet', 'owner']
    
    const filtered = allAccounts.filter(account => {
      // For operator account, check special search terms
      if (account.type === 'operator') {
        return operatorTerms.some(term => term.includes(searchLower)) ||
               searchLower.includes('operator') ||
               account.name?.toLowerCase().includes(searchLower)
      }
      
      // For regular accounts, search by name
      return account.full_account_name?.toLowerCase().includes(searchLower)
    })

    // Sort: operator first, then agents, then alphabetically
    const sorted = filtered.sort((a, b) => {
      // Operator always first
      if (a.type === 'operator' && b.type !== 'operator') return -1
      if (b.type === 'operator' && a.type !== 'operator') return 1
      
      // Then agents
      if (a.is_agent !== b.is_agent) return a.is_agent ? -1 : 1
      
      // Then alphabetically
      const nameA = a.name || a.full_account_name || ''
      const nameB = b.name || b.full_account_name || ''
      return nameA.localeCompare(nameB)
    })

    setFilteredAccounts(sorted)
    setSelectedIndex(-1) // Reset selection
  }

  // Fetch token balance
  const fetchTokenBalance = async () => {
    if (!user?.wallet?.address) return
    
    const addressToQuery = context === 'tokenbound' && tbaAddress ? tbaAddress : user.wallet.address

    try {
      if ((tokenType as string) === 'erc1155') {
        const balance = await publicClient.readContract({
          address: contractAddress as Address,
          abi: [
            {
              inputs: [
                { name: 'account', type: 'address' },
                { name: 'id', type: 'uint256' }
              ],
              name: 'balanceOf',
              outputs: [{ type: 'uint256' }],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'balanceOf',
          args: [addressToQuery as Address, BigInt(tokenId || '0')]
        })
        setTokenBalance(balance as bigint)
      } else if ((tokenType as string) === 'native') {
        const balance = await publicClient.getBalance({
          address: addressToQuery as Address
        })
        setTokenBalance(balance)
      } else if ((tokenType as string) === 'erc20' || (tokenType as string) === 'erc721') {
        const balance = await publicClient.readContract({
          address: contractAddress as Address,
          abi: [
            {
              inputs: [{ name: 'account', type: 'address' }],
              name: 'balanceOf',
              outputs: [{ type: 'uint256' }],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'balanceOf',
          args: [addressToQuery as Address]
        })
        setTokenBalance(balance as bigint)
      }
    } catch (error) {
      console.error('Error fetching token balance:', error)
      setTokenBalance(BigInt(0))
    }
  }

  // Helper functions
  const getDisplayName = () => {
    if (tokenType === 'erc1155') {
      return tokenName || 'Certificate'
    }
    if (tokenType === 'erc721') {
      return tokenName || tokenSymbol
    }
    return tokenSymbol
  }

  const getImageUrl = () => {
    return imageUrl
  }

  const isButtonDisabled = () => {
    if (isLoading || !recipientAddress) return true
    
    // For ERC721, no amount needed
    if (tokenType === 'erc721') {
      return false
    }
    
    // For other types, need valid amount
    if (!localAmount || Number(localAmount) <= 0) return true
    return !!localAmountError
  }

  // Handle amount input changes
  const handleInputChange = (value: string) => {
    // For ERC721, no amount input needed
    if (tokenType === 'erc721') {
      setLocalAmount('1')
      setLocalFormattedAmount('1')
      setLocalAmountError('')
      return
    }
    
    // For ERC1155, only allow whole numbers
    if ((tokenType as string) === 'erc1155') {
      const wholeNumberValue = value.replace(/[^\d]/g, '')
      setLocalAmount(wholeNumberValue)
      setLocalFormattedAmount(wholeNumberValue)
      
      // Validate against balance
      if (wholeNumberValue && tokenBalance) {
        const inputAmount = BigInt(Math.floor(Number(wholeNumberValue)))
        if (inputAmount > tokenBalance) {
          setLocalAmountError('Amount exceeds available balance')
        } else {
          setLocalAmountError('')
        }
      } else {
        setLocalAmountError('')
      }
      return
    }
    
    // For ERC20/native tokens, use actual decimals from token contract
    const maxDecimals = targetTokenDecimals
    const inputTokenType = tokenType === 'native' ? 'native' : 'erc20'
    const result = handleAmountChange(value, inputTokenType, maxDecimals)
    
    setLocalAmount(result.cleanValue)
    setLocalFormattedAmount(result.formattedValue)

    // Validate against balance using actual decimals
    if (result.cleanValue && tokenBalance) {
      const numericValue = Number(result.cleanValue)
      const decimals = targetTokenDecimals || 18 // Fallback to 18 if not set yet
      
      // Check if we have valid numbers before BigInt conversion
      if (isNaN(numericValue) || isNaN(decimals)) {
        setLocalAmountError('Invalid amount')
        return
      }
      
      const scaledAmount = numericValue * Math.pow(10, decimals)
      
      // Check if the scaled amount is a valid number
      if (isNaN(scaledAmount) || !isFinite(scaledAmount)) {
        setLocalAmountError('Amount too large')
        return
      }
      
      const inputAmount = BigInt(Math.floor(scaledAmount))
      
      if (inputAmount > tokenBalance) {
        setLocalAmountError('Amount exceeds available balance')
      } else {
        setLocalAmountError('')
      }
    } else {
      setLocalAmountError('')
    }
  }

  // Handle account selection
  const handleAccountSelect = (account: AccountSearchResult) => {
    setSelectedAccount(account)
    setAccountSearchQuery(account.name || account.full_account_name)
    setRecipientAddress(account.tba_address || '')
    setFilteredAccounts([]) // Hide dropdown
    setSelectedIndex(-1)
  }

  // Handle search query change
  const handleSearchQueryChange = (query: string) => {
    setAccountSearchQuery(query)
    if (selectedAccount) {
      setSelectedAccount(null) // Clear selection when typing
      setRecipientAddress('')
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredAccounts.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredAccounts.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredAccounts.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredAccounts.length) {
          handleAccountSelect(filteredAccounts[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setFilteredAccounts([])
        setSelectedIndex(-1)
        break
    }
  }

  // Reset and load data when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalAmount('')
      setLocalFormattedAmount('')
      setLocalAmountError('')
      setAccountSearchQuery('')
      setFilteredAccounts([])
      setSelectedAccount(null)
      setRecipientAddress('')
      setSelectedIndex(-1)
      
      // Always fetch target token decimals
      fetchTargetTokenDecimals()
      
      if (authenticated) {
        fetchTokenBalance()
        fetchAllAccounts()
      }
    }
  }, [isOpen, authenticated])

  // Filter accounts when search query changes
  useEffect(() => {
    filterAccounts(debouncedSearchQuery)
  }, [debouncedSearchQuery, allAccounts])

  const handleExecute = async () => {
    if (!authenticated) {
      login()
      return
    }

    if (!recipientAddress) return
    
    const sendAmount = tokenType === 'erc721' ? '1' : localAmount

    try {
      await executeSend(sendAmount, recipientAddress)
      
      // Refresh balance and close modal
      onRefreshBalance?.()
      onClose()
    } catch (error) {
      console.error('Send execution error:', error)
    }
  }

  const getDisplayAmount = () => {
    if (tokenType === 'erc721') return '1'
    return localFormattedAmount || '0'
  }

  const getAccountDisplayName = (account: AccountSearchResult) => {
    if (account.type === 'operator') {
      return account.name || 'My Wallet'
    }
    return account.full_account_name
  }

  const getAccountIcon = (account: AccountSearchResult) => {
    if (account.type === 'operator') {
      return (
        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="text-xs font-bold text-white">W</span>
        </div>
      )
    }
    
    return (
      <AccountImage
        tokenId={account.token_id}
        groupName={account.group_name?.replace('.', '')}
        variant="circle"
        className="w-6 h-6"
      />
    )
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={onClose}
      modal={true}
    >
      <DialogContent 
        className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl z-[9999] fixed"
        onClick={(e) => {
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        onKeyDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <DialogTitle className="text-xl font-bold text-white">
                send
              </DialogTitle>
              <div className="text-3xl font-bold text-white">
                {getDisplayName()}
              </div>
              {tokenName && tokenName !== tokenSymbol && tokenType !== 'erc1155' && (
                <div className="text-sm text-gray-400">
                  {tokenName}
                </div>
              )}
            </div>
            <div className="relative w-20 h-20 rounded-lg overflow-hidden">
              <Image
                src={getImageUrl()}
                alt={getDisplayName()}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {!authenticated ? (
            /* Not Connected - Show Connect Account */
            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center">
                  <Send className="w-8 h-8 text-amber-500" />
                </div>
                <div className="text-xl font-semibold text-white">
                  connect to send
                </div>
              </div>
            </div>
          ) : (
            /* Authenticated - Show Send Form */
            <div className="space-y-6">
              {/* Recipient Search */}
              <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">
              RECIPIENT
            </label>
            <div className="relative">
              <Input
                type="text"
                value={accountSearchQuery}
                onChange={(e) => handleSearchQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={context === 'tokenbound' ? "Search accounts or type 'my wallet'..." : "Search for an account..."}
                className="w-full bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium"
              />
              {isLoadingAccounts && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {filteredAccounts.length > 0 && !selectedAccount && (
                <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredAccounts.map((result, index) => (
                    <button
                      key={`${result.type}-${index}`}
                      onClick={() => handleAccountSelect(result)}
                      className={`w-full px-4 py-2 text-left transition-colors flex items-center gap-2 ${
                        index === selectedIndex 
                          ? 'bg-gray-700' 
                          : 'hover:bg-gray-800'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                        {getAccountIcon(result)}
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="font-mono">{getAccountDisplayName(result)}</span>
                        {result.type === 'operator' && (
                          <span className="text-xs text-blue-400">
                            your wallet address
                          </span>
                        )}
                        {result.is_agent && result.type !== 'operator' && (
                          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded w-fit">
                            agent
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedAccount && recipientAddress && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 space-y-1">
                  <div className="text-sm text-gray-400">
                    {getAccountDisplayName(selectedAccount)}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    {truncateAddress(recipientAddress)}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                  {selectedAccount.type === 'operator' ? (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">W</span>
                    </div>
                  ) : (
                    <AccountImage
                      tokenId={selectedAccount.token_id}
                      groupName={selectedAccount.group_name?.replace('.', '')}
                      variant="circle"
                      className="w-8 h-8"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Amount Input (hide for ERC721) */}
          {tokenType !== 'erc721' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                AMOUNT
              </label>
              <Input
                type="text"
                value={localFormattedAmount}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={tokenType === 'erc1155' ? 'enter amount' : `enter ${getDisplayName()} amount`}
                className={`bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium ${
                  localAmountError ? 'border-red-500' : ''
                }`}
              />
              {localAmountError && (
                <div className="text-sm text-red-500">
                  {localAmountError}
                </div>
              )}
                                <div className="text-sm text-gray-400">
                    Balance: {formatBalance(tokenBalance.toString(), tokenType, targetTokenDecimals)}{tokenType === 'erc1155' ? '' : ` ${getDisplayName()}`}
                  </div>
            </div>
          )}

          {/* Send Summary */}
          {(recipientAddress && (localAmount || tokenType === 'erc721')) && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                SEND SUMMARY
              </label>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                      <Image
                        src={getImageUrl()}
                        alt={getDisplayName()}
                        width={24}
                        height={24}
                        className="object-cover"
                      />
                    </div>
                    <span className="text-lg font-medium">
                      {getDisplayAmount()}
                    </span>
                  </div>
                  {tokenType !== 'erc1155' && (
                    <span className="text-gray-400">
                      {getDisplayName()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExecute}
            disabled={authenticated && isButtonDisabled()}
            className="min-w-[120px] bg-amber-600 hover:bg-amber-500"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : authenticated ? (
              'SEND'
            ) : (
              'CONNECT'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
