import { createCollectorClient, type MintableReturn, type SalesConfigAndTokenInfo } from "@zoralabs/protocol-sdk";
import { type PublicClient, createPublicClient, http, Chain } from 'viem';
import { base, zora, arbitrum, optimism } from 'viem/chains';
import { type EnsuranceChain } from '../config/chains';
import { zoraCreator1155ImplABI } from "@zoralabs/protocol-deployments";
import { ensuranceContracts } from '@/modules/ensurance/config';

// Chain configuration with explicit typing
const chainConfig: Record<EnsuranceChain, Chain> = {
  base,
  zora,
  arbitrum,
  optimism
} as const;

// Add this type guard at the top of the file
function isSalesConfigToken(token: any): token is { 
  salesConfig: { 
    mintFeePerQuantity?: string;
    saleType?: string;
    pricePerToken?: string;
    currency?: string;
    saleStart?: string;
    saleEnd?: string;
  };
  totalMinted: string;
  maxSupply?: string;
} {
  return token && 
    typeof token === 'object' && 
    'salesConfig' in token &&
    typeof token.salesConfig === 'object' &&
    'totalMinted' in token;
}

export interface MintCertificateParams {
  chain: EnsuranceChain;
  recipient: `0x${string}`;
  quantity: number;
  tokenId: bigint;
}

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
  
  // Sale type info
  saleType?: 'fixedPrice' | 'erc20' | 'allowlist' | 'timed';
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
  private getPublicClient(chain: EnsuranceChain): PublicClient {
    return createPublicClient({
      chain: chainConfig[chain],
      transport: http()
    }) as PublicClient;
  }

  async getTokenDetails(chain: EnsuranceChain, tokenId: bigint): Promise<TokenDetails> {
    const publicClient = this.getPublicClient(chain);
    const contractAddress = ensuranceContracts[chain] as `0x${string}`;

    // Create collector client
    const collector = createCollectorClient({ 
      chainId: chainConfig[chain].id,
      publicClient 
    });

    // Get primary market info
    const response = await collector.getToken({
      tokenContract: contractAddress,
      mintType: "1155",
      tokenId
    });

    const { token, primaryMintActive, primaryMintEnd, secondaryMarketActive } = response;

    // Type guard to check if we have a valid token response
    if (!isSalesConfigToken(token)) {
      return {
        totalMinted: BigInt(token.totalMinted || '0'),
        maxSupply: token.maxSupply ? BigInt(token.maxSupply) : null,
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
      await collector.getSecondaryInfo({
        contract: contractAddress,
        tokenId
      }) : undefined;

    console.log('Secondary market info:', JSON.stringify(convertBigIntsForLog(secondaryInfo), null, 2));

    // Extract price and payment info based on token info
    let mintPrice = BigInt(0);
    let paymentToken = undefined;
    let saleType: TokenDetails['saleType'] = undefined;

    // Determine sale type from token info
    const config = token.salesConfig;
    if (config) {
      // First check if it's an ERC20 sale
      if (config.currency && config.currency !== '0x0000000000000000000000000000000000000000') {
        saleType = 'erc20';
        mintPrice = BigInt(config.pricePerToken || '0');
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
      // Then check if it's a fixed price ETH sale
      else if (config.saleType === 'fixedPrice' || (config.pricePerToken && BigInt(config.pricePerToken) > 0)) {
        saleType = 'fixedPrice';
        mintPrice = BigInt(config.pricePerToken || '0');
      }
      // If neither, and has mintFeePerQuantity of ✧111, it's a timed sale
      else if (config.mintFeePerQuantity === '111000000000000') {
        saleType = 'timed';
        mintPrice = BigInt(config.mintFeePerQuantity);
      }
    }

    // Determine sale status based on dates and primary mint status
    let saleStatus: TokenDetails['saleStatus'];
    if (config?.saleStart && config?.saleEnd) {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const start = BigInt(config.saleStart);
      const end = BigInt(config.saleEnd);
      
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
      saleStart: config?.saleStart ? BigInt(config.saleStart) : undefined,
      saleEnd: config?.saleEnd ? BigInt(config.saleEnd) : undefined,

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
    const publicClient = this.getPublicClient(chain);
    const contractAddress = ensuranceContracts[chain] as `0x${string}`;

    // Create collector client
    const collector = createCollectorClient({ 
      chainId: chainConfig[chain].id,
      publicClient 
    });

    // Use the SDK's mint function directly
    const { parameters, erc20Approval } = await collector.mint({
      tokenContract: contractAddress,
      mintType: "1155",
      tokenId,
      quantityToMint: quantity,
      minterAccount: recipient,
      mintRecipient: recipient
    });

    console.log('Raw Zora mint response:', JSON.stringify({ parameters, erc20Approval }, null, 2));

    // Get token details to check if this is an ERC20 mint
    const { token } = await collector.getToken({
      tokenContract: contractAddress,
      mintType: "1155",
      tokenId
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