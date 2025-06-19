'use client'

import React, { useState } from 'react'
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
import { getTooltipText } from './utils'

interface EnsureButtonsProps {
  // Basic token info
  tokenSymbol: string
  tokenName?: string
  imageUrl?: string
  contractAddress: string
  tokenId?: string
  tokenType?: TokenType
  context: ButtonContext
  
  // Optional TBA info
  tbaAddress?: string
  pricePerToken?: bigint
  primaryMintActive?: boolean
  
  // Button visibility control
  showBuy?: boolean
  showSwap?: boolean
  showSend?: boolean
  showBurn?: boolean
  
  // Styling
  variant?: 'grid' | 'list' | 'portfolio'
  size?: 'sm' | 'md'
  className?: string
  
  // Callbacks
  onRefreshBalance?: () => void
}

export default function EnsureButtons({
  tokenSymbol,
  tokenName,
  imageUrl,
  contractAddress,
  tokenId,
  tokenType = 'erc20',
  context,
  tbaAddress,
  pricePerToken,
  primaryMintActive = false,
  showBuy = true,
  showSwap = true,
  showSend = true,
  showBurn = true,
  variant = 'grid',
  size = 'md',
  className = '',
  onRefreshBalance
}: EnsureButtonsProps) {
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [currentOperation, setCurrentOperation] = useState<Operation | null>(null)

  const handleOpenModal = (operation: Operation) => {
    setCurrentOperation(operation)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setCurrentOperation(null)
  }

  // Icon sizing based on size prop
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const buttonSize = size === 'sm' ? 'p-1.5' : 'p-2'

  // Determine button availability based on token type and context
  const buttonConfig = {
    buy: {
      available: showBuy,
      icon: PlusCircle,
      color: 'stroke-green-500 hover:stroke-green-400',
      tooltip: getTooltipText('buy')
    },
    swap: {
      available: showSwap && tokenType !== 'erc1155' && context !== 'specific',
      icon: RefreshCw,
      color: 'stroke-blue-500 hover:stroke-blue-400',
      tooltip: getTooltipText('swap')
    },
    send: {
      available: showSend,
      icon: Send,
      color: 'stroke-amber-500 hover:stroke-amber-400',
      tooltip: getTooltipText('send')
    },
    burn: {
      available: showBurn,
      icon: Flame,
      color: 'stroke-orange-500 hover:stroke-orange-400',
      tooltip: getTooltipText('burn')
    }
  }

  // Filter available buttons
  const availableButtons = Object.entries(buttonConfig).filter(([_, config]) => config.available)

  if (availableButtons.length === 0) {
    return null
  }

  return (
    <>
      <div className={cn(
        "flex items-center gap-1",
        variant === 'list' && "justify-end",
        className
      )}>
        {availableButtons.map(([operation, config]) => {
          const IconComponent = config.icon
          return (
            <TooltipProvider key={operation}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.nativeEvent.stopImmediatePropagation()
                      handleOpenModal(operation as Operation)
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                    }}
                    className={cn(
                      "rounded-md transition-colors",
                      "hover:bg-white/10 text-gray-300 hover:text-gray-100",
                      buttonSize
                    )}
                  >
                    <IconComponent className={cn(iconSize, config.color, "transition-colors")} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{config.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>

      {/* Only render modals when actually open to prevent unnecessary hook calls */}
      {modalOpen && currentOperation === 'buy' && (
        <BuyModal
          isOpen={true}
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
          onRefreshBalance={onRefreshBalance}
        />
      )}

      {modalOpen && currentOperation === 'swap' && (
        <SwapModal
          isOpen={true}
          onClose={handleCloseModal}
          tokenSymbol={tokenSymbol}
          tokenName={tokenName}
          imageUrl={imageUrl}
          context={context}
          tokenType={tokenType}
          contractAddress={(contractAddress.startsWith('0x') ? contractAddress : `0x${contractAddress}`) as `0x${string}`}
          tokenBalance={BigInt(0)} // Will be fetched in modal when needed
          availableTokens={[]}
          isLoadingTokens={false}
          tokenImages={{}}
          estimatedOutput="0"
          isSimulating={false}
          onTokenSelect={() => {}}
          onExecute={async () => {}}
          isLoading={false}
        />
      )}

      {modalOpen && currentOperation === 'send' && (
        <SendModal
          isOpen={true}
          onClose={handleCloseModal}
          tokenSymbol={tokenSymbol}
          tokenName={tokenName}
          imageUrl={imageUrl}
          context={context}
          tokenType={tokenType}
          tokenBalance={BigInt(0)} // Will be fetched in modal when needed
          accountSearchQuery=""
          accountSearchResults={[]}
          isSearching={false}
          onSearchQueryChange={() => {}}
          selectedAccount={undefined}
          onAccountSelect={() => {}}
          recipientAddress=""
          onExecute={async () => {}}
          isLoading={false}
        />
      )}

      {modalOpen && currentOperation === 'burn' && (
        <BurnModal
          isOpen={true}
          onClose={handleCloseModal}
          tokenSymbol={tokenSymbol}
          tokenName={tokenName}
          imageUrl={imageUrl}
          context={context}
          tokenType={tokenType}
          tokenBalance={BigInt(0)} // Will be fetched in modal when needed
          onExecute={async () => {}}
          isLoading={false}
        />
      )}
    </>
  )
}
