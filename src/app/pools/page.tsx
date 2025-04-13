'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Copy, ExternalLink } from 'lucide-react'

interface Pool {
  contract_address: string;
  name: string;
  pool_type: 'uniswap' | 'balancer' | 'ensure';
  tokens?: string[]; // Array of token symbols in the pool
  pair_token?: string;
  dex_type?: string;
}

// uniswap pools and balancer pools page

export default function PoolsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle copy address
  const handleCopy = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const response = await fetch('/api/pools');
        if (!response.ok) throw new Error('Failed to fetch pools');
        const data = await response.json();
        setPools(data);
      } catch (err) {
        console.error('Error fetching pools:', err);
        setError(err instanceof Error ? err.message : 'Failed to load pools');
      } finally {
        setLoading(false);
      }
    };

    fetchPools();
  }, []);

  // Filter pools based on search
  const filteredPools = pools.filter(pool => {
    const searchTerm = searchQuery.toLowerCase();
    const dexType = pool.pool_type === 'ensure' 
      ? pool.dex_type?.replace('_', ' ')
      : pool.pool_type === 'uniswap'
      ? 'uniswap v3'
      : pool.pool_type;

    return pool.name.toLowerCase().includes(searchTerm) ||
      (pool.tokens && pool.tokens.some(token => 
        token.toLowerCase().includes(searchTerm)
      )) ||
      dexType.toLowerCase().includes(searchTerm);
  });

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1 max-w-7xl">
        <div className="space-y-8">
          <PageHeader
            title="ensurance pools"
            description="liquidity for what mattters"
            showSearch={true}
            searchPlaceholder="Search pools..."
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {loading ? (
            <div className="animate-pulse">
              <div className="h-12 bg-gray-700 rounded-lg" />
            </div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-3 px-4 w-[23%]">name</th>
                    <th className="text-left py-3 px-4 w-[10%]">type</th>
                    <th className="text-center py-3 px-4 w-[12%]">add liquidity</th>
                    <th className="text-left py-3 px-4 w-[15%]">contract address</th>
                    <th className="text-left py-3 px-4 w-[40%]">tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPools.map((pool) => {
                    const shortAddress = `${pool.contract_address.slice(0, 6)}...${pool.contract_address.slice(-4)}`;
                    const protocolUrl = pool.pool_type === 'balancer' 
                      ? `https://balancer.fi/pools/base/v3/${pool.contract_address}`
                      : `https://app.uniswap.org/explore/pools/base/${pool.contract_address}`;
                    
                    return (
                      <tr 
                        key={pool.contract_address} 
                        className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-gray-200">
                          {pool.pool_type === 'uniswap' 
                            ? pool.name.replace('/ETH', '')
                            : pool.name
                          }
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-1 bg-gray-800 rounded-full text-gray-400">
                            {pool.pool_type === 'ensure' 
                              ? pool.dex_type?.replace('_', ' ') 
                              : pool.pool_type === 'uniswap'
                              ? 'uniswap v3'
                              : pool.pool_type
                            }
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <a
                            href={pool.pool_type === 'balancer' 
                              ? `https://balancer.fi/pools/base/v3/${pool.contract_address}`
                              : pool.pool_type === 'ensure' && pool.dex_type === 'aerodrome'
                              ? `https://aerodrome.finance/liquidity?query=0x0c66d591d1ff5944a44aebb65c33f6b6e82a124f`
                              : `https://app.uniswap.org/explore/pools/base/${pool.contract_address}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            add liquidity
                            <ExternalLink size={14} />
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-gray-400">
                              {shortAddress}
                            </span>
                            <button
                              onClick={() => handleCopy(pool.contract_address)}
                              className="p-1 hover:bg-gray-700 rounded transition-colors"
                              title="Copy address"
                            >
                              <Copy 
                                size={14} 
                                className={copiedAddress === pool.contract_address ? 'text-green-400' : 'text-gray-400'}
                              />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {pool.pool_type === 'ensure' ? (
                            <div className="flex flex-wrap gap-x-2">
                              <span>ENSURE/{pool.pair_token}</span>
                            </div>
                          ) : pool.pool_type === 'uniswap' ? (
                            <div className="flex flex-wrap gap-x-2">
                              <span>{pool.name.replace('/ETH', '')}/ETH</span>
                            </div>
                          ) : (
                            pool.tokens && (
                              <div className="flex flex-wrap gap-x-2">
                                {pool.tokens.map((token, i) => (
                                  <span key={i} className="after:content-[','] last:after:content-none">
                                    {token}
                                  </span>
                                ))}
                              </div>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}