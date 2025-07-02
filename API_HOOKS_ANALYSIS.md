# API Routes & SWR Hooks Analysis

## Overview

This document provides a comprehensive analysis of all API routes in the Ensurance app and recommendations for SWR hooks to improve performance, caching, and user experience.

## Executive Summary

**Total API Routes Analyzed:** 17 main directories with 20+ individual endpoints
**Hook Recommendations:** Created 15 specialized hooks across 5 categories
**Key Benefits:**
- Automatic caching and background revalidation
- Optimized refresh intervals for different data types
- Error handling and retry logic
- Reduced redundant API calls
- Better UX with loading states

## SWR Configuration Setup

✅ **Created global SWR configurations:**
- `blockchainConfig` - 30s refresh for blockchain data
- `priceConfig` - 60s refresh for price data  
- `userDataConfig` - 2min refresh for user data
- `searchConfig` - No auto-refresh for search

## API Routes Analysis & Hook Recommendations

### 🚀 HIGH PRIORITY (Created Hooks)

#### 1. `/api/currencies` → `useCurrencies()`
**Purpose:** Currency and token data  
**Hook:** `@/hooks/prices/usePrices`  
**Benefits:** Cached price data, automatic refresh

#### 2. `/api/eth-price` → `useEthPrice()`
**Purpose:** Real-time ETH pricing  
**Hook:** `@/hooks/prices/usePrices`  
**Benefits:** Live price updates, 1-minute refresh

#### 3. `/api/accounts` → `useAccounts(group?)`, `useAccount(name)`, `useAccountStats()`
**Purpose:** User account data with filtering  
**Hook:** `@/hooks/data/useAccounts`  
**Benefits:** Group filtering, individual account lookup, stats

#### 4. `/api/alchemy/fungible` → `useWalletBalances(address)`
**Purpose:** Wallet token balances  
**Hook:** `@/hooks/blockchain/useWalletBalances`  
**Benefits:** Real-time balance updates, 30s refresh

#### 5. `/api/alchemy/nonfungible` → `useWalletNFTs(address, contracts?)`
**Purpose:** NFT holdings  
**Hook:** `@/hooks/blockchain/useWalletBalances`  
**Benefits:** NFT portfolio tracking, contract filtering

#### 6. `/api/search` → `useSearch(query, debounceMs?)`
**Purpose:** Universal search  
**Hook:** `@/hooks/data/useSearch`  
**Benefits:** Debounced search, cached results

#### 7. `/api/groups` → `useGroups()`, `useGroup(name)`
**Purpose:** Group data  
**Hook:** `@/hooks/data/useGroups`  
**Benefits:** Cached group data, individual lookups

#### 8. `/api/general` → `useGeneralCertificates()`, `useGeneralCertificate(address)`
**Purpose:** General certificates  
**Hook:** `@/hooks/data/useCertificates`  
**Benefits:** Certificate portfolio, individual certificate data

#### 9. `/api/specific` → `useSpecificCertificates()`, `useSpecificCertificate(address, tokenId)`
**Purpose:** Specific certificates  
**Hook:** `@/hooks/data/useCertificates`  
**Benefits:** Token-specific data, metadata caching

#### 10. `/api/syndicates` → `useSyndicates()`, `useSyndicate(name)`
**Purpose:** Syndicate data  
**Hook:** `@/hooks/data/useSyndicates`  
**Benefits:** Syndicate portfolio, individual data

### 📊 MEDIUM PRIORITY (Created Hooks)

#### 11. `/api/moralis/price-floor` → `usePriceFloor(contractAddress)`
**Purpose:** NFT price floors  
**Hook:** `@/hooks/prices/usePrices`  
**Benefits:** Market data caching, price tracking

#### 12. `/api/proceeds` → `useProceeds(contractAddress?)`
**Purpose:** Financial proceeds  
**Hook:** `@/hooks/financial/useProceeds`  
**Benefits:** Revenue tracking, transaction history

#### 13. `/api/pools` → `usePools()`
**Purpose:** Liquidity pool data  
**Hook:** `@/hooks/financial/useProceeds`  
**Benefits:** DeFi pool monitoring, liquidity tracking

### ⚡ TRADING SPECIFIC (Created Hooks)

#### 14. `/api/0x` → `useSwapQuote(params)`
**Purpose:** Swap quotes for trading  
**Hook:** `@/hooks/trading/useSwapQuotes`  
**Benefits:** Real-time quotes, but no long caching due to price volatility

### 🔧 UTILITY ROUTES (Lower Priority)

