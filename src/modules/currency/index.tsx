import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { getChainBySimplehashName, getActiveChains, chainOrder, getChainIcon } from '@/config/chains'
import Image from 'next/image'
import { Send, ArrowLeftRight, DollarSign, EyeOff, MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu'
import { EnsureMenuItems } from '@/modules/ensure/ensure-menu'
import { EnsureModal } from '@/modules/ensure/ensure-modal'
import { Asset } from '@/types';

// Helper function to format numbers
const formatNumber = (value: string | number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined) return 'N/A';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  
  const parts = num.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join('.');
}

// Helper function to determine appropriate decimals
const getAppropriateDecimals = (value: number): number => {
  if (value === 0) return 2;
  const absValue = Math.abs(value);
  if (absValue >= 1) return 2;
  return Math.min(8, Math.max(2, -Math.floor(Math.log10(absValue))));
}

const getExplorerUrl = (chain: string, address: string) => {
  const chainConfig = getChainBySimplehashName(chain);
  if (!chainConfig?.blockExplorers?.default?.url) {
    return '#';
  }
  
  const cleanAddress = address.includes('.') ? address.split('.')[1] : address;
  return `${chainConfig.blockExplorers.default.url}/token/${cleanAddress}`;
}

const getUniswapUrl = (chain: string, address: string) => {
  const chainConfig = getChainBySimplehashName(chain)
  if (!chainConfig) return '#';
  
  const cleanAddress = address.includes('.') ? address.split('.')[1] : address;
  return `https://app.uniswap.org/#/tokens/${chainConfig.name.toLowerCase()}/${cleanAddress}`;
}

const getChainDisplayName = (chain: string): string => {
  const chainConfig = getChainBySimplehashName(chain)
  return chainConfig ? chainConfig.name : chain
}

// New helper function to truncate text
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

interface CurrencyModuleProps {
  address: string;
  selectedChain: string;
  isTokenbound?: boolean;
}

interface TokenBalance {
  chain: string;
  symbol: string;
  fungible_id?: string;
  decimals: number;
  name?: string;
  queried_wallet_balances: Array<{
    quantity_string: string;
    value_usd_string: string;
  }>;
  prices?: Array<{
    value_usd_string: string;
    marketplace_name: string;
  }>;
}

type GroupedBalances = {
  [chain: string]: TokenBalance[];
};

// When passing token to EnsureModal, transform it to match Asset type
const transformTokenToAsset = (token: TokenBalance, selectedChain: string): Asset => ({
  chain: selectedChain,
  contract_address: token.fungible_id || '',
  token_id: '',
  queried_wallet_balances: token.queried_wallet_balances.map(balance => ({
    quantity_string: balance.quantity_string,
    value_usd_string: balance.value_usd_string
  }))
});

