'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as Tooltip from '@radix-ui/react-tooltip'

// Export tab components so pages can import what they need
export { default as PortfolioTab } from './portfolio'
export { default as ReputationTab } from './reputation'
export { default as PlaceTab } from './place'
export { default as ImpactTab } from './impact'

export interface TabData {
  value: string
  label: string
  component: React.ComponentType<any>
}

interface TabbedModulesProps {
  address: string
  isOwner: boolean
  initialModule?: string | null
  tabs: TabData[]
  label?: string
}

export default function TabbedModules({ 
  address, 
  isOwner = false,
  initialModule,
  tabs = [],
  label
}: TabbedModulesProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Validate tabs array
  if (!tabs || tabs.length === 0) {
    return (
      <div className="bg-[#111] rounded-xl p-4">
        <div className="text-gray-400">No tabs available</div>
      </div>
    )
  }

  // Initialize state from URL or defaults
  const defaultTab = initialModule || tabs[0]?.value
  const [activeTab, setActiveTab] = useState(searchParams.get('module') || defaultTab)
  const selectedChain = 'base'  // Hardcoded to base chain

  // Ensure activeTab is valid
  useEffect(() => {
    const isValidTab = tabs.some(tab => tab.value === activeTab)
    if (!isValidTab && tabs.length > 0) {
      setActiveTab(tabs[0].value)
    }
  }, [activeTab, tabs])

  const updateUrl = (tab: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    
    // Only update if values are different
    if (params.get('module') !== tab) {
      params.set('module', tab)
    }
    
    // Remove chain param if it exists
    params.delete('chain')

    // Use shallow routing to prevent full page reload
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    updateUrl(tab)
  }

  const getTabStyle = (tabValue: string) => {
    const isPortfolioTab = tabValue === 'portfolio'
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

  if (!address) {
    return (
      <div className="bg-[#111] rounded-xl p-4">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

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

        {/* Tabs */}
        <div className="flex items-center justify-between w-full px-0 md:px-4">
          <div className="flex items-center gap-0.5 md:gap-2 overflow-x-auto no-scrollbar py-2 px-1 md:px-0">
            {tabs.map((tab) => (
              <Tooltip.Provider key={tab.value}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      className={`px-1.5 md:px-4 py-1.5 md:py-2 rounded-t-lg transition-all duration-200 whitespace-nowrap text-xs md:text-base ${getTabStyle(tab.value)}`}
                      onClick={() => handleTabChange(tab.value)}
                    >
                      {tab.label}
                    </button>
                  </Tooltip.Trigger>
                </Tooltip.Root>
              </Tooltip.Provider>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 md:p-4 w-full">
        {activeTabData && address ? (
          <activeTabData.component
            key={`${activeTabData.value}-${selectedChain}`}
            address={address}
            selectedChain={selectedChain}
            isOwner={isOwner}
          />
        ) : (
          <div className="text-gray-400">Loading...</div>
        )}
      </div>
    </div>
  )
}
