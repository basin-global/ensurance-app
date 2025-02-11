import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, PlusCircle } from "lucide-react"
import Link from 'next/link'
import Image from 'next/image'
import { isEnsuranceToken } from '@/modules/certificates/config/ensurance'
import { Asset, EnsureOperation } from '@/types'
import { toast } from 'react-toastify'

interface AssetCardProps {
  asset: Asset;
  address: string;
  isEnsuranceTab?: boolean;
  isTokenbound: boolean;
  isOwner?: boolean;
  isFeatured?: boolean;
  customUrl?: string;
  hideCollection?: boolean;
  hideChain?: boolean;
  hideName?: boolean;
  variant?: 'default' | 'home' | 'tend' | 'account-main' | 'exchange';
  onSelect?: (selected: boolean) => void;
  exchangeRate?: number;
  selectedQuantity?: number;
}

const FALLBACK_IMAGE = '/assets/no-image-found.png';

export default function AssetCard({ 
  asset, 
  address,
  isEnsuranceTab,
  isTokenbound,
  isOwner = false,
  isFeatured = false,
  customUrl,
  hideCollection = false,
  hideChain = false,
  hideName = false,
  variant = 'default',
  onSelect,
  exchangeRate,
  selectedQuantity = 0
}: AssetCardProps) {
  const [isEnsureModalOpen, setIsEnsureModalOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<EnsureOperation | null>(null);
  const isERC1155 = asset.contract?.type === 'ERC1155';
  const quantity = asset.queried_wallet_balances?.[0]?.quantity || 0;
  const hasBalance = quantity > 0;
  const [isSelected, setIsSelected] = useState(false);
  
  const isEnsured = isEnsuranceTab
    ? (asset.queried_wallet_balances || []).length > 0
    : isEnsuranceToken(asset.chain, asset.contract_address);

  const handleModalClose = () => {
    setIsEnsureModalOpen(false)
    setTimeout(() => {
      document.body.style.pointerEvents = 'auto'
    }, 0)
  }

  const formatChainName = (chain: string) => {
    return chain.charAt(0).toUpperCase() + chain.slice(1);
  };

  const showEnsureMenu = isOwner && (
    !isEnsuranceTab || 
    (isEnsuranceTab && hasBalance)
  );

  const handleOperationSelect = () => {
    toast.info('Feature coming soon!', {
      closeButton: false
    });
    setIsEnsureModalOpen(false);
  };

  const isEnsurable = isEnsuranceTab || isEnsuranceToken(asset.chain, asset.contract_address);

  const showCardContent = variant !== 'account-main';
  const showQuantityBadge = hasBalance && quantity >= 1 && variant !== 'account-main';
  const roundedStyle = variant === 'account-main' ? 'rounded-lg' : 'rounded-xl';
  const imageRoundedStyle = variant === 'account-main' ? 'rounded-lg' : '';
  const cardPadding = variant === 'home' ? 'p-6' : 'p-4';

  const handleCardClick = (e: React.MouseEvent) => {
    if (variant === 'exchange') {
      e.preventDefault();
      const newSelected = !isSelected;
      setIsSelected(newSelected);
      onSelect?.(newSelected);
    }
  };

  return (
    <div className="relative">
      {variant === 'exchange' ? (
        <Card 
          className={`overflow-hidden bg-primary-dark border-gray-800 transition-all duration-300 cursor-pointer h-full rounded-xl hover:shadow-lg ${
            isSelected ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={handleCardClick}
        >
          <CardContent className="p-0 h-full flex flex-col">
            <div className="relative w-full bg-black">
              <div className="absolute top-2 right-2 z-10">
                <div 
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/50 bg-black/50'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>

              {quantity > 0 && (
                <div className="absolute top-2 left-2 bg-black/80 text-white px-4 py-2 rounded-lg text-lg font-extrabold shadow-md backdrop-blur-sm z-10">
                  ×{quantity}
                </div>
              )}

              {asset.video_url ? (
                <video 
                  src={asset.video_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto object-contain"
                />
              ) : (
                <div className="relative w-full">
                  <div className="aspect-[1/1] relative">
                    <Image 
                      src={asset.image_url || FALLBACK_IMAGE} 
                      alt={asset.name || 'NFT'} 
                      fill
                      className="object-contain"
                      unoptimized={asset.image_url?.toLowerCase?.()?.endsWith('.gif') || false}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.src = FALLBACK_IMAGE;
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4">
              <h3 className="font-bold text-lg line-clamp-1 text-gray-100">
                {asset.name || 'Untitled'}
              </h3>
              {!hideChain && (
                <p className="text-xs text-gray-500">{formatChainName(asset.chain)}</p>
              )}
              {exchangeRate && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-400">Exchange Rate:</span>
                  <span className="ml-2 font-medium">${exchangeRate}</span>
                </div>
              )}
              {selectedQuantity > 0 && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-400">Selected:</span>
                  <span className="ml-2 font-medium">×{selectedQuantity}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Link href={customUrl || `/assets/${asset.chain}/${asset.contract_address}/${asset.token_id}`}>
          <Card className={`overflow-hidden bg-primary-dark border-gray-800 transition-all duration-300 cursor-pointer h-full ${roundedStyle} hover:shadow-lg`}>
            <CardContent className="p-0 h-full flex flex-col">
              <div className="relative w-full bg-black">
                {showQuantityBadge && (
                  <div className="absolute top-2 left-2 bg-black/80 text-white px-4 py-2 rounded-lg text-lg font-extrabold shadow-md backdrop-blur-sm z-10">
                    ×{quantity}
                  </div>
                )}
                {asset.video_url ? (
                  <video 
                    src={asset.video_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className={`w-full h-auto object-contain ${imageRoundedStyle}`}
                  />
                ) : (
                  <div className="relative w-full">
                    <div className="aspect-[1/1] relative">
                      <Image 
                        src={asset.image_url || FALLBACK_IMAGE} 
                        alt={asset.name || 'NFT'} 
                        fill
                        className={`object-contain ${imageRoundedStyle}`}
                        unoptimized={asset.image_url?.toLowerCase?.()?.endsWith('.gif') || false}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.src = FALLBACK_IMAGE;
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {showCardContent && (
                <>
                  <div className="px-4 py-2 flex justify-between items-center border-b border-gray-800">
                    <div className="w-6" />
                    {showEnsureMenu && (
                      <DropdownMenu>
                        <DropdownMenuTrigger 
                          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-800"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <MoreVertical className="h-5 w-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                          {/* EnsureMenuItems component removed */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className={cardPadding}>
                    {!hideName && (
                      <h3 className={`font-bold ${variant === 'home' ? 'text-xl' : 'text-lg'} ${hideCollection ? 'line-clamp-2' : 'line-clamp-1'} text-gray-100`}>
                        {asset.name || 'Untitled'}
                      </h3>
                    )}
                    {!hideCollection && (
                      <p className="text-sm text-gray-400 line-clamp-1">{asset.collection?.name}</p>
                    )}
                    {!hideChain && (
                      <p className="text-xs text-gray-500">{formatChainName(asset.chain)}</p>
                    )}
                    <div className="flex flex-col gap-2 mt-2">
                      {isEnsured && (
                        <span className="text-sm tracking-wider font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600">
                          ENSURED
                        </span>
                      )}
                      {isFeatured && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-emerald-500">
                            FEATURED
                          </span>
                          <div 
                            style={{ 
                              width: '8px', 
                              height: '8px', 
                              backgroundColor: '#10B981',
                              borderRadius: '50%',
                              display: 'inline-block',
                              marginLeft: '4px'
                            }}
                            title="Featured Asset"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  );
}
