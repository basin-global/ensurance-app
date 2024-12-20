"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Asset, EnsureOperation } from "@/types"

// Define a base config type
interface OperationConfig {
  title: string;
  description: string;
  actionButton: string;
  comingSoonMessage: string;
  isDangerous?: boolean;
  isCaution?: boolean;
  cautionMessage?: string;
}

interface EnsureModalProps {
  asset: Asset;
  address: string;
  isOpen: boolean;
  onClose: () => void;
  operation: EnsureOperation;
  isTokenbound?: boolean;
  onAction: (params: any) => Promise<{ hash: string; isCrossChain?: boolean }>;
}

export function EnsureModal({ 
  asset, 
  address, 
  isOpen, 
  onClose, 
  operation,
  isTokenbound = true
}: EnsureModalProps) {
  console.log('Asset in modal:', asset);

  const operationConfig: Record<EnsureOperation, OperationConfig> = {
    ensure: {
      title: 'Ensure Asset',
      description: 'Mint a certificate of ensurance for this asset',
      actionButton: 'Ensure',
      comingSoonMessage: 'Ensurance minting coming soon'
    },
    send: {
      title: 'Send Asset',
      description: 'Transfer this asset to another address',
      actionButton: 'Send',
      comingSoonMessage: 'Send functionality coming soon'
    },
    convert: {
      title: 'Convert Asset',
      description: 'Convert this asset to another type',
      actionButton: 'Convert',
      comingSoonMessage: 'Convert functionality coming soon'
    },
    buy: {
      title: 'Buy Currency',
      description: asset?.description || 'Get this currency on an exchange',
      actionButton: 'Buy',
      comingSoonMessage: asset?.symbol === 'ETH' || asset?.symbol === 'USDC' || asset?.symbol === 'USDS' 
        ? 'Available on Coinbase'
        : 'Available on Uniswap'
    },
    sell: {
      title: 'Sell Asset',
      description: 'List this asset for sale',
      actionButton: 'Sell',
      comingSoonMessage: 'Sell functionality coming soon'
    },
    swap: {
      title: 'Swap Currency',
      description: 'Swap this currency for another',
      actionButton: 'Swap',
      comingSoonMessage: 'Swap functionality coming soon'
    },
    hide: {
      title: 'Hide Asset',
      description: 'Hide this asset from your view',
      actionButton: 'Hide',
      comingSoonMessage: 'Hide functionality coming soon',
      isCaution: true,
      cautionMessage: "Does this look like spam? Help us improve by reporting it."
    },
    burn: {
      title: 'Burn Asset',
      description: 'Permanently destroy this asset',
      actionButton: 'Burn',
      comingSoonMessage: 'Burn functionality coming soon',
      isDangerous: true
    },
    profile: {
      title: 'Account Settings',
      description: 'Manage your account profile and appearance',
      actionButton: 'Save Changes',
      comingSoonMessage: 'Profile management features coming soon'
    }
  };

  const currentConfig = operationConfig[operation];

  const handleClose = () => {
    onClose();
    // Reset pointer events
    setTimeout(() => {
      document.body.style.pointerEvents = 'auto';
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={`bg-gray-900 border border-gray-800 shadow-lg ${
          operation === 'profile' 
            ? 'max-w-2xl h-[90vh] my-8 flex flex-col'
            : 'max-w-md'
        }`}
        aria-describedby={`${operation}-description`}
      >
        <DialogHeader className="border-b border-gray-800 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-gray-100">
            {currentConfig.title}
          </DialogTitle>
          <p 
            className="text-sm text-gray-400 mt-1"
            id={`${operation}-description`}
          >
            {currentConfig.description}
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {/* Asset/Currency Preview */}
          <div className="py-4">
            <div className="flex items-center gap-4 bg-gray-800 p-4 rounded-lg">
              <div className="w-16 h-16 flex items-center justify-center bg-gray-700 rounded-lg">
                {operation === 'buy' ? (
                  <img 
                    src={asset.image_url} 
                    alt={asset.name || 'Currency'} 
                    className="object-cover w-full h-full rounded-lg"
                  />
                ) : asset?.symbol ? (
                  <span className="text-2xl font-bold text-gray-100">
                    {asset.symbol}
                  </span>
                ) : asset?.image_url ? (
                  <img 
                    src={asset.image_url} 
                    alt={asset.name || 'Asset'} 
                    className="object-cover w-full h-full rounded-lg"
                  />
                ) : (
                  <span className="text-xl text-gray-400">?</span>
                )}
              </div>
              <div>
                {asset?.name && (
                  <p className="text-sm text-gray-400">
                    {asset.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Caution Warning for Hide */}
          {currentConfig.isCaution && (
            <div className="my-4 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
              <h3 className="text-yellow-500 font-bold text-lg mb-2">⚠️ CAUTION</h3>
              <p className="text-yellow-400">
                {currentConfig.cautionMessage}
              </p>
            </div>
          )}

          {/* Danger Warning for Burn */}
          {currentConfig.isDangerous && (
            <div className="my-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
              <h3 className="text-red-500 font-bold text-lg mb-2">⚠️ DANGER!</h3>
              <p className="text-red-400">
                Burning an asset is permanent and irreversible. 
                This action cannot be undone.
              </p>
            </div>
          )}

          {/* Profile Management Section - Only show for profile operation */}
          {operation === 'profile' && (
            <div className="space-y-4">
              {/* Image Management */}
              <div className="border border-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-200">Account Image</h3>
                  {asset.image_url && (
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-sm bg-blue-600/30 text-blue-400 rounded hover:bg-blue-600/40 transition-colors">
                        Change
                      </button>
                      <button className="px-3 py-1 text-sm bg-red-600/30 text-red-400 rounded hover:bg-red-600/40 transition-colors">
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2 flex items-center justify-center">
                  <div className="w-24 h-24 relative rounded-lg overflow-hidden">
                    {asset.image_url ? (
                      <img 
                        src={asset.image_url}
                        alt="Account Image"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Image failed to load:', asset.image_url);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description Management */}
              <div className="border border-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-200">Description</h3>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm bg-blue-600/30 text-blue-400 rounded hover:bg-blue-600/40 transition-colors">
                      Edit
                    </button>
                    <button className="px-3 py-1 text-sm bg-red-600/30 text-red-400 rounded hover:bg-red-600/40 transition-colors">
                      Clear
                    </button>
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2">
                  <p className="text-sm text-gray-400">
                    {asset.description || 'No description set'}
                  </p>
                </div>
              </div>

              <div className="text-center text-sm text-amber-500 py-2">
                {currentConfig.comingSoonMessage}
              </div>
            </div>
          )}

          {/* Coming Soon Message */}
          <div className="py-6 text-center">
            <p className="text-lg text-amber-400 font-semibold">
              {currentConfig.comingSoonMessage}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-800 flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 