import { generalCertificates } from '@/lib/database/certificates/general';

const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

export async function getTokenImage(address: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/config/image?address=${address}`);
    if (!response.ok) {
      throw new Error('Failed to fetch token image');
    }
    
    const data = await response.json();
    return data.url;

  } catch (error) {
    console.error('Error fetching token image:', error);
    return null;
  }
} 