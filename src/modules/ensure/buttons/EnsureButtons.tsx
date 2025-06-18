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

// ✅ Now supports tokenbound context with proper integration
// Supports all token types: native, erc20, erc721, erc1155
// Uses createTokenboundActions from @/lib/tokenbound.ts
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
  initialBalance,
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
    
    // ERC1155 specific state
    erc1155Balance,
    usdcBalance,
    getUsdcOperationData,
    checkUsdcApproval,
    
    // Actions
    fetchAvailableTokens,
    fetchTokenBalance,
    resetModalState,
    handleAmountChange,
    handleTokenSelect,
    handleAccountSelect,
    handleSearchQueryChange,
    executeBuy,
    executeSend,
    executeBurn,
    executeSwap,
    
    // ERC1155 specific actions
    executeERC1155Buy,
    executeERC1155Burn
  } = useTokenOperations({
    context,
    contractAddress,
    tokenId,
    tokenSymbol,
    tokenName,
    tokenType,
    tbaAddress,
    variant,
    initialBalance,
    // ERC1155 specific props
    maxSupply,
    totalMinted,
    pricePerToken,
    primaryMintActive
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

    // Reset modal state and fetch fresh data
    resetModalState()
    
    // Fetch balances and tokens in parallel
    await Promise.all([
      fetchTokenBalance(), // This will call fetchERC1155Balances for specific context
      fetchAvailableTokens(type)
    ])
    
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
      <div className="flex flex-col items-center gap-2">
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

        {/* Balance display - now below the buttons */}
        {showBalance && (
          <div className="text-sm text-gray-400 text-center">
            balance: {context === 'specific' ? 
              erc1155Balance.formattedTokenBalance : 
              formatBalance(tokenBalance.toString(), tokenType || 'erc20')
            }
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
        availableTokens={availableTokens}
        isLoadingTokens={isLoadingTokens}
        tokenImages={tokenImages}
        estimatedOutput={estimatedOutput}
        isSimulating={isSimulating}
        onAmountChange={handleAmountChange}
        onTokenSelect={handleTokenSelect}
        onExecute={context === 'specific' ? executeERC1155Buy : executeBuy}
        selectedToken={selectedToken || undefined}
        amount={amount}
        formattedAmount={formattedAmount}
        amountError={amountError}
        isLoading={isLoading}
        // ERC1155 specific props
        pricePerToken={pricePerToken}
        usdcBalance={context === 'specific' ? erc1155Balance.usdcBalance : undefined}
        totalPrice={undefined} // Will be calculated in the modal based on local amount
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
        tokenBalance={context === 'specific' ? erc1155Balance.tokenBalance : tokenBalance}
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
        tokenBalance={context === 'specific' ? erc1155Balance.tokenBalance : tokenBalance}
        onExecute={context === 'specific' ? executeERC1155Burn : executeBurn}
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
