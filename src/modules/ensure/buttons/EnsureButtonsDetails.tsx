'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { PlusCircle, RefreshCw, Flame, Send } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'
import { BuyModal } from './modals/buy'
import { SwapModal } from './modals/swap'
import { SendModal } from './modals/send'
import { BurnModal } from './modals/burn'
import type { 
  ButtonContext, 
  Operation, 
  TokenType
} from './types'
import { useOperations } from './hooks/useOperations'
import { formatBalance, getTooltipText } from './utils'

// TODO: Re-enable swap functionality once implemented
const SWAP_ENABLED = true
const BURN_ENABLED = true

interface EnsureButtonsProps {
  tokenSymbol: string
  tokenName?: string
  imageUrl?: string
  contractAddress: string
  tokenId?: string
  context: ButtonContext
  tokenType?: TokenType
  tbaAddress?: string
  primaryMintActive?: boolean
  pricePerToken?: bigint
  className?: string
  variant?: 'buy-only' | 'portfolio' | 'page'
  showSwap?: boolean
  showSend?: boolean
  showBurn?: boolean
  onRefreshBalance?: () => void
}

export default function EnsureButtons({
  tokenSymbol,
  tokenName,
  imageUrl,
  contractAddress,
  tokenId,
  context,
  tokenType = 'erc20',
  tbaAddress,
  primaryMintActive = false,
  pricePerToken,
  className = '',
  variant = 'page',
  showSwap = true,
  showSend = true,
  showBurn = true,
  onRefreshBalance
}: EnsureButtonsProps) {
  const { authenticated, user } = usePrivy()
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [currentOperation, setCurrentOperation] = useState<Operation | null>(null)
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0))

  // Create public client
  const publicClient = useMemo(() => createPublicClient({
    chain: base,
    transport: http()
  }), [])

  // Simple token balance fetcher
  const fetchTokenBalance = useCallback(async () => {
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
      } else if ((tokenType as string) === 'erc20') {
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
  }, [context, contractAddress, tokenId, tokenType, tbaAddress, user?.wallet?.address, publicClient])

  // Fetch balance on mount and when user changes
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      fetchTokenBalance()
    }
  }, [authenticated, user?.wallet?.address, fetchTokenBalance])

  const {
    isLoading,
    isBurning,
    isSwapping,
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

  // Determine button availability based on variant
  const buttonConfig = useMemo(() => {
    const isERC1155 = (tokenType as string) === 'erc1155'
    const hasBalance = tokenBalance && tokenBalance > BigInt(0)
    
    return {
      buy: {
        available: true,
        disabled: isLoading,
        text: isERC1155 ? 'ensure' : 'buy',
        tooltip: getTooltipText('buy')
      },
      swap: {
        available: !isERC1155 && showSwap,
        disabled: !SWAP_ENABLED || isSwapping || !hasBalance,
        text: 'swap',
        tooltip: SWAP_ENABLED ? getTooltipText('swap') : 'coming soon'
      },
      send: {
        available: showSend,
        disabled: isLoading || !hasBalance,
        text: 'send',
        tooltip: getTooltipText('send')
      },
      burn: {
        available: showBurn,
        disabled: !BURN_ENABLED || isBurning || !hasBalance,
        text: 'burn',
        tooltip: BURN_ENABLED ? getTooltipText('burn') : 'coming soon'
      }
    }
  }, [tokenType, tokenBalance, isLoading, isSwapping, isBurning, showSwap, showSend, showBurn])

  const handleOpenModal = (operation: Operation) => {
    setCurrentOperation(operation)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setCurrentOperation(null)
  }

  const handleRefreshBalance = () => {
    fetchTokenBalance()
    onRefreshBalance?.()
  }

  // Don't render if not authenticated for tokenbound context
  if (context === 'tokenbound' && !authenticated) {
    return null
  }

  const iconSize = variant === 'page' ? 'w-10 h-10' : 'w-6 h-6'

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div className={cn(
          "flex gap-8",
          className
        )}>
          {/* Ensure (buy) button - green */}
          {buttonConfig.buy.available && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleOpenModal('buy')}
                    className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={buttonConfig.buy.disabled}
                  >
                    <PlusCircle className={`${iconSize} stroke-[1.5] stroke-green-500 hover:stroke-green-400 transition-colors`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{buttonConfig.buy.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Transform (swap) button - blue */}
          {buttonConfig.swap.available && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !buttonConfig.swap.disabled && handleOpenModal('swap')}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      buttonConfig.swap.disabled 
                        ? "text-gray-600 cursor-not-allowed opacity-50" 
                        : "text-gray-300 hover:text-gray-100"
                    )}
                    disabled={buttonConfig.swap.disabled}
                  >
                    <RefreshCw className={cn(
                      `${iconSize} stroke-[1.5] transition-colors`,
                      buttonConfig.swap.disabled 
                        ? "stroke-gray-600" 
                        : "stroke-blue-500 hover:stroke-blue-400"
                    )} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{buttonConfig.swap.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Send button - amber */}
          {buttonConfig.send.available && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleOpenModal('send')}
                    className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={buttonConfig.send.disabled}
                  >
                    <Send className={`${iconSize} stroke-[1.5] stroke-amber-500 hover:stroke-amber-400 transition-colors`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{buttonConfig.send.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Burn button - orange */}
          {buttonConfig.burn.available && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !buttonConfig.burn.disabled && handleOpenModal('burn')}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      buttonConfig.burn.disabled 
                        ? "text-gray-600 cursor-not-allowed opacity-50" 
                        : "text-gray-300 hover:text-gray-100"
                    )}
                    disabled={buttonConfig.burn.disabled}
                  >
                    <Flame className={cn(
                      `${iconSize} stroke-[1.5] transition-colors`,
                      buttonConfig.burn.disabled 
                        ? "stroke-gray-600" 
                        : "stroke-orange-500 hover:stroke-orange-400"
                    )} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{buttonConfig.burn.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Balance display - only show on page variant */}
        {variant === 'page' && (
          <div className="text-sm text-gray-400 text-center">
            balance: {!authenticated ? 'connect to see balance' : tokenBalance ? formatBalance(tokenBalance, tokenType, 18) : '0'}
          </div>
        )}
      </div>

      {/* Buy Modal */}
      <BuyModal
        isOpen={modalOpen && currentOperation === 'buy'}
        onClose={handleCloseModal}
        tokenSymbol={tokenSymbol}
        tokenName={tokenName}
        imageUrl={imageUrl}
        context={context}
        tokenType={tokenType}
        contractAddress={contractAddress}
        tokenId={tokenId}
        tbaAddress={tbaAddress}
        pricePerToken={pricePerToken}
        primaryMintActive={primaryMintActive}
        onRefreshBalance={handleRefreshBalance}
      />

      {/* Swap Modal */}
      <SwapModal
        isOpen={modalOpen && currentOperation === 'swap'}
        onClose={handleCloseModal}
        tokenSymbol={tokenSymbol}
        tokenName={tokenName}
        imageUrl={imageUrl}
        context={context}
        tokenType={tokenType}
        contractAddress={contractAddress}
        tokenId={tokenId}
        tbaAddress={tbaAddress}
        pricePerToken={pricePerToken}
        primaryMintActive={primaryMintActive}
        onRefreshBalance={handleRefreshBalance}
      />

      {/* Send Modal */}
      <SendModal
        isOpen={modalOpen && currentOperation === 'send'}
        onClose={handleCloseModal}
        tokenSymbol={tokenSymbol}
        tokenName={tokenName}
        imageUrl={imageUrl}
        context={context}
        tokenType={tokenType}
        contractAddress={contractAddress}
        tokenId={tokenId}
        tbaAddress={tbaAddress}
        onRefreshBalance={handleRefreshBalance}
      />

      {/* Burn Modal */}
      <BurnModal
        isOpen={modalOpen && currentOperation === 'burn'}
        onClose={handleCloseModal}
        tokenSymbol={tokenSymbol}
        tokenName={tokenName}
        imageUrl={imageUrl}
        context={context}
        tokenType={tokenType}
        contractAddress={contractAddress}
        tokenId={tokenId}
        tbaAddress={tbaAddress}
        pricePerToken={pricePerToken}
        primaryMintActive={primaryMintActive}
        onRefreshBalance={handleRefreshBalance}
      />
    </>
  )
}
