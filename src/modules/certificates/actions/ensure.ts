'use server'

import { EnsuranceCollector } from '@/modules/certificates/collect/client';
import { type EnsuranceChain } from '@/modules/certificates/collect/client';
import { revalidatePath } from 'next/cache';

export interface EnsureActionParams {
  chain: EnsuranceChain;
  tokenId: string;
  recipient: `0x${string}`;
  quantity?: number;
}

interface EnsureSuccess {
  success: true;
  parameters: any;
  chainId: number;
  erc20Approval?: {
    to: string;
    from: string;
    data: string;
    value?: string;
  };
}

interface EnsureError {
  success: false;
  error: string;
}

type EnsureResult = EnsureSuccess | EnsureError;

export async function ensure(params: EnsureActionParams): Promise<EnsureResult> {
  try {
    const collector = new EnsuranceCollector();
    
    // Get mint parameters
    const { parameters, chainId, erc20Approval } = await collector.mintCertificate({
      chain: params.chain,
      recipient: params.recipient,
      quantity: params.quantity || 1,
      tokenId: BigInt(params.tokenId)
    });

    // Revalidate the certificate pages
    revalidatePath(`/certificates/${params.chain}/${params.tokenId}`);
    revalidatePath('/certificates/mine');
    revalidatePath('/certificates/all');

    return {
      success: true,
      parameters,
      chainId,
      erc20Approval
    };
  } catch (error) {
    console.error('Error ensuring certificate:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to ensure certificate'
    };
  }
} 