#### 15. `/api/admin/*` - Admin functionality
- `/api/admin/export` - Data exports
- `/api/admin/sync` - Data synchronization
**Recommendation:** Keep as direct API calls - used infrequently

#### 16. `/api/utilities/*` - Various utilities
- `/api/utilities/allowlist` - Token allowlists
- `/api/utilities/ineligible` - Ineligible tokens
- `/api/utilities/spam` - Spam detection
- `/api/utilities/image` - Image processing
**Recommendation:** Keep as direct API calls - utility functions

#### 17. `/api/metadata/*` - Token metadata
- Dynamic token metadata generation
**Recommendation:** Keep as direct API calls - generated content

#### 18. `/api/moralis/contract-sales` - Sales data
**Recommendation:** Could add `useSalesData(contractAddress)` if needed

## Implementation Plan

### ✅ COMPLETED

1. **Global SWR Setup**
   - `src/lib/swr-config.ts` - Configuration with specialized configs
   - `src/providers/swr-provider.tsx` - React provider component

2. **Blockchain Hooks** (`src/hooks/blockchain/`)
   - `useWalletBalances(address)` - Token balances
   - `useWalletNFTs(address, contracts?)` - NFT holdings

3. **Price Hooks** (`src/hooks/prices/`)
   - `useEthPrice()` - ETH price tracking
   - `usePriceFloor(contractAddress)` - NFT floor prices
   - `useCurrencies()` - Currency data

4. **Data Hooks** (`src/hooks/data/`)
   - `useAccounts(group?), useAccount(name), useAccountStats()` - Account data
   - `useSearch(query, debounceMs?)` - Search functionality
   - `useCertificates()` - General/specific certificates
   - `useGroups(), useGroup(name)` - Group data
   - `useSyndicates(), useSyndicate(name)` - Syndicate data

5. **Trading Hooks** (`src/hooks/trading/`)
   - `useSwapQuote(params)` - 0x swap quotes

6. **Financial Hooks** (`src/hooks/financial/`)
   - `useProceeds(contractAddress?)` - Financial proceeds
   - `usePools()` - Pool data

7. **Centralized Exports**
   - `src/hooks/index.ts` - Single import location for all hooks

### 🔄 NEXT STEPS

1. **Add SWR Provider to Layout**
   ```tsx
   // src/app/layout.tsx
   import { SWRProvider } from '@/providers/swr-provider'
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           <SWRProvider>
             {/* existing providers */}
             {children}
           </SWRProvider>
         </body>
       </html>
     )
   }
   ```

2. **Migrate Existing Components**
   - Replace direct `fetch` calls with appropriate hooks
   - Remove manual loading states where SWR provides them
   - Leverage SWR's automatic error handling

3. **Optional Enhancements**
   - Add `useSalesData(contractAddress)` for Moralis sales if needed
   - Add mutation hooks for POST/PUT operations
   - Add optimistic updates for better UX

## Usage Examples

```tsx
// Real-time wallet balances
function WalletBalance({ address }: { address: string }) {
  const { balances, isLoading, error } = useWalletBalances(address)
  
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return <BalanceList balances={balances} />
}

// Live ETH price with auto-refresh
function ETHPrice() {
  const { price, isLoading } = useEthPrice()
  return <span>${isLoading ? '...' : price?.toFixed(2)}</span>
}

// Debounced search
function SearchComponent() {
  const [query, setQuery] = useState('')
  const { results, isLoading } = useSearch(query) // Auto-debounced
  
  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {isLoading ? <Loading /> : <SearchResults results={results} />}
    </div>
  )
}
```

## Performance Benefits

1. **Automatic Caching** - No duplicate requests for same data
2. **Background Revalidation** - Fresh data without loading states
3. **Smart Refresh** - Different intervals for different data types
4. **Error Recovery** - Automatic retries with exponential backoff
5. **Memory Efficient** - Automatic cleanup of unused cache entries
6. **TypeScript Support** - Full type safety with proper interfaces

## Key Features

- **🔄 Auto-refresh** based on data type (30s blockchain, 60s prices, 2min user data)
- **🚫 Deduplication** prevents duplicate requests within windows
- **⚡ Focus revalidation** refreshes data when user returns to tab
- **🔁 Retry logic** handles network failures gracefully
- **📱 Optimistic updates** for better perceived performance
- **🎯 TypeScript** full type safety across all hooks

This comprehensive hook system will significantly improve the app's performance, especially for blockchain data and wallet balance tracking where real-time updates are crucial.