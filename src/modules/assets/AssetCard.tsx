import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, PlusCircle } from "lucide-react"
import Link from 'next/link'
import Image from 'next/image'
import { isEnsuranceToken } from '@/modules/ensurance/config'
import { Asset, EnsureOperation } from '@/types'
import { Button } from "@/components/ui/button"
import { EnsureModal } from "@/modules/ensure/ensure-modal"
import { getFeaturedTokensForOG } from '@/modules/ensurance/featured-config';
import CustomAudioPlayer from '@/modules/media/CustomAudioPlayer';
import { EnsureMenuItems } from '@/modules/ensure/ensure-menu'
import { toast } from 'react-toastify'

interface AssetCardProps {
  asset: Asset;
  address: string;
  isEnsuranceTab?: boolean;
  isTokenbound: boolean;
  isOwner?: boolean;
  isFeatured?: boolean;
}

const FALLBACK_IMAGE = '/assets/no-image-found.png';

export default function AssetCard({ 
  asset, 
  address,
  isEnsuranceTab,
  isTokenbound,
  isOwner = false,
  isFeatured = false
}: AssetCardProps) {
  const [isEnsureModalOpen, setIsEnsureModalOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<EnsureOperation | null>(null);
  const isERC1155 = asset.contract?.type === 'ERC1155';
  const quantity = asset.queried_wallet_balances?.[0]?.quantity || 0;
  const hasBalance = quantity > 0;
  
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

  return (
    <div className="relative">
      <Link href={`/assets/${asset.chain}/${asset.contract_address}/${asset.token_id}`}>
        <Card className="overflow-hidden bg-primary-dark border-gray-800 transition-all duration-300 cursor-pointer h-full rounded-xl hover:shadow-lg">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="aspect-square relative bg-black rounded-xl">
              {hasBalance && quantity >= 1 && (
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
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Image 
                  src={asset.image_url || FALLBACK_IMAGE} 
                  alt={asset.name || 'NFT'} 
                  width={400}
                  height={400}
                  className="w-full h-full object-cover rounded-xl"
                  unoptimized={asset.image_url?.toLowerCase?.()?.endsWith('.gif') || false}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = FALLBACK_IMAGE;
                  }}
                />
              )}
            </div>

            <div className="px-4 py-2 flex justify-between items-center border-b border-gray-800">
              {isEnsurable ? (
                <Button
                  className="hover:bg-transparent p-0 bg-transparent text-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedOperation('ensure');
                    setIsEnsureModalOpen(true);
                  }}
                >
                  <PlusCircle className="h-6 w-6 text-gray-300 hover:text-white" />
                </Button>
              ) : (
                <div className="w-6" />
              )}

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
                    <EnsureMenuItems 
                      isTokenbound={isTokenbound}
                      onOperationSelect={(operation) => {
                        setSelectedOperation(operation);
                        setIsEnsureModalOpen(true);
                      }}
                      asset={{
                        chain: asset.chain,
                        contract_address: asset.contract_address,
                      }}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="p-4 flex-1">
              <h3 className="font-bold text-lg line-clamp-1 text-gray-100">{asset.name || 'Untitled'}</h3>
              <p className="text-sm text-gray-400 line-clamp-1">{asset.collection?.name}</p>
              <p className="text-xs text-gray-500">{formatChainName(asset.chain)}</p>
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
          </CardContent>
        </Card>
      </Link>

      <EnsureModal 
        asset={asset}
        address={address}
        isOpen={isEnsureModalOpen}
        onClose={() => {
          setIsEnsureModalOpen(false);
          setSelectedOperation(null);
        }}
        operation={selectedOperation || 'ensure'}
        isTokenbound={isTokenbound}
        onAction={async () => {
          throw new Error('Feature coming soon');
        }}
      />
    </div>
  );
}
