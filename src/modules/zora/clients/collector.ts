import { createCollectorClient } from "@zoralabs/protocol-sdk";
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
    const { token, primaryMintActive, primaryMintEnd, secondaryMarketActive } = await collector.getToken({
      tokenContract: contractAddress,
      mintType: "1155",
      tokenId
    });

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
    console.log('Sales config check:', 'salesConfig' in token);

    // Extract price and payment info based on sale type
    let mintPrice = BigInt(0);
    let paymentToken = undefined;

    if ('salesConfig' in token) {
      const { salesConfig } = token;
      console.log('Sale type:', salesConfig.saleType);
      console.log('Sales config data:', JSON.stringify(convertBigIntsForLog(salesConfig), null, 2));

      switch(salesConfig.saleType) {
        case 'erc20':
          // ERC20 token sale
          if (salesConfig.pricePerToken && salesConfig.currency) {
            mintPrice = BigInt(salesConfig.pricePerToken);
            try {
              console.log('Fetching ERC20 token details for:', salesConfig.currency, 'on chain:', chain);
              
              // Use the chain-specific public client
              const chainPublicClient = this.getPublicClient(chain);
              
              // First try to get the name
              const name = await chainPublicClient.readContract({
                address: salesConfig.currency as `0x${string}`,
                abi: [{ inputs: [], name: 'name', outputs: [{ type: 'string' }], type: 'function' }],
                functionName: 'name'
              }) as string;
              
              console.log('Got token name:', name);

              // Then get the symbol
              const symbol = await chainPublicClient.readContract({
                address: salesConfig.currency as `0x${string}`,
                abi: [{ inputs: [], name: 'symbol', outputs: [{ type: 'string' }], type: 'function' }],
                functionName: 'symbol'
              }) as string;
              
              console.log('Got token symbol:', symbol);

              // Get decimals for proper price formatting
              const decimals = await chainPublicClient.readContract({
                address: salesConfig.currency as `0x${string}`,
                abi: [{ inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], type: 'function' }],
                functionName: 'decimals'
              }) as number;
              
              console.log('Got token decimals:', decimals);

              paymentToken = {
                address: salesConfig.currency as `0x${string}`,
                name,
                symbol,
                decimals
              };
              
              console.log('Set payment token:', paymentToken);
            } catch (error) {
              console.error('Error fetching ERC20 token details:', error);
              // Set basic info even if we can't get name/symbol
              paymentToken = {
                address: salesConfig.currency as `0x${string}`,
                name: 'ERC20',
                symbol: 'ERC20',
                decimals: 6  // Default to 6 for USDC-like tokens
              };
            }
          } else {
            console.log('Missing pricePerToken or currency in ERC20 sale config');
          }
          break;

        case 'fixedPrice':
          // ETH fixed price sale
          if (salesConfig.pricePerToken) {
            mintPrice = BigInt(salesConfig.pricePerToken);
          }
          break;

        case 'allowlist':
          // Allow list sale - price might be in ETH or ERC20
          if (salesConfig.pricePerToken) {
            mintPrice = BigInt(salesConfig.pricePerToken);
            if (salesConfig.currency) {
              // Handle ERC20 allowlist sale
              paymentToken = {
                address: salesConfig.currency as `0x${string}`,
                ...(await publicClient.readContract({
                  address: salesConfig.currency as `0x${string}`,
                  abi: [
                    { inputs: [], name: 'name', outputs: [{ type: 'string' }], type: 'function' },
                    { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], type: 'function' }
                  ],
                  functionName: 'name'
                }).then(async (name: string) => ({
                  name,
                  symbol: await publicClient.readContract({
                    address: salesConfig.currency as `0x${string}`,
                    abi: [{ inputs: [], name: 'symbol', outputs: [{ type: 'string' }], type: 'function' }],
                    functionName: 'symbol'
                  }) as string
                })))
              };
            }
          }
          break;

        case 'timed':
          // Timed sale - use mintFee or mintFeePerQuantity
          if (salesConfig.mintFee || salesConfig.mintFeePerQuantity) {
            mintPrice = BigInt(salesConfig.mintFeePerQuantity || salesConfig.mintFee || 0);
            console.log('Setting timed sale mint price:', mintPrice.toString());
          }
          break;

        default:
          console.log('Unknown sale type:', salesConfig.saleType);
      }
    }

    // Get secondary market info if active
    const secondaryInfo = secondaryMarketActive ? 
      await collector.getSecondaryInfo({
        contract: contractAddress,
        tokenId
      }) : undefined;

    return {
      // Primary market info
      totalMinted: BigInt(token.totalMinted),
      maxSupply: token.maxSupply ? BigInt(token.maxSupply) : null,
      mintPrice,
      primaryMintActive,
      primaryMintEnd,
      paymentToken,

      // Timed sale info
      saleStart: token.salesConfig?.saleStart ? BigInt(token.salesConfig.saleStart) : undefined,
      saleEnd: token.salesConfig?.saleEnd ? BigInt(token.salesConfig.saleEnd) : undefined,
      minimumMarketEth: token.salesConfig?.minimumMarketEth ? BigInt(token.salesConfig.minimumMarketEth) : undefined,

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