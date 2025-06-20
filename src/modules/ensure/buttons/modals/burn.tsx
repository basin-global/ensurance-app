'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Flame, ExternalLink } from 'lucide-react'
import type { ButtonContext, TokenType } from '../types'
import { handleAmountChange } from '../utils/input'
import { formatBalance } from '../utils/formatting'
import { useOperations } from '../hooks/useOperations'

interface BurnModalProps {
  isOpen: boolean
  onClose: () => void
  tokenSymbol: string
  tokenName?: string
  imageUrl?: string
  tokenType?: TokenType
  context: ButtonContext
  contractAddress: string
  tokenId?: string
  tbaAddress?: string
  pricePerToken?: bigint
  primaryMintActive?: boolean
  onRefreshBalance?: () => void
}

export function BurnModal({
  isOpen,
  onClose,
  tokenSymbol,
  tokenName,
  imageUrl = '/assets/no-image-found.png',
  tokenType = 'erc20',
  context,
  contractAddress,
  tokenId,
  tbaAddress,
  pricePerToken,
  primaryMintActive = false,
  onRefreshBalance
}: BurnModalProps) {
  const { authenticated, user, login } = usePrivy()
  
  // Token balance state
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))
  const [targetTokenDecimals, setTargetTokenDecimals] = useState<number>(18)
  
  // Create public client
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  })

  const {
    isBurning: isLoading,
    executeBurn
  } = useOperations({
    context,
    contractAddress,
    tokenId,
    tokenType,
    tbaAddress,
    pricePerToken,
    primaryMintActive
  })
  const [localAmount, setLocalAmount] = useState('')
  const [localFormattedAmount, setLocalFormattedAmount] = useState('')
  const [amountError, setAmountError] = useState('')

  // Helper function to get appropriate display name based on token type
  const getDisplayName = () => {
    if (tokenType === 'erc721' || tokenType === 'erc1155') {
      return tokenName || tokenSymbol
    }
    return tokenSymbol
  }

  // Fetch target token decimals using viem (like send.tsx and buy.tsx)
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

  // Handle amount input changes
  const handleInputChange = (value: string) => {
    const maxDecimals = tokenType === 'erc721' ? 0 : tokenType === 'erc1155' ? 0 : targetTokenDecimals
    const result = handleAmountChange(value, tokenType, maxDecimals)
    
    setLocalAmount(result.cleanValue)
    setLocalFormattedAmount(result.formattedValue)
    
    // Validate amount against balance
    if (result.cleanValue && tokenBalance) {
      try {
        let inputAmount: bigint
        let currentBalance = tokenBalance
        
        if (tokenType === 'erc721') {
          inputAmount = BigInt(1)
        } else if (tokenType === 'erc1155') {
          inputAmount = BigInt(Math.floor(Number(result.cleanValue)))
        } else {
          // For ERC20/native tokens, convert using actual decimals
          const numericValue = Number(result.cleanValue)
          const decimals = targetTokenDecimals || 18 // Fallback to 18 if not set yet
          
          // Check if we have valid numbers before BigInt conversion
          if (isNaN(numericValue) || isNaN(decimals)) {
            setAmountError('Invalid amount')
            return
          }
          
          const scaledAmount = numericValue * Math.pow(10, decimals)
          
          // Check if the scaled amount is a valid number
          if (isNaN(scaledAmount) || !isFinite(scaledAmount)) {
            setAmountError('Amount too large')
            return
          }
          
          inputAmount = BigInt(Math.floor(scaledAmount))
        }
        
        if (inputAmount > currentBalance) {
          setAmountError('Amount exceeds available balance')
        } else {
          setAmountError('')
        }
      } catch (error) {
        setAmountError('Invalid amount')
      }
    } else {
      setAmountError('')
    }
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

  // Reset form and load data when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalAmount('')
      setLocalFormattedAmount('')
      setAmountError('')
      
      if (authenticated) {
        fetchTokenBalance()
        fetchTargetTokenDecimals()
      }
    }
  }, [isOpen, authenticated])

  const handleExecute = async () => {
    if (!authenticated) {
      login()
      return
    }

    if (!localAmount && tokenType !== 'erc721') return
    
    const burnAmount = tokenType === 'erc721' ? '1' : localAmount
    
    try {
      await executeBurn(burnAmount)
      
      // Refresh balance and close modal
      onRefreshBalance?.()
      onClose()
    } catch (error) {
      console.error('Burn execution error:', error)
    }
  }

  const getDisplayAmount = () => {
    if (tokenType === 'erc721') return '1'
    return localFormattedAmount || '0'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-black/95 border border-gray-800 shadow-xl backdrop-blur-xl">
        <DialogHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <DialogTitle className="text-xl font-bold text-white">
                burn
              </DialogTitle>
              <div className="text-3xl font-bold text-white">
                {getDisplayName()}
              </div>
            </div>
            <div className="relative w-20 h-20 rounded-lg overflow-hidden">
              <Image
                src={imageUrl}
                alt={tokenSymbol}
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
                <div className="w-16 h-16 mx-auto bg-orange-500/10 rounded-full flex items-center justify-center">
                  <Flame className="w-8 h-8 text-orange-500" />
                </div>
                <div className="text-xl font-semibold text-white">
                  connect to burn
                </div>
              </div>
            </div>
          ) : tokenBalance === BigInt(0) ? (
            // Show guidance when no balance
            <div className="space-y-6 text-center">
              <div className="text-lg text-gray-300">
                buy to burn
              </div>
              <p className="text-sm text-gray-400">
                You need {getDisplayName()} tokens to burn them
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Amount Input (hide for ERC721) */}
              {tokenType !== 'erc721' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">
                    quantity to burn
                  </label>
                  <Input
                    type="text"
                    value={localFormattedAmount}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="enter amount"
                    className={`bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-500 h-12 text-lg font-medium ${
                      amountError ? 'border-red-500' : ''
                    }`}
                  />
                  {amountError && (
                    <div className="text-sm text-red-500">
                      {amountError}
                    </div>
                  )}
                  <div className="text-sm text-gray-400">
                    balance: {formatBalance(tokenBalance.toString(), tokenType, targetTokenDecimals)} {getDisplayName()}
                  </div>
                </div>
              )}

              {/* Burn Summary */}
              {(localAmount || tokenType === 'erc721') && (
                <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">You will burn:</span>
                    <span className="text-white">
                      {getDisplayAmount()} {getDisplayName()}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-400 flex items-start gap-2 mt-3 p-3 bg-orange-500/10 rounded border border-orange-500/20">
                    <Flame className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-orange-200 font-medium">Perpetual Funding</div>
                      <div className="text-orange-300/80 text-xs mt-1">
                        Burning permanently removes assets from circulation. 
                        This reduces total supply, making remaining assets more scarce and protecting their value.
                        {(context === 'specific' || (context === 'tokenbound' && tokenType === 'erc1155') || (context === 'operator' && tokenType === 'erc1155')) && (
                          <>
                            {' '}Burning in this context creates{' '}
                            <a 
                              href="https://ensurance.app/proceeds/0xa187F8CBdd36D63967c33f5BD4dD4B9ECA51270e" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"
                            >
                              ensurance proceeds
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </div>
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
            disabled={
              authenticated && (
                isLoading || 
                tokenBalance === BigInt(0) ||
                (tokenType !== 'erc721' && (!localAmount || Number(localAmount) <= 0)) ||
                !!amountError
              )
            }
            className="min-w-[120px] bg-orange-600 hover:bg-orange-500"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : authenticated ? (
              'BURN'
            ) : (
              'CONNECT'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
