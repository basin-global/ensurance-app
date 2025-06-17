import { Send } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { useState, useEffect } from 'react'
import { type Address, createPublicClient, http, formatEther, formatUnits, createWalletClient, custom } from 'viem'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from 'react-toastify'
import AccountImage from '@/modules/accounts/AccountImage'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { createTokenboundActions } from '@/lib/tokenbound'
import { base } from 'viem/chains'
import Image from 'next/image'
import { TokenboundClient } from '@tokenbound/sdk'
import { createTokenboundClient } from '@/config/tokenbound'

// ERC20 ABI for decimals and balance
const erc20Abi = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

interface AccountSearchResult {
  name: string
  path: string
  type: 'account'
  is_agent: boolean
  is_ensurance: boolean
  token_id: number
}

interface EnsureButtonsTokenboundProps {
  contractAddress: Address
  tokenId?: string // Optional for ERC20
  tokenType: 'erc20' | 'erc721' | 'erc1155' | 'native'
  size?: 'sm' | 'lg'
  variant?: 'grid' | 'list' | 'overview'
  balance?: string
  symbol?: string
  imageUrl?: string
  tbaAddress: Address
}

// Add helper function for truncating addresses
const truncateAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function EnsureButtonsTokenbound({ 
  contractAddress,
  tokenId,
  tokenType,
  size = 'sm',
  variant = 'grid',
  balance: initialBalance,
  symbol = 'Token',
  imageUrl = '/assets/no-image-found.png',
  tbaAddress
}: EnsureButtonsTokenboundProps) {
  const { login, authenticated, user } = usePrivy()
  const [isLoading, setIsLoading] = useState(false)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [formattedAmount, setFormattedAmount] = useState('')
  const [amountError, setAmountError] = useState('')
  const [sendRecipient, setSendRecipient] = useState('')
  const [accountSearchQuery, setAccountSearchQuery] = useState('')
  const [accountSearchResults, setAccountSearchResults] = useState<AccountSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountSearchResult | null>(null)
  const [tokenDecimals, setTokenDecimals] = useState<number>(18)
  const [balance, setBalance] = useState<string | undefined>(initialBalance)
  const [formattedBalance, setFormattedBalance] = useState<string>('')
  const debouncedAccountSearch = useDebounce(accountSearchQuery, 300)

  const iconSize = size === 'sm' ? 'w-6 h-6' : 'w-10 h-10'

  // Create a single publicClient instance
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  })

  // Format balance based on token type
  const formatBalance = (rawBalance: string | bigint, type: string, decimals?: number) => {
    if (type === 'erc721') {
      return '1'
    }
    
    if (type === 'erc1155') {
      return rawBalance.toString()
    }
    
    // For fungible tokens (ETH and ERC20)
    const formatted = type === 'native' 
      ? formatEther(BigInt(rawBalance))
      : formatUnits(BigInt(rawBalance), decimals || 18)
    
    const value = parseFloat(formatted)
    
    // For values >= 1, show full number with commas, no decimals
    if (value >= 1) {
      return Math.floor(value).toLocaleString('en-US')
    }
    
    // For small values, show more decimals to capture small amounts
    return value.toLocaleString('en-US', { 
      minimumSignificantDigits: 1,
      maximumSignificantDigits: 6
    })
  }

  // Update formatted balance when balance changes
  useEffect(() => {
    if (balance) {
      setFormattedBalance(formatBalance(balance, tokenType, tokenDecimals))
    }
  }, [balance, tokenType, tokenDecimals])

  // Fetch token details only when modal opens
  const fetchTokenDetails = async () => {
    if (!tbaAddress) return

    try {
      if (tokenType === 'native') {
        // For native ETH, use getBalance
        const balance = await publicClient.getBalance({
          address: tbaAddress
        })
        setBalance(balance.toString())
      } else if (contractAddress) {
        // For ERC20 tokens
        if (tokenType === 'erc20') {
          const decimals = await publicClient.readContract({
            address: contractAddress,
            abi: erc20Abi,
            functionName: 'decimals',
          })
          setTokenDecimals(Number(decimals))

          const balance = await publicClient.readContract({
            address: contractAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [tbaAddress],
          })
          setBalance(balance.toString())
        } else if (tokenType === 'erc1155') {
          // For ERC1155, we want to show the raw number
          const balance = await publicClient.readContract({
            address: contractAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [tbaAddress],
          })
          setBalance(balance.toString())
        } else {
          // For ERC721, we want to show 1 or 0
          const balance = await publicClient.readContract({
            address: contractAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [tbaAddress],
          })
          setBalance(balance.toString())
        }
      }
    } catch (error) {
      console.error('Error fetching token details:', error)
      // Keep default values if fetch fails
    }
  }

  // Add effect for account search
  useEffect(() => {
    const searchAccounts = async () => {
      if (!debouncedAccountSearch || debouncedAccountSearch.length < 2) {
        setAccountSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedAccountSearch)}`)
        if (!response.ok) throw new Error('Search failed')
        
        const data = await response.json()
        // Filter to only account results
        const accountResults = data.filter((item: any) => item.type === 'account')
        setAccountSearchResults(accountResults)
      } catch (error) {
        console.error('Error searching accounts:', error)
        setAccountSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    searchAccounts()
  }, [debouncedAccountSearch])

  // Add effect to fetch tba_address when account is selected
  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (!selectedAccount) return

      try {
        const response = await fetch(`/api/accounts/${encodeURIComponent(selectedAccount.name)}`)
        if (!response.ok) throw new Error('Failed to fetch account details')
        
        const data = await response.json()
        if (data.tba_address) {
          setSendRecipient(data.tba_address)
        }
      } catch (error) {
        console.error('Error fetching account details:', error)
        toast.error('Failed to fetch account details')
      }
    }

    fetchAccountDetails()
  }, [selectedAccount])

  const handleAmountChange = (value: string) => {
    // Remove existing commas first
    const withoutCommas = value.replace(/,/g, '')
    
    // Only allow numbers and one decimal point for ERC20
    const cleanValue = tokenType === 'erc20' 
      ? withoutCommas.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
      : withoutCommas.replace(/[^\d]/g, '') // Only whole numbers for ERC721/1155
    
    // Store the clean value for calculations
    setAmount(cleanValue)

    // Format with commas for display
    if (cleanValue) {
      const formattedValue = cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      setFormattedAmount(formattedValue)
    } else {
      setFormattedAmount('')
    }
  }

  const handleOpenModal = async (type: 'send') => {
    if (!authenticated) {
      login()
      return
    }

    // Reset states
    setAmount('')
    setFormattedAmount('')
    setAmountError('')
    setSendRecipient('')
    setAccountSearchQuery('')
    setAccountSearchResults([])
    setSelectedAccount(null)

    // Fetch latest balance when modal opens
    await fetchTokenDetails()
    
    setSendModalOpen(true)
  }

  const handleSend = async () => {
    if (!user || !sendRecipient) {
      toast.error('Please select a recipient')
      return
    }

    if (tokenType !== 'erc721' && !amount) {
      toast.error('Please enter an amount')
      return
    }

    setIsLoading(true)
    try {
      if (!user?.wallet?.address) {
        throw new Error("Please connect your wallet first");
      }

      // Create wallet client with Privy provider
      const walletClient = createWalletClient({
        account: user.wallet.address as `0x${string}`,
        chain: base,
        transport: custom(window.ethereum)
      })

      // Create TokenboundClient with standardized approach
      const tokenboundClient = createTokenboundClient(walletClient)

      if (!tbaAddress) {
        throw new Error("TBA address is required for transfers");
      }

      switch (tokenType) {
        case 'native':
          await tokenboundClient.transferETH({
            account: tbaAddress as `0x${string}`,
            amount: parseFloat(amount),
            recipientAddress: sendRecipient as `0x${string}`
          })
          break

        case 'erc20':
          await tokenboundClient.transferERC20({
            account: tbaAddress as `0x${string}`,
            amount: parseFloat(amount),
            recipientAddress: sendRecipient as `0x${string}`,
            erc20tokenAddress: contractAddress,
            erc20tokenDecimals: tokenDecimals
          })
          break

        case 'erc721':
          await tokenboundClient.transferNFT({
            account: tbaAddress as `0x${string}`,
            tokenType: 'ERC721',
            tokenContract: contractAddress as `0x${string}`,
            tokenId: tokenId!,
            recipientAddress: sendRecipient as `0x${string}`
          })
          break

        case 'erc1155':
          await tokenboundClient.transferNFT({
            account: tbaAddress as `0x${string}`,
            tokenType: 'ERC1155',
            tokenContract: contractAddress as `0x${string}`,
            tokenId: tokenId!,
            recipientAddress: sendRecipient as `0x${string}`,
            amount: parseInt(amount)
          })
          break
      }

      toast.success('Transfer successful!')
      setSendModalOpen(false)
    } catch (error) {
      console.error('Transfer error:', error)
      toast.error('Transfer failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Add validation at component level
  if (!tbaAddress) {
    console.error('EnsureButtonsTokenbound: tbaAddress is required')
    return null
  }

  return (
    <>
      <div className={cn(
        "flex gap-4",
        variant === 'list' ? "opacity-0 group-hover:opacity-100 transition-opacity" : ""
      )}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleOpenModal('send')}
                className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className={`${iconSize} stroke-[1.5] stroke-amber-500 hover:stroke-amber-400 transition-colors`} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>send</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Send Modal */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-bold text-white">
                  send
                </DialogTitle>
                <div className="text-3xl font-bold text-white">
                  {symbol}
                </div>
              </div>
              <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={symbol}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-6">
            {/* Account Search */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">
                recipient
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={accountSearchQuery}
                  onChange={(e) => {
                    setAccountSearchQuery(e.target.value)
                    setSelectedAccount(null)
                  }}
                  placeholder="Search for an account..."
                  className="w-full bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {accountSearchResults.length > 0 && !selectedAccount && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {accountSearchResults.map((result) => (
                      <button
                        key={result.name}
                        onClick={() => {
                          setSelectedAccount(result)
                          setAccountSearchQuery(result.name)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-800 transition-colors flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                          <AccountImage
                            tokenId={result.token_id}
                            groupName={result.name.split('.')[1]}
                            variant="circle"
                            className="w-6 h-6"
                          />
                        </div>
                        <span className="font-mono">{result.name}</span>
                        {result.is_agent && (
                          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                            agent
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedAccount && sendRecipient && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 space-y-1">
                    <div className="text-sm text-gray-400">
                      {selectedAccount.name}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {truncateAddress(sendRecipient)}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                    <AccountImage
                      tokenId={selectedAccount.token_id}
                      groupName={selectedAccount.name.split('.')[1]}
                      variant="circle"
                      className="w-8 h-8"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Amount Input (only for ERC20 and ERC1155) */}
            {tokenType !== 'erc721' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">
                  amount
                </label>
                <Input
                  type="text"
                  value={formattedAmount}
                  onChange={e => handleAmountChange(e.target.value)}
                  placeholder="enter amount"
                  className={`bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium ${amountError ? 'border-red-500' : ''}`}
                />
                {amountError && (
                  <div className="text-sm text-red-500">
                    {amountError}
                  </div>
                )}
                <div className="text-sm text-gray-400">
                  balance: {formattedBalance || '0'} {symbol}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
            <Button 
              variant="ghost" 
              onClick={() => setSendModalOpen(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isLoading || (!amount && tokenType !== 'erc721') || !sendRecipient}
              className="min-w-[120px] bg-amber-600 hover:bg-amber-500"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                'SEND'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 