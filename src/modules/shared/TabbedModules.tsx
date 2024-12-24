import React, { useState, lazy, Suspense, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation';
import { getActiveChains, chainOrder } from '@/config/chains'
import * as Tooltip from '@radix-ui/react-tooltip'
import ChainDropdown from '@/modules/shared/ChainDropdown';
import { TabData, BaseModuleProps } from '@/types';
import ReputationModule from '@/modules/reputation';

const AssetsModule = lazy(() => import('@/modules/assets'))
const CurrencyModule = lazy(() => import('@/modules/currency'))

interface TabGroup {
  label: string;
  tabs: TabData[];
}

interface TabbedModulesProps {
  address: string;
  isTokenbound: boolean;
  isOwner: boolean;
  initialModule?: string | null;
  initialChain?: string | null;
}

// Keep the base tab configurations outside the component
const baseTabGroups: TabGroup[] = [
  {
    label: 'PORTFOLIO',
    tabs: [
      { 
        value: 'assets', 
        label: 'assets', 
        component: AssetsModule,
        showChainDropdown: true 
      },
      { 
        value: 'currency', 
        label: 'currency', 
        component: CurrencyModule, 
        showChainDropdown: true 
      },
    ]
  }
];

const standardTabs: TabData[] = [
  { 
    value: 'reputation', 
    label: 'reputation', 
    component: ReputationModule, 
    showChainDropdown: false 
  },
];

export function TabbedModules({ 
  address, 
  isTokenbound = true, 
  isOwner = false,
  initialModule,
  initialChain 
}: TabbedModulesProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialModule || 'assets');
  const [selectedChain, setSelectedChain] = useState(initialChain || 'base');
  const [searchQuery, setSearchQuery] = useState('');
  const [shouldLoadAssets, setShouldLoadAssets] = useState(false);
  const assetsRef = useRef<HTMLDivElement>(null);

  // Create the dynamic tab data inside the component
  const tabGroups = baseTabGroups.map(group => ({
    ...group,
    tabs: group.tabs.map(tab => ({
      ...tab,
      component: tab.value === 'assets' 
        ? (props: BaseModuleProps) => (
            <AssetsModule 
              {...props} 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              currentGroup={undefined}
            />
          )
        : tab.component!
    })) as TabData[]
  }));

  // Combine all tabs for lookup purposes
  const tabData: TabData[] = [
    ...tabGroups[0].tabs,
    ...standardTabs
  ];

  const activeTabData = tabData.find(tab => tab.value === activeTab);

  const getTabStyle = (tabValue: string) => {
    const isPortfolioTab = tabValue === 'assets' || tabValue === 'currency';
    const isActive = activeTab === tabValue;

    if (isPortfolioTab) {
      return isActive
        ? 'bg-gradient-to-r from-amber-600/90 to-yellow-500/40 text-white font-semibold shadow-sm'
        : 'text-gray-500 dark:text-gray-300 hover:bg-gradient-to-r hover:from-amber-600/80 hover:to-yellow-500/30 hover:text-white hover:font-semibold'
    }

    return isActive
      ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white font-semibold shadow-sm'
      : 'text-gray-500 dark:text-gray-300 hover:bg-muted dark:hover:bg-muted-dark'
  }

  const updateUrl = (tab: string, chain: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('module', tab);
    
    if (activeTabData?.showChainDropdown && chain !== 'all') {
      url.searchParams.set('chain', chain);
    } else {
      url.searchParams.delete('chain');
    }

    router.push(url.toString());
  };

  const setActiveTabAndUpdateUrl = (tab: string) => {
    setActiveTab(tab);
    updateUrl(tab, selectedChain);
  };

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadAssets(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (assetsRef.current) {
      observer.observe(assetsRef.current);
    }

    return () => observer.disconnect();
  }, [activeTab]);

  useEffect(() => {
    if (initialModule && tabData.some(tab => tab.value === initialModule)) {
      setActiveTab(initialModule);
    }
    if (initialChain) {
      setSelectedChain(initialChain);
    }
  }, [initialModule, initialChain]);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden w-full -mt-2">
      <div className="flex flex-col border-b border-gray-200 dark:border-gray-700">
        {/* Portfolio Label and Line */}
        <div className="px-2 md:px-4">
          <div className="flex flex-col items-start gap-1">
            <div className="text-xs font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600">
              PORTFOLIO
            </div>
            <div className="w-[175px] h-[2px] bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 mb-1" />
          </div>
        </div>

        {/* Tabs and Chain Dropdown Container */}
        <div className="flex items-center justify-between w-full px-0 md:px-4">
          {/* Tabs Container */}
          <div className="flex items-center gap-0.5 md:gap-2 overflow-x-auto no-scrollbar py-2 px-1 md:px-0">
            {/* Portfolio Tabs */}
            <div className="flex gap-0.5 md:gap-1">
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
            </div>

            {/* Standard Tabs */}
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

          {/* Chain Dropdown */}
          {activeTabData?.showChainDropdown && (
            <div className="flex-shrink-0">
              <ChainDropdown
                selectedChain={selectedChain}
                onChange={(chain) => {
                  setSelectedChain(chain);
                  updateUrl(activeTab, chain);
                }}
                filterEnsurance={activeTab === 'ensurance'}
                className="px-1.5 md:px-4 py-1.5 md:py-2 rounded-t-lg transition-all duration-200 text-gray-500 dark:text-gray-300 hover:bg-muted dark:hover:bg-muted-dark text-xs md:text-base font-sans bg-transparent border-0"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-2 md:p-4 w-full" ref={assetsRef}>
        <Suspense fallback={<div>Loading...</div>}>
          {activeTabData && shouldLoadAssets && (
            <activeTabData.component
              key={`${activeTabData.value}-${selectedChain}`}
              address={address}
              selectedChain={selectedChain}
              isEnsuranceTab={activeTabData.isEnsuranceTab}
              isTokenbound={isTokenbound}
              isOwner={isOwner}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
