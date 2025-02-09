import { getToken, mint, getSecondaryInfo, type MintableReturn } from "@zoralabs/protocol-sdk";
import { type PublicClient, createPublicClient, http, type Chain } from 'viem';
import { base, zora, arbitrum, optimism } from 'viem/chains';
import { ensuranceContracts } from '@/modules/certificates/config/ensurance';

// Chain configuration
export type EnsuranceChain = 'base' | 'zora' | 'arbitrum' | 'optimism';
const chainConfig: Record<EnsuranceChain, Chain> = {
  base,
  zora,
  arbitrum,
  optimism
} as const;

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
  
  // Sale type info from Zora
  saleType?: 'fixedPrice' | 'erc20' | 'allowlist' | 'timed';
  saleStatus: 'active' | 'ended' | 'not_started';
  
  // Sale timing
  saleStart?: bigint;
  saleEnd?: bigint;
  
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
    return createPublicClient({
      chain: chainConfig[chain],
      transport: http()
    }) as PublicClient;
  }

  async getTokenDetails(chain: EnsuranceChain, tokenId: bigint): Promise<TokenDetails> {
    const contractAddress = ensuranceContracts[chain] as `0x${string}`;
    const publicClient = this.getPublicClient(chain);

    // Get token info from Zora SDK
    const response = await getToken({
      tokenContract: contractAddress,
      tokenId,
      chainId: chainConfig[chain].id,
      publicClient,
      mintType: "1155"
    });

    // Helper for BigInt serialization
    const convertForLog = (obj: any): any => {
      if (typeof obj === 'bigint') return obj.toString();
      if (typeof obj !== 'object' || obj === null) return obj;
      if (Array.isArray(obj)) return obj.map(convertForLog);
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, convertForLog(value)])
      );
    };

    // Log raw response for debugging
    console.log('Raw Zora SDK Response:', JSON.stringify(convertForLog({
      token: response.token,
      primaryMintActive: response.primaryMintActive,
      primaryMintEnd: response.primaryMintEnd,
      secondaryMarketActive: response.secondaryMarketActive,
      prepareMint: !!response.prepareMint
    }), null, 2));

    // Get cost information using prepareMint
    let mintPrice = BigInt(0);
    let paymentToken = undefined;

    if (response.prepareMint) {
      const { costs } = response.prepareMint({
        minterAccount: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        quantityToMint: BigInt(1)
      });

      console.log('Mint costs:', JSON.stringify(convertForLog(costs), null, 2));

      // If there's a currency token, it will be in costs.totalPurchaseCostCurrency
      if (costs.totalPurchaseCostCurrency) {
        mintPrice = costs.totalPurchaseCostCurrency;
        
        // Get ERC20 token details if needed
        if ('salesConfig' in response.token && 
            'currency' in response.token.salesConfig && 
            response.token.salesConfig.currency && 
            response.token.salesConfig.currency !== '0x0000000000000000000000000000000000000000') {
          try {
            const [name, symbol, decimals] = await Promise.all([
              publicClient.readContract({
                address: response.token.salesConfig.currency as `0x${string}`,
                abi: [{ inputs: [], name: 'name', outputs: [{ type: 'string' }], type: 'function' }],
                functionName: 'name'
              }),
              publicClient.readContract({
                address: response.token.salesConfig.currency as `0x${string}`,
                abi: [{ inputs: [], name: 'symbol', outputs: [{ type: 'string' }], type: 'function' }],
                functionName: 'symbol'
              }),
              publicClient.readContract({
                address: response.token.salesConfig.currency as `0x${string}`,
                abi: [{ inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], type: 'function' }],
                functionName: 'decimals'
              })
            ]);

            paymentToken = {
              address: response.token.salesConfig.currency as `0x${string}`,
              name: name as string,
              symbol: symbol as string,
              decimals: decimals as number
            };
          } catch (error) {
            console.error('Error fetching ERC20 token details:', error);
          }
        }
      } else {
        // ETH price
        mintPrice = costs.totalCostEth;
      }
    }

    // Get secondary market info if active
    let secondaryInfo = undefined;
    if (response.secondaryMarketActive) {
      secondaryInfo = await getSecondaryInfo({
        contract: contractAddress,
        tokenId,
        publicClient
      });
    }

    // Determine sale status based on dates and primary mint status
    let saleStatus: TokenDetails['saleStatus'];
    const now = BigInt(Math.floor(Date.now() / 1000));
    const config = 'salesConfig' in response.token ? response.token.salesConfig : null;
    
    if (config && config.saleStart && config.saleEnd) {
      const start = BigInt(config.saleStart);
      const end = BigInt(config.saleEnd);
      
      if (now < start) {
        saleStatus = 'not_started';
      } else if (now > end || !response.primaryMintActive) {
        saleStatus = 'ended';
      } else {
        saleStatus = 'active';
      }
    } else {
      saleStatus = response.primaryMintActive ? 'active' : 'ended';
    }

    return {
      // Primary market info
      totalMinted: BigInt(response.token.totalMinted),
      maxSupply: response.token.maxSupply ? BigInt(response.token.maxSupply) : null,
      mintPrice,
      primaryMintActive: response.primaryMintActive,
      primaryMintEnd: response.primaryMintEnd,
      paymentToken,

      // Sale type info (directly from Zora SDK)
      saleType: 'salesConfig' in response.token && 'saleType' in response.token.salesConfig 
        ? response.token.salesConfig.saleType 
        : undefined,
      saleStatus,

      // Sale timing
      saleStart: config?.saleStart ? BigInt(config.saleStart) : undefined,
      saleEnd: config?.saleEnd ? BigInt(config.saleEnd) : undefined,

      // Secondary market info
      secondaryActive: response.secondaryMarketActive,
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

    // Convert BigInts to hex strings for wallet compatibility
    const convertBigInts = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      if (typeof obj === 'bigint') return `0x${obj.toString(16)}`;
      return Object.entries(obj).reduce((acc, [key, value]) => {
        acc[key] = convertBigInts(value);
        return acc;
      }, {} as any);
    };

    return {
      parameters: convertBigInts(parameters),
      chainId: chainConfig[chain].id,
      erc20Approval: erc20Approval ? convertBigInts(erc20Approval) : undefined
    };
  }
} 