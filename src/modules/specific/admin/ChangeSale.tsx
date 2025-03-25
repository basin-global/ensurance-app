'use client'

import { useState, useEffect } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { createWalletClient, custom, parseAbi, encodeFunctionData, createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { ensuranceContracts } from '@/modules/certificates/specific/config/ensurance'
import { getToken } from '@zoralabs/protocol-sdk'
import { supportedERC20s } from '@/modules/certificates/specific/config/erc20'

const FIXED_PRICE_STRATEGY = '0x04E2516A2c207E84a1839755675dfd8eF6302F0a'
const ERC20_STRATEGY = '0x777777E8850d8D6d98De2B5f64fae401F96eFF31'
const TIMED_SALE_STRATEGY = '0x777777722D078c97c6ad07d9f36801e653E356Ae'

type SaleType = "fixedPrice" | "erc20" | "allowlist" | "timed" | null

export function ChangeSale({ 
  tokenId,
  chain,
  currentSaleType
}: { 
  tokenId: string
  chain: string
  currentSaleType: SaleType
}) {
  const { ready } = usePrivy()
  const { wallets } = useWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [targetStrategy, setTargetStrategy] = useState<string>('')
  
  // Fixed Price & ERC20 shared fields
  const [saleStart, setSaleStart] = useState('')
  const [saleEnd, setSaleEnd] = useState('')
  const [maxTokensPerAddress, setMaxTokensPerAddress] = useState('')
  const [pricePerToken, setPricePerToken] = useState('')
  
  // ERC20 specific
  const [currency, setCurrency] = useState('')
  
  // Timed Sale specific
  const [marketCountdown, setMarketCountdown] = useState('')
  const [minimumMarketEth, setMinimumMarketEth] = useState('')
  const [tokenName, setTokenName] = useState('')
  const [tokenSymbol, setTokenSymbol] = useState('')

  // Add state to store current config
  const [currentConfig, setCurrentConfig] = useState<any>(null)

  // Load current sale configuration
  useEffect(() => {
    const loadCurrentConfig = async () => {
      if (!ready || !wallets.length) return

      try {
        const publicClient = createPublicClient({
          chain: base,
          transport: http()
        })

        const contractAddress = ensuranceContracts[chain as keyof typeof ensuranceContracts]
        if (!contractAddress) return

        const response = await getToken({
          tokenContract: contractAddress as `0x${string}`,
          tokenId: BigInt(tokenId),
          chainId: base.id,
          publicClient,
          mintType: "1155"
        })

        console.log('Current token info:', response)
        
        // Set existing values from current config
        if ((response.token as any)?.salesConfig) {
          const config = (response.token as any).salesConfig
          setCurrentConfig(config)  // Store the full config
          
          // Set dates if they exist
          if (config.saleStart) {
            const date = new Date(Number(config.saleStart) * 1000)
            setSaleStart(date.toISOString().slice(0, 16))
          }
          if (config.saleEnd) {
            const date = new Date(Number(config.saleEnd) * 1000)
            setSaleEnd(date.toISOString().slice(0, 16))
          }
          
          // Set other fields
          setMaxTokensPerAddress(config.maxTokensPerAddress?.toString() || '')
          
          // For ERC20, store currency and convert price to human readable
          if (config.currency) {
            setCurrency(config.currency)
            // Find token config to get correct decimals
            const tokenConfig = Object.values(supportedERC20s[chain] || {}).find(
              token => token.address.toLowerCase() === config.currency.toLowerCase()
            )
            const decimals = tokenConfig?.decimals || 18
            const price = Number(config.pricePerToken) / Math.pow(10, decimals)
            setPricePerToken(price.toString())
          } else if (config.pricePerToken) {
            setPricePerToken(config.pricePerToken.toString())
          }
        }
      } catch (err) {
        console.error('Error loading current config:', err)
      }
    }

    loadCurrentConfig()
  }, [ready, wallets, chain, tokenId])

  const updateSaleConfig = async () => {
    const wallet = wallets[0]
    if (!wallet || !currentSaleType) return

    setIsLoading(true)
    try {
      const provider = await wallet.getEthereumProvider()
      const account = wallet.address as `0x${string}`
      
      const client = createWalletClient({
        account,
        chain: base,
        transport: custom(provider)
      })

      const contractAddress = ensuranceContracts[chain as keyof typeof ensuranceContracts]
      if (!contractAddress) {
        throw new Error('Invalid chain')
      }

      // Get the strategy address based on current type
      const strategyAddress = currentSaleType === 'fixedPrice' ? FIXED_PRICE_STRATEGY :
                             currentSaleType === 'erc20' ? ERC20_STRATEGY :
                             currentSaleType === 'timed' ? TIMED_SALE_STRATEGY : null
      
      if (!strategyAddress) {
        throw new Error('Invalid sale type')
      }

      let setSaleData
      if (currentSaleType === 'timed') {
        // Encode setSaleV2 for Timed Sale
        setSaleData = encodeFunctionData({
          abi: parseAbi([
            'function setSaleV2(uint256 tokenId, (uint64,uint64,uint256,string,string) config) external'
          ]),
          functionName: 'setSaleV2',
          args: [
            BigInt(tokenId),
            [
              BigInt(saleStart ? Math.floor(new Date(saleStart).getTime() / 1000) : 0),
              BigInt(marketCountdown || 0),
              BigInt(minimumMarketEth || 0),
              tokenName || '',
              tokenSymbol || ''
            ]
          ]
        })
      } else {
        // Convert dates to Unix timestamps
        const startDate = saleStart ? new Date(saleStart) : new Date()
        const endDate = saleEnd ? new Date(saleEnd) : new Date()
        
        // Ensure we're using UTC timestamps
        const startTimestamp = Math.floor(startDate.getTime() / 1000)
        const endTimestamp = Math.floor(endDate.getTime() / 1000)

        console.log('Date conversion:', {
          startInput: saleStart,
          endInput: saleEnd,
          startDate,
          endDate,
          startTimestamp,
          endTimestamp
        })

        // Prepare config based on strategy type
        const isERC20 = currentSaleType === 'erc20'
        
        // Convert human readable price to token decimals
        let tokenPrice
        if (isERC20) {
          // Find token config to get correct decimals
          const tokenConfig = Object.values(supportedERC20s[chain] || {}).find(
            token => token.address.toLowerCase() === currency.toLowerCase()
          )
          const decimals = tokenConfig?.decimals || 18
          tokenPrice = pricePerToken ? 
            BigInt(Math.floor(parseFloat(pricePerToken) * Math.pow(10, decimals))) : 
            BigInt(0)
        } else {
          tokenPrice = pricePerToken ? BigInt(pricePerToken) : BigInt(0)
        }

        const salesConfig = isERC20 ? [
          BigInt(startTimestamp),
          BigInt(endTimestamp),
          BigInt(maxTokensPerAddress || 0),  // Use existing maxTokensPerAddress if set
          tokenPrice,
          (currentConfig?.fundsRecipient || '0x0000000000000000000000000000000000000000') as `0x${string}`,  // Keep existing fundsRecipient
          (currency || '0x0000000000000000000000000000000000000000') as `0x${string}`
        ] : [
          BigInt(startTimestamp),
          BigInt(endTimestamp),
          BigInt(maxTokensPerAddress || 0),  // Use existing maxTokensPerAddress if set
          tokenPrice,
          (currentConfig?.fundsRecipient || '0x0000000000000000000000000000000000000000') as `0x${string}`  // Keep existing fundsRecipient
        ]

        // Encode setSale for Fixed Price or ERC20
        setSaleData = encodeFunctionData({
          abi: parseAbi([
            isERC20 
              ? 'function setSale(uint256 tokenId, (uint64,uint64,uint64,uint256,address,address) config) external'
              : 'function setSale(uint256 tokenId, (uint64,uint64,uint64,uint96,address) config) external'
          ]),
          functionName: 'setSale',
          args: [BigInt(tokenId), salesConfig]
        })
      }

      // Call callSale on our contract
      const tx = await client.writeContract({
        account,
        chain: base,
        address: contractAddress as `0x${string}`,
        abi: parseAbi([
          'function callSale(uint256 tokenId, address salesConfig, bytes memory data) external'
        ]),
        functionName: 'callSale',
        args: [
          BigInt(tokenId),
          strategyAddress as `0x${string}`,
          setSaleData
        ]
      })

      console.log('Update sale config tx:', tx)
    } catch (err) {
      console.error('Error updating sale config:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const resetSale = async () => {
    const wallet = wallets[0]
    if (!wallet || !targetStrategy) return

    setIsLoading(true)
    try {
      const provider = await wallet.getEthereumProvider()
      const account = wallet.address as `0x${string}`
      
      const client = createWalletClient({
        account,
        chain: base,
        transport: custom(provider)
      })

      const publicClient = createPublicClient({
        chain: base,
        transport: http()
      })

      const contractAddress = ensuranceContracts[chain as keyof typeof ensuranceContracts]
      if (!contractAddress) {
        throw new Error('Invalid chain')
      }

      // Get current token info
      const response = await getToken({
        tokenContract: contractAddress as `0x${string}`,
        tokenId: BigInt(tokenId),
        chainId: base.id,
        publicClient,
        mintType: "1155"
      })

      console.log('Current token info:', response)

      // Encode the resetSale call as data
      const resetSaleData = encodeFunctionData({
        abi: parseAbi(['function resetSale(uint256 tokenId) external']),
        functionName: 'resetSale',
        args: [BigInt(tokenId)]
      })

      // Call callSale on our contract, which will call resetSale on the strategy
      const tx = await client.writeContract({
        account,
        chain: base,
        address: contractAddress as `0x${string}`,
        abi: parseAbi([
          'function callSale(uint256 tokenId, address salesConfig, bytes memory data) external'
        ]),
        functionName: 'callSale',
        args: [
          BigInt(tokenId),
          targetStrategy as `0x${string}`,
          resetSaleData
        ]
      })

      console.log('Reset tx:', tx)
    } catch (err) {
      console.error('Error resetting sale:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!ready || !wallets.length) {
    return <div>Please connect your wallet</div>
  }

  const renderConfigFields = () => {
    switch(currentSaleType) {
      case 'fixedPrice':
        return (
          <>
            <div>
              <label htmlFor="saleStart" className="text-sm font-medium text-gray-200">Sale Start</label>
              <input
                id="saleStart"
                type="datetime-local"
                className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={saleStart}
                onChange={(e) => setSaleStart(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="saleEnd" className="text-sm font-medium text-gray-200">Sale End</label>
              <input
                id="saleEnd"
                type="datetime-local"
                className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={saleEnd}
                onChange={(e) => setSaleEnd(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="pricePerToken" className="text-sm font-medium text-gray-200">Price Per Token (in wei)</label>
              <input
                id="pricePerToken"
                type="number"
                min="0"
                className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={pricePerToken}
                onChange={(e) => setPricePerToken(e.target.value)}
                placeholder="0"
              />
            </div>
          </>
        )
      
      case 'erc20':
        return (
          <>
            <div>
              <label htmlFor="currency" className="text-sm font-medium text-gray-200">Select Token</label>
              <select
                id="currency"
                className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="">Select token...</option>
                {Object.entries(supportedERC20s[chain] || {}).map(([symbol, token]) => (
                  <option key={token.address} value={token.address}>
                    {symbol} ({token.address})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pricePerToken" className="text-sm font-medium text-gray-200">Price Per Token</label>
              <input
                id="pricePerToken"
                type="number"
                step="0.01"
                min="0"
                className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={pricePerToken}
                onChange={(e) => setPricePerToken(e.target.value)}
                placeholder="1.00"
              />
            </div>
            <div>
              <label htmlFor="saleStart" className="text-sm font-medium text-gray-200">Sale Start</label>
              <input
                id="saleStart"
                type="datetime-local"
                className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={saleStart}
                onChange={(e) => setSaleStart(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="saleEnd" className="text-sm font-medium text-gray-200">Sale End</label>
              <input
                id="saleEnd"
                type="datetime-local"
                className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={saleEnd}
                onChange={(e) => setSaleEnd(e.target.value)}
              />
            </div>
          </>
        )
      
      case 'timed':
        return (
          <>
            <div>
              <label htmlFor="saleStart" className="text-sm font-medium text-gray-200">Sale Start</label>
              <input
                id="saleStart"
                type="datetime-local"
                className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={saleStart}
                onChange={(e) => setSaleStart(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="marketCountdown" className="text-sm font-medium text-gray-200">Market Countdown (in seconds)</label>
              <input
                id="marketCountdown"
                type="number"
                min="0"
                className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={marketCountdown}
                onChange={(e) => setMarketCountdown(e.target.value)}
                placeholder="86400"
              />
            </div>
            <div>
              <label htmlFor="minimumMarketEth" className="text-sm font-medium text-gray-200">Minimum Market ETH</label>
              <input
                id="minimumMarketEth"
                type="number"
                min="0"
                className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={minimumMarketEth}
                onChange={(e) => setMinimumMarketEth(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label htmlFor="tokenName" className="text-sm font-medium text-gray-200">Token Name</label>
              <input
                id="tokenName"
                className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="tokenSymbol" className="text-sm font-medium text-gray-200">Token Symbol</label>
              <input
                id="tokenSymbol"
                className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
              />
            </div>
          </>
        )
      
      default:
        return <p>Loading current configuration...</p>
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Current Sale */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Current Sale</h3>
        <div className="p-4 bg-gray-900 rounded-lg">
          <p className="text-gray-400 text-sm mb-1">Contract Address</p>
          <p className="font-mono text-sm break-all">
            {ensuranceContracts[chain as keyof typeof ensuranceContracts]}
          </p>
          <p className="text-gray-400 text-sm mt-4 mb-1">Sale Type</p>
          <p className="font-mono text-sm">{currentSaleType?.toUpperCase() || 'None'}</p>
        </div>
      </section>

      {/* Update Sale */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Update Sale</h3>
        <div className="grid w-full max-w-sm items-center gap-4">
          {renderConfigFields()}
          <button 
            onClick={updateSaleConfig}
            disabled={isLoading}
            className="mt-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            {isLoading ? 'Updating...' : 'Update Sale'}
          </button>
        </div>
      </section>

      {/* Change Sale */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Change Sale</h3>
        <div className="grid w-full max-w-sm items-center gap-4">
          <select
            value={targetStrategy}
            onChange={(e) => setTargetStrategy(e.target.value)}
            className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200"
            disabled={currentSaleType === 'timed'} // Can't change from timed
          >
            <option value="">Select new strategy...</option>
            {currentSaleType !== 'fixedPrice' && <option value={FIXED_PRICE_STRATEGY}>Fixed Price</option>}
            {currentSaleType !== 'erc20' && <option value={ERC20_STRATEGY}>ERC20</option>}
            {currentSaleType !== 'timed' && <option value={TIMED_SALE_STRATEGY}>Timed Sale</option>}
          </select>
          
          <button 
            onClick={resetSale}
            disabled={isLoading || !targetStrategy}
            className="mt-4 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            {isLoading ? 'Changing...' : 'Change Sale Type'}
          </button>
        </div>
      </section>
    </div>
  )
} 