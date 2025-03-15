'use client'

import React, { useState } from 'react'
import { Ensure, EnsureVariant } from '@/modules/ensure'
import { useRouter } from 'next/navigation'

export default function EnsureTestPage() {
  const router = useRouter();
  const [activeVariant, setActiveVariant] = useState<EnsureVariant>('market');
  
  // List of available variants
  const variants: EnsureVariant[] = ['home', 'certificates', 'syndicates', 'market', 'custom'];
  
  // Variant display names
  const variantLabels: Record<EnsureVariant, string> = {
    'home': 'Home Page',
    'certificates': 'Certificates',
    'syndicates': 'Syndicates',
    'market': 'Market',
    'custom': 'Custom'
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Ensure Module Test</h1>
      
      {/* Variant selector */}
      <div className="mb-8">
        <label htmlFor="variant-selector" className="block text-sm font-medium mb-2">
          Select Variant
        </label>
        <div className="flex flex-wrap gap-2">
          {variants.map(variant => (
            <button
              key={variant}
              onClick={() => setActiveVariant(variant)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeVariant === variant
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary-dark text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              {variantLabels[variant]}
            </button>
          ))}
        </div>
      </div>
      
      {/* Custom configuration for the 'custom' variant */}
      {activeVariant === 'custom' && (
        <div className="mb-8 p-4 bg-primary-dark rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Custom Configuration</h2>
          <p className="text-gray-400 mb-4">
            This is a placeholder for custom configuration options. In a real implementation, 
            you would have checkboxes and controls here to customize the Ensure component.
          </p>
        </div>
      )}
      
      {/* Variant description */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">{variantLabels[activeVariant]}</h2>
        {activeVariant === 'home' && (
          <p className="text-gray-400">
            Shows a mix of groups, accounts, certificates, and pools - ideal for a dashboard or home page.
          </p>
        )}
        {activeVariant === 'certificates' && (
          <p className="text-gray-400">
            Shows only certificates in a grid layout - perfect for a certificates page.
          </p>
        )}
        {activeVariant === 'syndicates' && (
          <p className="text-gray-400">
            Shows only syndicates in a grid layout - ideal for a syndicates page.
          </p>
        )}
        {activeVariant === 'market' && (
          <p className="text-gray-400">
            Shows both general and specific certificates in a list layout - suitable for trading and transfers.
          </p>
        )}
        {activeVariant === 'custom' && (
          <p className="text-gray-400">
            A fully customizable configuration - you can specify exactly what to show and how.
          </p>
        )}
      </div>
      
      {/* The Ensure component with the selected variant */}
      <Ensure 
        variant={activeVariant}
        // For testing, we'll pass a wallet address to see some data
        walletAddress="0x1234567890123456789012345678901234567890"
      />
    </div>
  )
}
