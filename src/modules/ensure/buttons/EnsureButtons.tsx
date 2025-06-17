'use client'

import { PlusCircle, RefreshCw, Flame, Send } from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'
import type { EnsureButtonsProps, OperationType } from './types'
import { useTokenOperations } from './hooks/useTokenOperations'
import { formatBalance } from './utils/formatting'
import { BuyModal } from './modals/buy'
import { SendModal } from './modals/send'
import { BurnModal } from './modals/burn'
import { SwapModal } from './modals/swap'
import { simpleErrorToast } from './utils/notifications'

export function EnsureButtons({ 
  contractAddress,
  tokenId,
  tokenType = 'erc20',
  showMinus = true,
  showBurn = false,
  showSend = true,
  size = 'lg',
  variant = 'grid',
  imageUrl = '/assets/no-image-found.png',
  showBalance = true,
  tokenName,
  tokenSymbol = 'Token',
  context,
  tbaAddress,
  isOwner,
  isDeployed,
  maxSupply,
  totalMinted,
  pricePerToken,
  primaryMintActive = false
}: EnsureButtonsProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [currentOperation, setCurrentOperation] = useState<OperationType | null>(null)

  const {
    tokenBalance,
    login,
    authenticated,
    userAddress,
    
    // Token data
    availableTokens,
    isLoadingTokens,
    tokenImages,
    
    // Quote data
    estimatedOutput,
    isSimulating,
    
    // Account search state
    accountSearchResults,
    isSearching,
    accountSearchQuery,
    
    // Buy modal state
    selectedToken,
    amount,
    formattedAmount,
    amountError,
    isLoading,
    
    // Send modal state  
    selectedAccount,
    recipientAddress,
    
    // Loading states
    isBurning,
    isSwapping,
    
    // Actions
    fetchAvailableTokens,
    resetModalState,
    handleAmountChange,
    handleTokenSelect,
    handleAccountSelect,
    handleSearchQueryChange,
    executeBuy,
    executeSend,
    executeBurn,
    executeSwap
  } = useTokenOperations({
    context,
    contractAddress,
    tokenId,
    tokenSymbol,
    tokenName,
    tbaAddress,
    variant
  })

  const iconSize = size === 'sm' ? 'w-6 h-6' : 'w-10 h-10'

  const handleOpenModal = async (type: OperationType) => {
    if (!authenticated) {
      login()
      return
    }

    // For specific context, check if primary mint is active for buy operations
    if (context === 'specific' && type === 'buy' && !primaryMintActive) {
      simpleErrorToast('This policy is no longer issuing certificates')
      return
    }

    // For tokenbound context, check ownership and deployment
    if (context === 'tokenbound' && (!isOwner || !isDeployed)) {
      return // Don't show buttons if not owner or not deployed
    }

    // Reset modal state and fetch tokens for the operation
    resetModalState()
    await fetchAvailableTokens(type)
    
    setCurrentOperation(type)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setCurrentOperation(null)
    resetModalState()
  }

  // For tokenbound context, only show buttons if owner AND deployed
  if (context === 'tokenbound' && (!isOwner || !isDeployed)) {
    return null
  }

  return (
    <>
      <div className={cn(
        "flex gap-8",
        variant === 'list' ? "opacity-0 group-hover:opacity-100 transition-opacity" : ""
      )}>
        {/* Ensure (buy) button - green */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleOpenModal('buy')}
                className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={context === 'specific' && !primaryMintActive}
              >
                <PlusCircle className={`${iconSize} stroke-[1.5] stroke-green-500 hover:stroke-green-400 transition-colors`} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>ensure (buy)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Transform (swap) button - blue */}
        {showMinus && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleOpenModal('swap')}
                  className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`${iconSize} stroke-[1.5] stroke-blue-500 hover:stroke-blue-400 transition-colors`} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>transform (swap)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Send button - amber */}
        {showSend && (
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
        )}

        {/* Burn button - orange */}
        {showBurn && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleOpenModal('burn')}
                  className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Flame className={`${iconSize} stroke-[1.5] stroke-orange-500 hover:stroke-orange-400 transition-colors`} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>burn</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Balance display */}
      {showBalance && (
        <div className="mt-2 text-sm text-gray-400 text-center">
          balance: {formatBalance(tokenBalance.toString(), tokenType || 'erc20')}
        </div>
      )}

      {/* Buy Modal */}
      <BuyModal
        isOpen={modalOpen && currentOperation === 'buy'}
        onClose={handleCloseModal}
        tokenSymbol={tokenSymbol}
        tokenName={tokenName}
        imageUrl={imageUrl}
        context={context}
        availableTokens={availableTokens}
        isLoadingTokens={isLoadingTokens}
        tokenImages={tokenImages}
        estimatedOutput={estimatedOutput}
        isSimulating={isSimulating}
        onAmountChange={handleAmountChange}
        onTokenSelect={handleTokenSelect}
        onExecute={executeBuy}
        selectedToken={selectedToken || undefined}
        amount={amount}
        formattedAmount={formattedAmount}
        amountError={amountError}
        isLoading={isLoading}
      />

      {/* Send Modal */}
      <SendModal
        isOpen={modalOpen && currentOperation === 'send'}
        onClose={handleCloseModal}
        tokenSymbol={tokenSymbol}
        tokenName={tokenName}
        imageUrl={imageUrl}
        tokenType={tokenType}
        context={context}
        tokenBalance={tokenBalance}
        accountSearchQuery={accountSearchQuery}
        accountSearchResults={accountSearchResults}
        isSearching={isSearching}
        onSearchQueryChange={handleSearchQueryChange}
        onExecute={executeSend}
        isLoading={isLoading}
        selectedAccount={selectedAccount || undefined}
        onAccountSelect={handleAccountSelect}
        recipientAddress={recipientAddress}
      />

      {/* Burn Modal */}
      <BurnModal
        isOpen={modalOpen && currentOperation === 'burn'}
        onClose={handleCloseModal}
        tokenSymbol={tokenSymbol}
        tokenName={tokenName}
        imageUrl={imageUrl}
        tokenType={tokenType}
        context={context}
        tokenBalance={tokenBalance}
        onExecute={executeBurn}
        isLoading={isBurning}
      />

      {/* Swap Modal */}
      <SwapModal
        isOpen={modalOpen && currentOperation === 'swap'}
        onClose={handleCloseModal}
        tokenSymbol={tokenSymbol}
        tokenName={tokenName}
        imageUrl={imageUrl}
        tokenType={tokenType}
        context={context}
        contractAddress={contractAddress}
        tokenBalance={tokenBalance}
        availableTokens={availableTokens}
        isLoadingTokens={isLoadingTokens}
        tokenImages={tokenImages}
        estimatedOutput={estimatedOutput}
        isSimulating={isSimulating}
        onTokenSelect={handleTokenSelect}
        onExecute={executeSwap}
        selectedToken={selectedToken || undefined}
        isLoading={isSwapping}
      />
    </>
  )
}
