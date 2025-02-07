import { getToken, mint, getSecondaryInfo, type MintableReturn, type SalesConfigAndTokenInfo } from "@zoralabs/protocol-sdk";
import { type PublicClient, createPublicClient, http, type Chain } from 'viem';
import { base, zora, arbitrum, optimism } from 'viem/chains';
import { ensuranceContracts } from '@/modules/certificates/config';

// Simple type for supported chains
export type EnsuranceChain = 'base' | 'zora' | 'arbitrum' | 'optimism';

// Chain configuration with explicit typing
const chainConfig: Record<EnsuranceChain, Chain> = {
  base,
  zora,
  arbitrum,
  optimism
} as const;

// Types matching Zora's sale strategies
type FixedPriceSaleStrategy = {
  pricePerToken: string;
  saleStart?: string;
  saleEnd?: string;
  maxTokensPerAddress?: string;
};

type ERC20SaleStrategy = {
  pricePerToken: string;
  currency: string;
  saleStart?: string;
  saleEnd?: string;
  maxTokensPerAddress?: string;
};

type TimedSaleStrategy = {
  mintFeePerQuantity: string;
  saleStart?: string;
  saleEnd?: string;
};

type AllowListSaleStrategy = {
  merkleRoot: string;
  pricePerToken?: string;
  currency?: string;
  startTime?: string;
  endTime?: string;
  perWalletLimit?: string;
};

// Helper type for our supported token configurations
type SupportedToken = {
  totalMinted: string;
  maxSupply?: string;
} & (
  | {
      salesConfig: FixedPriceSaleStrategy | ERC20SaleStrategy | TimedSaleStrategy;
    }
  | {
      allowlistConfig: AllowListSaleStrategy;
    }
);

// Type guard for our supported token configurations
function isSupportedToken(token: any): token is SupportedToken {
  return token && 
    typeof token === 'object' && 
    'totalMinted' in token &&
    typeof token.totalMinted === 'string' &&
    (
      // Check for sales config (fixed price ETH/ERC20 or timed)
      ('salesConfig' in token && typeof token.salesConfig === 'object') ||
      // Check for allowlist config (for future use)
      ('allowlistConfig' in token && typeof token.allowlistConfig === 'object')
    );
}

export interface MintCertificateParams {
  chain: EnsuranceChain;
  recipient: `0x${string}`;
  quantity: number;
  tokenId: bigint;
}

// Our UI-friendly version of the Zora token details
export interface TokenDetails {
  // Primary market info
  totalMinted: bigint;
  maxSupply: bigint | null;
  mintPrice: bigint;
  primaryMintActive: boolean;
  primaryMintEnd?: bigint;
  paymentToken?: {
    address: `0x${string}`;
    name: string;
    symbol: string;
    decimals: number;
  };
  
  // Sale type info - fixed price can be ETH or ERC20
  saleType?: 'fixedPrice' | 'allowlist' | 'timed';
  saleStatus: 'active' | 'ended' | 'not_started';
  
  // Timed sale info
  saleStart?: bigint;
  saleEnd?: bigint;
  minimumMarketEth?: bigint;
  
  // Secondary market info
  secondaryActive: boolean;
  secondaryPool?: `0x${string}`;
  secondaryToken?: {
    address: `0x${string}`;
    name: string;
    symbol: string;
  };
  secondaryCountdown?: {
    timeInSeconds: bigint;
    minimumMints: bigint;
  };
}

export class EnsuranceCollector {
  private getPublicClient(chain: EnsuranceChain) {
    const client = createPublicClient({
      chain: chainConfig[chain],
      transport: http()
    });
    return client as PublicClient;
  }

