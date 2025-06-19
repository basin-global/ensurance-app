'use client'

import React, { useState, useMemo } from 'react'
import { PlusCircle, RefreshCw, Flame, Send } from 'lucide-react'
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
import { useTokenData } from './hooks/useTokenData'
import { useOperations } from './hooks/useOperations'
import { formatBalance, getTooltipText } from './utils'

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
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [currentOperation, setCurrentOperation] = useState<Operation | null>(null)

  // Use new simplified hooks - only fetch balance for page variant
  const shouldFetchBalance = variant === 'page'
  const { 
    tokenBalance,
    fetchTokenBalance 
  } = useTokenData({
    context,
    contractAddress: (contractAddress.startsWith('0x') ? contractAddress : `0x${contractAddress}`) as `0x${string}`,
    tokenId,
    tokenType,
    tbaAddress: (tbaAddress as `0x${string}`) || undefined,
    skipBalance: !shouldFetchBalance
  })

  const {
    isLoading,
    isBurning,
    isSwapping,
    authenticated,
    executeSend,
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
        text: isERC1155 ? 'ensure' : 'buy'
      },
      swap: {
        available: variant !== 'buy-only' && !isERC1155 && showSwap,
        disabled: isSwapping || (variant === 'page' && !hasBalance),
        text: 'swap'
      },
      send: {
        available: variant !== 'buy-only' && showSend,
        disabled: isLoading || (variant === 'page' && !hasBalance),
        text: 'send'
      },
      burn: {
        available: variant !== 'buy-only' && showBurn,
        disabled: isBurning || (variant === 'page' && !hasBalance),
        text: 'burn'
      }
    }
  }, [tokenType, tokenBalance, isLoading, isSwapping, isBurning, variant, showSwap, showSend, showBurn])

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
                  <p>{getTooltipText('buy')}</p>
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
                    onClick={() => handleOpenModal('swap')}
                    className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={buttonConfig.swap.disabled}
                  >
                    <RefreshCw className={`${iconSize} stroke-[1.5] stroke-blue-500 hover:stroke-blue-400 transition-colors`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getTooltipText('swap')}</p>
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
                  <p>{getTooltipText('send')}</p>
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
                    onClick={() => handleOpenModal('burn')}
                    className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={buttonConfig.burn.disabled}
                  >
                    <Flame className={`${iconSize} stroke-[1.5] stroke-orange-500 hover:stroke-orange-400 transition-colors`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getTooltipText('burn')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Balance display - only show on page variant */}
        {variant === 'page' && (
          <div className="text-sm text-gray-400 text-center">
            balance: {tokenBalance ? formatBalance(tokenBalance, tokenType, 18) : '0'}
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
        contractAddress={(contractAddress.startsWith('0x') ? contractAddress : `0x${contractAddress}`) as `0x${string}`}
        tokenBalance={tokenBalance}
        availableTokens={[]}
        isLoadingTokens={false}
        tokenImages={{}}
        estimatedOutput="0"
        isSimulating={false}
        onTokenSelect={() => {}}
        onExecute={async () => {}}
        isLoading={isSwapping}
      />

      {/* Send Modal - Using existing interface */}
      <SendModal
        isOpen={modalOpen && currentOperation === 'send'}
        onClose={handleCloseModal}
        tokenSymbol={tokenSymbol}
        tokenName={tokenName}
        imageUrl={imageUrl}
        context={context}
        tokenType={tokenType}
        tokenBalance={tokenBalance}
        accountSearchQuery=""
        accountSearchResults={[]}
        isSearching={false}
        onSearchQueryChange={() => {}}
        selectedAccount={undefined}
        onAccountSelect={() => {}}
        recipientAddress=""
        onExecute={executeSend}
        isLoading={isLoading}
      />

      {/* Burn Modal - Using existing interface */}
      <BurnModal
        isOpen={modalOpen && currentOperation === 'burn'}
        onClose={handleCloseModal}
        tokenSymbol={tokenSymbol}
        tokenName={tokenName}
        imageUrl={imageUrl}
        context={context}
        tokenType={tokenType}
        tokenBalance={tokenBalance}
        onExecute={executeBurn}
        isLoading={isBurning}
      />
    </>
  )
}
