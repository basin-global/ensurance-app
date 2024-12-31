'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Tooltip from '@radix-ui/react-tooltip'
import ChainDropdown from './ChainDropdown'

// Import modules
import AssetsModule from '@/modules/assets'
import CurrencyModule from '@/modules/currency'
import ReputationModule from '@/modules/reputation'

interface TabData {
  value: string
  label: string
  component: any
  showChainDropdown: boolean
}

interface TabGroup {
  label: string
  tabs: TabData[]
}

const tabGroups: TabGroup[] = [
  {
    label: 'PORTFOLIO',
    tabs: [
      { value: 'assets', label: 'assets', component: AssetsModule, showChainDropdown: true },
      { value: 'currency', label: 'currency', component: CurrencyModule, showChainDropdown: true },
    ]
  }
]

const standardTabs: TabData[] = [
  { value: 'reputation', label: 'reputation', component: ReputationModule, showChainDropdown: false }
]

const tabData: TabData[] = [...tabGroups[0].tabs, ...standardTabs]

interface TabbedModulesProps {
  address: string
  isOwner: boolean
  initialModule?: string | null
  initialChain?: string | null
}

export function TabbedModules({ 
  address, 
  isOwner = false,
  initialModule,
  initialChain 
}: TabbedModulesProps) {
  console.log('TabbedModules initializing with address:', address)
  console.log('Initial chain:', initialChain)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(initialModule || 'assets')
  const [selectedChain, setSelectedChain] = useState(initialChain || 'base')

  const updateUrl = (tab: string, chain: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('module', tab)
    
    const activeTab = tabData.find(t => t.value === tab)
    if (activeTab?.showChainDropdown && chain !== 'all') {
      url.searchParams.set('chain', chain)
    } else {
      url.searchParams.delete('chain')
    }

    router.push(url.toString())
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

  const activeTabData = tabData.find(tab => tab.value === activeTab)

  return (
    <div className="bg-[#111] rounded-xl p-4">
      <div className="flex flex-col border-b border-gray-700">
        {/* Portfolio Label */}
        <div className="px-2 md:px-4">
          <div className="flex flex-col items-start gap-1">
            <div className="text-xs font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600">
              PORTFOLIO
            </div>
            <div className="w-[175px] h-[2px] bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 mb-1" />
          </div>
        </div>

        {/* Tabs and Chain Dropdown */}
        <div className="flex items-center justify-between w-full px-0 md:px-4">
          <div className="flex items-center gap-0.5 md:gap-2 overflow-x-auto no-scrollbar py-2 px-1 md:px-0">
            {tabGroups[0].tabs.map((tab) => (
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

            {standardTabs.map((tab) => (
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