export default function CurrencyModule({ address, selectedChain, isTokenbound = true }: CurrencyModuleProps) {
  const [groupedBalances, setGroupedBalances] = useState<GroupedBalances>({})
  const [ethPrice, setEthPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedOperation, setSelectedOperation] = useState<'send' | 'swap' | 'buy' | null>(null)
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null)

  const fetchBalances = useCallback(async () => {
    setLoading(true)
    try {
      console.log('Fetching balances for address:', address)
      const response = await axios.get(`/api/simplehash/native-erc20?address=${address}`)
      console.log('Raw API response:', JSON.stringify(response.data, null, 2))
      const fetchedBalances = response.data.groupedBalances
      setEthPrice(response.data.ethPrice)
      console.log('Chains in fetched balances:', Object.keys(fetchedBalances));
      
      setGroupedBalances(fetchedBalances)
    } catch (error) {
      console.error('Error fetching balances:', error)
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data)
        console.error('Response status:', error.response?.status)
      }
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  const isNativeToken = (token: TokenBalance) => {
    return !token.fungible_id;
  };

  const filteredBalances = selectedChain === 'all'
    ? groupedBalances
    : { [selectedChain]: groupedBalances[selectedChain] || [] };

  const sortedChains = Object.keys(filteredBalances).sort((a, b) => 
    chainOrder.indexOf(a) - chainOrder.indexOf(b)
  );

  const handleOperation = (operation: 'send' | 'swap' | 'buy', token?: TokenBalance) => {
    setSelectedOperation(operation)
    setSelectedToken(token || null)
    setModalOpen(true)
  }

  return (
    <div className="bg-transparent w-full">
      {loading ? (
        <div>Loading...</div>
      ) : sortedChains.length > 0 ? (
        <div className="space-y-8 w-full">
          {sortedChains.map((chain) => {
            const firstToken = filteredBalances[chain]?.[0];
            
            return (
              <div key={chain} className="overflow-x-auto w-full">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Image
                    src={getChainIcon(chain)}
                    alt={`${getChainDisplayName(chain)} icon`}
                    width={24}
                    height={24}
                    className="mr-2"
                  />
                  {getChainDisplayName(chain)}
                </h3>
                {chain === 'polygon' ? (
                  <div>
                    {filteredBalances[chain].some(token => !token.fungible_id) && (
                      <table className="w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden mb-4 [&_td]:border [&_th]:border">
                        <colgroup>
                          <col className="w-[35%]" />
                          <col className="w-[25%]" />
                          <col className="w-[25%]" />
                          <col className="w-[7.5%]" />
                          <col className="w-[7.5%]" />
                        </colgroup>
                        <thead className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-2 text-left">Token</th>
                            <th className="px-4 py-2 text-left">Balance</th>
                            <th className="px-4 py-2 text-left">USD Value</th>
                            <th className="px-4 py-2 text-left text-gray-500">Price</th>
                            <th className="px-4 py-2 text-left text-gray-500">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBalances[chain]
                            .filter(token => !token.fungible_id)
                            .map((token) => {
                              const balance = Number(token.queried_wallet_balances[0].quantity_string) / Math.pow(10, token.decimals);
                              const balanceDecimals = getAppropriateDecimals(balance);
                              const price = token.prices && token.prices.length > 0 ? Number(token.prices[0].value_usd_string) : 0;
                              const priceDecimals = getAppropriateDecimals(price);

                              return (
                                <tr key={token.symbol} className="border-b dark:border-gray-700">
                                  <td className="px-4 py-2 text-left">
                                    <span className="font-medium">{token.symbol}</span>
                                  </td>
                                  <td className="px-4 py-2 text-right font-medium tabular-nums">
                                    {formatNumber(balance || 0, balanceDecimals)}
                                  </td>
                                  <td className="px-4 py-2 text-right font-medium tabular-nums">
                                    ${formatNumber(token.queried_wallet_balances[0]?.value_usd_string || 0, 2)}
                                  </td>
                                  <td className="px-4 py-2 text-right text-gray-500 tabular-nums">
                                    {price > 0 ? `$${formatNumber(price, priceDecimals)}` : 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 text-right text-gray-500">
                                    {token.prices && token.prices.length > 0 ? token.prices[0].marketplace_name : 'N/A'}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )}
                    <p className="mb-2">ERC20 support for Polygon coming soon!</p>
                    <a
                      href={`https://polygonscan.com/tokenholdings?a=${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View token holdings on PolygonScan
                    </a>
                  </div>
                ) : filteredBalances[chain].length > 0 ? (
                  <table className="w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden [&_td]:border [&_th]:border">
                    <colgroup>
                      <col className="w-[35%]" />
                      <col className="w-[25%]" />
                      <col className="w-[25%]" />
                      <col className="w-[7.5%]" />
                      <col className="w-[7.5%]" />
                    </colgroup>
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left">Token</th>
                        <th className="px-4 py-2 text-left">Balance</th>
                        <th className="px-4 py-2 text-left">USD Value</th>
                        <th className="px-4 py-2 text-left text-gray-500">Price</th>
                        <th className="px-4 py-2 text-left text-gray-500">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBalances[chain].map((token) => {
                        const balance = Number(token.queried_wallet_balances[0].quantity_string) / Math.pow(10, token.decimals);
                        const balanceDecimals = getAppropriateDecimals(balance);
                        const price = token.prices && token.prices.length > 0 ? Number(token.prices[0].value_usd_string) : (token.symbol === 'ETH' && ethPrice ? ethPrice : 0);
                        const priceDecimals = getAppropriateDecimals(price);

                        return (
                          <tr key={token.fungible_id || token.symbol} className="group relative border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-2 text-left">
                              <div className="flex items-center gap-3">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                      <MoreHorizontal className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <EnsureMenuItems
                                        isTokenbound={false}
                                        onOperationSelect={(op) => handleOperation(op as any, token)}
                                        asset={{
                                          chain,
                                          contract_address: token.fungible_id || '',
                                          isNative: isNativeToken(token)
                                        }}
                                        isCurrency={true}
                                      />
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <span className="font-medium">{token.symbol}</span>
                              </div>
                            </td>
                            <td className={`px-4 py-2 text-right font-medium tabular-nums ${token.symbol === 'ENSURE' ? 'og-gradient-text' : ''}`}>
                              {formatNumber(balance || 0, balanceDecimals)}
                            </td>
                            <td className={`px-4 py-2 text-right font-medium tabular-nums ${token.symbol === 'ENSURE' ? 'og-gradient-text' : ''}`}>
                              ${formatNumber(token.queried_wallet_balances[0]?.value_usd_string || 0, 2)}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-500 tabular-nums">
                              {isNativeToken(token) ? (
                                token.symbol === 'ETH' && ethPrice ? 
                                  `$${formatNumber(ethPrice, getAppropriateDecimals(ethPrice))}` : 
                                  'Coming Soon'
                              ) : (
                                price > 0 ? `$${formatNumber(price, priceDecimals)}` : 'N/A'
                              )}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-500">
                              {isNativeToken(token) ? (
                                getChainDisplayName(chain)
                              ) : token.prices && token.prices.length > 0 ? (
                                <a
                                  href={token.fungible_id ? getUniswapUrl(chain, token.fungible_id) : '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                  title={token.prices[0].marketplace_name}
                                >
                                  {truncateText(token.prices[0].marketplace_name, 10)}
                                </a>
                              ) : (
                                'N/A'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p>No tokens found for this chain.</p>
                )}
                {firstToken && (
                  <div className="mt-6 flex gap-4 justify-center">
                    <button 
                      onClick={() => handleOperation('send', firstToken)}
                      className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Send className="h-4 w-4" />
                      SEND
                    </button>
                    <button 
                      onClick={() => handleOperation('swap', firstToken)}
                      className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      SWAP
                    </button>
                    <button 
                      onClick={() => handleOperation('buy', firstToken)}
                      className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <DollarSign className="h-4 w-4" />
                      BUY
                    </button>
                  </div>
                )}
                {modalOpen && selectedOperation && (
                  <EnsureModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    operation={selectedOperation}
                    asset={selectedToken ? transformTokenToAsset(selectedToken, selectedChain) : {
                      chain: selectedChain,
                      contract_address: '',
                      token_id: '',
                      queried_wallet_balances: [{
                        quantity_string: '0',
                        value_usd_string: '0'
                      }]
                    }}
                    address={address}
                    isTokenbound={false}
                    onAction={async () => ({ hash: '' })}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div>No token balances found for selected chain.</div>
      )}
    </div>
  )
}
