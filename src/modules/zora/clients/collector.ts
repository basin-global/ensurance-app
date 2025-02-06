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

    // Get secondary market info if active
    const secondaryInfo = secondaryMarketActive ? 
      await collector.getSecondaryInfo({
        contract: contractAddress,
        tokenId
      }) : undefined;

    return {
      // Primary market info
      totalMinted: token.totalMinted,
      maxSupply: token.maxSupply,
      mintPrice: 'fixedPriceSale' in token ? token.fixedPriceSale.price : BigInt(0),
      primaryMintActive,
      primaryMintEnd,

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