  async getTokenDetails(chain: EnsuranceChain, tokenId: bigint): Promise<TokenDetails> {
    const contractAddress = ensuranceContracts[chain] as `0x${string}`;
    const publicClient = this.getPublicClient(chain);

    // Get primary market info
    const response = await getToken({
      tokenContract: contractAddress,
      tokenId,
      chainId: chainConfig[chain].id,
      publicClient,
      mintType: "1155"
    });

    const { token, primaryMintActive, primaryMintEnd, secondaryMarketActive } = response;

    // Type guard to check if we have a valid token response
    if (!isSupportedToken(token)) {
      return {
        totalMinted: BigInt(0),
        maxSupply: null,
        mintPrice: BigInt(0),
        primaryMintActive: false,
        secondaryActive: false,
        saleType: undefined,
        saleStatus: 'ended'  // If we can't get valid sale config, treat it as ended
      };
    }

    // Helper for BigInt serialization
    const convertBigIntsForLog = (obj: any): any => {
      if (typeof obj === 'bigint') return obj.toString();
      if (typeof obj !== 'object' || obj === null) return obj;
      if (Array.isArray(obj)) return obj.map(convertBigIntsForLog);
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, convertBigIntsForLog(value)])
      );
    };

    console.log('Raw token response from Zora:', JSON.stringify(convertBigIntsForLog(token), null, 2));

    // Get secondary market info if active
    const secondaryInfo = secondaryMarketActive ? 
      await getSecondaryInfo({
        contract: contractAddress,
        tokenId,
        publicClient
      }) : undefined;

    console.log('Secondary market info:', JSON.stringify(convertBigIntsForLog(secondaryInfo), null, 2));

    // Extract price and payment info based on token info
    let mintPrice = BigInt(0);
    let paymentToken = undefined;
    let saleType: TokenDetails['saleType'] = undefined;

    // Determine sale type from token info
    if ('salesConfig' in token) {
      const config = token.salesConfig;
      
      // Check if it's a timed sale first (has mintFeePerQuantity of ✧111)
      if ('mintFeePerQuantity' in config && config.mintFeePerQuantity === '111000000000000') {
        saleType = 'timed';
        mintPrice = BigInt(config.mintFeePerQuantity);
      }
      // Then check if it's a fixed price sale (ETH or ERC20)
      else if ('pricePerToken' in config) {
        saleType = 'fixedPrice';
        mintPrice = BigInt(config.pricePerToken);
        
        // If there's a currency field, it's an ERC20 payment
        if ('currency' in config && config.currency !== '0x0000000000000000000000000000000000000000') {
          try {
            // Get ERC20 token details
            const name = await publicClient.readContract({
              address: config.currency as `0x${string}`,
              abi: [{ inputs: [], name: 'name', outputs: [{ type: 'string' }], type: 'function' }],
              functionName: 'name'
            }) as string;

            const symbol = await publicClient.readContract({
              address: config.currency as `0x${string}`,
              abi: [{ inputs: [], name: 'symbol', outputs: [{ type: 'string' }], type: 'function' }],
              functionName: 'symbol'
            }) as string;

            const decimals = await publicClient.readContract({
              address: config.currency as `0x${string}`,
              abi: [{ inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], type: 'function' }],
              functionName: 'decimals'
            }) as number;

            paymentToken = {
              address: config.currency as `0x${string}`,
              name,
              symbol,
              decimals
            };
          } catch (error) {
            console.error('Error fetching ERC20 token details:', error);
          }
        }
      }
    } 
    // Check for allowlist configuration
    else if ('allowlistConfig' in token) {
      const config = token.allowlistConfig;
      saleType = 'allowlist';
      mintPrice = config.pricePerToken ? BigInt(config.pricePerToken) : BigInt(0);
      
      if (config.currency && config.currency !== '0x0000000000000000000000000000000000000000') {
        try {
          // Get ERC20 token details for allowlist
          const name = await publicClient.readContract({
            address: config.currency as `0x${string}`,
            abi: [{ inputs: [], name: 'name', outputs: [{ type: 'string' }], type: 'function' }],
            functionName: 'name'
          }) as string;

          const symbol = await publicClient.readContract({
            address: config.currency as `0x${string}`,
            abi: [{ inputs: [], name: 'symbol', outputs: [{ type: 'string' }], type: 'function' }],
            functionName: 'symbol'
          }) as string;

          const decimals = await publicClient.readContract({
            address: config.currency as `0x${string}`,
            abi: [{ inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], type: 'function' }],
            functionName: 'decimals'
          }) as number;

          paymentToken = {
            address: config.currency as `0x${string}`,
            name,
            symbol,
            decimals
          };
        } catch (error) {
          console.error('Error fetching ERC20 token details:', error);
        }
      }
    }

    // Determine sale status based on dates and primary mint status
    let saleStatus: TokenDetails['saleStatus'];
    
    if ('salesConfig' in token) {
      const { saleStart, saleEnd } = token.salesConfig;
      if (saleStart && saleEnd) {
        const now = BigInt(Math.floor(Date.now() / 1000));
        const start = BigInt(saleStart);
        const end = BigInt(saleEnd);
        
        if (now < start) {
          saleStatus = 'not_started';
        } else if (now > end || !primaryMintActive) {
          saleStatus = 'ended';
        } else {
          saleStatus = 'active';
        }
      } else {
        // No dates specified, just use primaryMintActive
        saleStatus = primaryMintActive ? 'active' : 'ended';
      }
    } else if ('allowlistConfig' in token) {
      const { startTime, endTime } = token.allowlistConfig;
      if (startTime && endTime) {
        const now = BigInt(Math.floor(Date.now() / 1000));
        const start = BigInt(startTime);
        const end = BigInt(endTime);
        
        if (now < start) {
          saleStatus = 'not_started';
        } else if (now > end || !primaryMintActive) {
          saleStatus = 'ended';
        } else {
          saleStatus = 'active';
        }
      } else {
        // No dates specified, just use primaryMintActive
        saleStatus = primaryMintActive ? 'active' : 'ended';
      }
    } else {
      // No sale config at all, treat as ended
      saleStatus = 'ended';
    }

    return {
      // Primary market info
      totalMinted: BigInt(token.totalMinted),
      maxSupply: token.maxSupply ? BigInt(token.maxSupply) : null,
      mintPrice,
      primaryMintActive,
      primaryMintEnd,
      paymentToken,

      // Sale type info
      saleType,
      saleStatus,

      // Timed sale info
      saleStart: 'salesConfig' in token && token.salesConfig.saleStart ? 
        BigInt(token.salesConfig.saleStart) : 
        'allowlistConfig' in token && token.allowlistConfig.startTime ? 
        BigInt(token.allowlistConfig.startTime) : undefined,
      saleEnd: 'salesConfig' in token && token.salesConfig.saleEnd ? 
        BigInt(token.salesConfig.saleEnd) : 
        'allowlistConfig' in token && token.allowlistConfig.endTime ? 
        BigInt(token.allowlistConfig.endTime) : undefined,

      // Secondary market info
      secondaryActive: secondaryMarketActive,
      secondaryPool: secondaryInfo?.pool,
      secondaryToken: secondaryInfo ? {
        address: secondaryInfo.erc20z,
        name: secondaryInfo.name,
        symbol: secondaryInfo.symbol
      } : undefined,
      secondaryCountdown: secondaryInfo ? {
        timeInSeconds: secondaryInfo.marketCountdown || BigInt(0),
        minimumMints: secondaryInfo.minimumMintsForCountdown || BigInt(0)
      } : undefined
    };
  }

  async mintCertificate({ chain, recipient, quantity, tokenId }: MintCertificateParams) {
    const contractAddress = ensuranceContracts[chain] as `0x${string}`;
    const publicClient = this.getPublicClient(chain);

    // Use mint function directly
    const { parameters, erc20Approval } = await mint({
      tokenContract: contractAddress,
      tokenId,
      chainId: chainConfig[chain].id,
      publicClient,
      mintType: "1155",
      quantityToMint: quantity,
      minterAccount: recipient,
      mintRecipient: recipient
    });

    console.log('Raw Zora mint response:', JSON.stringify({ parameters, erc20Approval }, null, 2));

    // Get token details to check if this is an ERC20 mint
    const { token } = await getToken({
      tokenContract: contractAddress,
      tokenId,
      chainId: chainConfig[chain].id,
      publicClient
    });

    console.log('Token details:', JSON.stringify(token, null, 2));

    // Convert any BigInt values to hex strings
    const convertBigInts = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      if (typeof obj === 'bigint') return `0x${obj.toString(16)}`;
      
      return Object.entries(obj).reduce((acc, [key, value]) => {
        acc[key] = convertBigInts(value);
        return acc;
      }, {} as any);
    };

    const result = {
      parameters: convertBigInts(parameters),
      chainId: chainConfig[chain].id,
      erc20Approval: erc20Approval ? convertBigInts(erc20Approval) : undefined
    };

    console.log('Converted mint parameters:', result);

    return result;
  }
} 