'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as Tooltip from '@radix-ui/react-tooltip'
import ChainDropdown from '@/modules/shared/ChainDropdown'

// Export tab components so pages can import what they need
export { default as AssetsTab } from './assets'
export { default as CurrencyTab } from './currency'
export { default as ReputationTab } from './reputation'
export { default as PlaceTab } from './place'
export { default as ImpactTab } from './impact'

export interface TabData {
  value: string
  label: string
  component: React.ComponentType<any>
  showChainDropdown: boolean
}

interface TabbedModulesProps {
  address: string
  isOwner: boolean
  initialModule?: string | null
  initialChain?: string | null
  tabs: TabData[]  // Just a simple array of tabs
  label?: string   // Optional label text (e.g. "PORTFOLIO", "IDENTITY")
}

export default function TabbedModules({ 
  address, 
  isOwner = false,
  initialModule,
  initialChain,
  tabs = [],  // Default to empty array
  label
}: TabbedModulesProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentModule = searchParams.get('module') || initialModule || tabs[0]?.value
  const currentChain = searchParams.get('chain') || initialChain || 'base'
  
  const [activeTab, setActiveTab] = useState(currentModule)
  const [selectedChain, setSelectedChain] = useState(currentChain)

  // Listen for URL changes
  useEffect(() => {
    const module = searchParams.get('module')
    const chain = searchParams.get('chain')
    
    if (module) setActiveTab(module)
    if (chain) setSelectedChain(chain)
  }, [searchParams])

  const updateUrl = (tab: string, chain: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('module', tab)
    
    const activeTab = tabs.find(t => t.value === tab)
    if (activeTab?.showChainDropdown && chain !== 'all') {
      url.searchParams.set('chain', chain)
    } else {
      url.searchParams.delete('chain')
    }

    router.replace(url.toString())
  }

  const setActiveTabAndUpdateUrl = (tab: string) => {
    setActiveTab(tab)
    updateUrl(tab, selectedChain)
  }

  const getTabStyle = (tabValue: string) => {
    const isPortfolioTab = tabValue === 'assets' || tabValue === 'currency'
    const isActive = activeTab === tabValue

    if (isPortfolioTab) {
      return isActive
        ? 'bg-gradient-to-r from-amber-600/90 to-yellow-500/40 text-white font-semibold shadow-sm'
        : 'text-gray-500 dark:text-gray-300 hover:bg-gradient-to-r hover:from-amber-600/80 hover:to-yellow-500/30 hover:text-white hover:font-semibold'
    }

    return isActive
      ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white font-semibold shadow-sm'
      : 'text-gray-500 dark:text-gray-300 hover:bg-black/20'
  }

  const activeTabData = tabs.find(tab => tab.value === activeTab)

  return (
    <div className="bg-[#111] rounded-xl p-4">
      <div className="flex flex-col border-b border-gray-700">
        {/* Optional Label */}
        {label && (
          <div className="px-2 md:px-4">
            <div className="flex flex-col items-start gap-1">
              <div className="text-xs font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600">
                {label}
              </div>
              <div className="w-[175px] h-[2px] bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 mb-1" />
            </div>
          </div>
        )}

        {/* Tabs and Chain Dropdown */}
        <div className="flex items-center justify-between w-full px-0 md:px-4">
          <div className="flex items-center gap-0.5 md:gap-2 overflow-x-auto no-scrollbar py-2 px-1 md:px-0">
            {tabs.map((tab) => (
              <Tooltip.Provider key={tab.value}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      className={`px-1.5 md:px-4 py-1.5 md:py-2 rounded-t-lg transition-all duration-200 whitespace-nowrap text-xs md:text-base ${getTabStyle(tab.value)}`}
                      onClick={() => setActiveTabAndUpdateUrl(tab.value)}
                    >
                      {tab.label}
                    </button>
                  </Tooltip.Trigger>
                </Tooltip.Root>
              </Tooltip.Provider>
            ))}
          </div>

          {activeTabData?.showChainDropdown && (
            <div className="flex-shrink-0">
              <ChainDropdown
                selectedChain={selectedChain}
                onChange={(chain) => {
                  setSelectedChain(chain)
                  updateUrl(activeTab, chain)
                }}
                className="px-1.5 md:px-4 py-1.5 md:py-2 rounded-t-lg transition-all duration-200 text-gray-300 hover:bg-black/20 text-xs md:text-base font-sans bg-transparent border-0"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-2 md:p-4 w-full">
        {activeTabData && (
          <activeTabData.component
            key={`${activeTabData.value}-${selectedChain}`}
            address={address}
            selectedChain={selectedChain}
            isOwner={isOwner}
          />
        )}
      </div>
    </div>
  )
}
