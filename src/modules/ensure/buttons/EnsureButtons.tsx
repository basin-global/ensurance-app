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

// TODO: Re-enable swap and burn functionality once implemented
const SWAP_ENABLED = false
const BURN_ENABLED = false

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
  
  // New props for muted state
  muted?: boolean
  mutedTooltip?: string
  
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
  muted = false,
  mutedTooltip = 'Actions not available',
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
      tooltip: getTooltipText('buy'),
      disabled: false
    },
    swap: {
      available: showSwap && tokenType !== 'erc1155' && context !== 'specific' && SWAP_ENABLED,
      icon: RefreshCw,
      color: SWAP_ENABLED ? 'stroke-blue-500 hover:stroke-blue-400' : 'stroke-gray-600',
      tooltip: SWAP_ENABLED ? getTooltipText('swap') : 'coming soon',
      disabled: !SWAP_ENABLED
    },
    send: {
      available: showSend,
      icon: Send,
      color: 'stroke-amber-500 hover:stroke-amber-400',
      tooltip: getTooltipText('send'),
      disabled: false
    },
    burn: {
      available: showBurn && BURN_ENABLED,
      icon: Flame,
      color: BURN_ENABLED ? 'stroke-orange-500 hover:stroke-orange-400' : 'stroke-gray-600',
      tooltip: BURN_ENABLED ? getTooltipText('burn') : 'coming soon',
      disabled: !BURN_ENABLED
    }
  }

  // Filter available buttons (including disabled ones for "coming soon" display)
  const visibleButtons = Object.entries(buttonConfig).filter(([key, config]) => {
    if (key === 'swap') {
      return showSwap && tokenType !== 'erc1155' && context !== 'specific'
    }
    if (key === 'burn') {
      return showBurn
    }
    return config.available
  })

  if (visibleButtons.length === 0) {
    return null
  }

  // If muted, wrap all buttons in a single tooltip
  if (muted) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1",
              variant === 'list' && "justify-end",
              className
            )}>
              {visibleButtons.map(([operation, config]) => {
                const IconComponent = config.icon
                const isDisabled = config.disabled || muted
                const tooltipText = muted ? mutedTooltip : config.tooltip
                
                return (
                  <button
                    key={operation}
                    disabled={isDisabled}
                    className={cn(
                      "rounded-md transition-colors cursor-not-allowed",
                      "text-gray-600",
                      buttonSize
                    )}
                  >
                    <IconComponent className={cn(iconSize, "stroke-gray-600", "transition-colors")} />
                  </button>
                )
              })}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{mutedTooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <>
      <div className={cn(
        "flex items-center gap-1",
        variant === 'list' && "justify-end",
        className
      )}>
        {visibleButtons.map(([operation, config]) => {
          const IconComponent = config.icon
          const isDisabled = config.disabled || muted
          const tooltipText = muted ? mutedTooltip : config.tooltip
          
          return (
            <TooltipProvider key={operation}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      if (isDisabled) return
                      e.preventDefault()
                      e.stopPropagation()
                      e.nativeEvent.stopImmediatePropagation()
                      handleOpenModal(operation as Operation)
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                    }}
                    disabled={isDisabled}
                    className={cn(
                      "rounded-md transition-colors",
                      isDisabled 
                        ? "cursor-not-allowed text-gray-600" 
                        : "hover:bg-white/10 text-gray-300 hover:text-gray-100",
                      buttonSize
                    )}
                  >
                    <IconComponent className={cn(iconSize, config.color, "transition-colors")} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltipText}</p>
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
          contractAddress={contractAddress}
          tokenId={tokenId}
          tbaAddress={tbaAddress}
          onRefreshBalance={onRefreshBalance}
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
