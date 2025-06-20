import { NextRequest, NextResponse } from 'next/server';
import { generalCertificates } from '@/lib/database/certificates/general';
import { accounts } from '@/lib/database/accounts';
import { currencies } from '@/lib/database/config/currencies';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

export const dynamic = 'force-dynamic';

const convertIpfsUrl = (url: string) => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://magic.decentralized-content.com/ipfs/')
  }
  return url
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const accountName = searchParams.get('account');
    const tokenId = searchParams.get('tokenId');
    const tokenType = searchParams.get('tokenType');

    console.log('Image API called with:', { address, accountName, tokenId, tokenType });

    if (!address && !accountName) {
      return NextResponse.json({ error: 'Address or account name is required' }, { status: 400 });
    }

    // Add caching headers
    const headers = {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'CDN-Cache-Control': 'max-age=3600',
    };

    // Create public client for contract calls
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    });

    // Handle account images
    if (accountName) {
      const parts = accountName.split('.');
      if (parts.length === 2) {
        const [tokenId, group] = parts;
        // First try the account's specific image
        const accountImageUrl = `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${group}/${tokenId}.png`;
        const accountResponse = await fetch(accountImageUrl);
        if (accountResponse.ok) {
          return NextResponse.json({ url: accountImageUrl }, { headers });
        }
        // Then try group's default image
        const groupImageUrl = `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${group}/0.png`;
        const groupResponse = await fetch(groupImageUrl);
        if (groupResponse.ok) {
          return NextResponse.json({ url: groupImageUrl }, { headers });
        }
        // Finally, use global default
        return NextResponse.json({ url: 'https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/default.png' }, { headers });
      }
    }

    // Handle ETH with direct path
    if (address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return NextResponse.json({ 
        url: 'https://raw.githubusercontent.com/0xsquid/assets/main/images/tokens/eth.svg'
      }, { headers });
    }

    // 1. Check currencies configuration for img_fallback first
    if (address) {
      try {
        console.log('Checking currencies config for address:', address);
        const currency = await currencies.getByAddress(address);
        if (currency?.img_fallback) {
          console.log('Found img_fallback in currencies config:', currency.img_fallback);
          const imageUrl = convertIpfsUrl(currency.img_fallback);
          return NextResponse.json({ url: imageUrl }, { headers });
        }
      } catch (error) {
        console.log('Failed to fetch currency config:', error);
      }
    }

    // 2. Check if it's one of our Zora coins
    if (address) {
      const generalCert = await generalCertificates.getByContractAddress(address);
      if (generalCert?.token_uri) {
        try {
          const metadataUrl = convertIpfsUrl(generalCert.token_uri);
          const metadataResponse = await fetch(metadataUrl);
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            if (metadata?.image) {
              return NextResponse.json({ url: convertIpfsUrl(metadata.image) }, { headers });
            }
          }
        } catch (metadataError) {
          console.log('Failed to parse Zora coin metadata:', metadataError);
        }
      }

              // 3. Try contractURI for any address (moved up in priority)
        try {
          console.log('Trying contractURI for address:', address);
          const contractURI = await publicClient.readContract({
          address: address as `0x${string}`,
          abi: [
            {
              inputs: [],
              name: 'contractURI',
              outputs: [{ type: 'string' }],
              stateMutability: 'view',
              type: 'function'
            }
          ] as const,
          functionName: 'contractURI'
        });
        
        console.log('ContractURI result:', contractURI);
        
        if (contractURI) {
          try {
            const metadataUrl = convertIpfsUrl(contractURI as string);
            console.log('Attempting to fetch metadata from:', metadataUrl);
            const metadataResponse = await fetch(metadataUrl);
            console.log('Metadata response status:', metadataResponse.status);
            
            if (metadataResponse.ok) {
              const metadata = await metadataResponse.json();
              console.log('Metadata from contractURI:', metadata);
              if (metadata?.image) {
                console.log('Found image in contractURI metadata:', metadata.image);
                return NextResponse.json({ url: convertIpfsUrl(metadata.image) }, { headers });
              }
            } else {
              console.log('Failed to fetch metadata - HTTP status:', metadataResponse.status);
            }
          } catch (metadataError) {
            console.log('Failed to parse metadata from contractURI:', metadataError);
          }
        }
      } catch (error) {
        console.log('Failed to fetch contractURI:', error);
      }

      // 4. Try tokenURI for any address (for contracts that use tokenURI instead of contractURI)
      try {
        console.log('Trying tokenURI for address:', address);
        const tokenURI = await publicClient.readContract({
          address: address as `0x${string}`,
          abi: [
            {
              inputs: [],
              name: 'tokenURI',
              outputs: [{ type: 'string' }],
              stateMutability: 'view',
              type: 'function'
            }
          ] as const,
          functionName: 'tokenURI'
        });
        
        console.log('TokenURI result:', tokenURI);
        
        if (tokenURI) {
          try {
            const metadataUrl = convertIpfsUrl(tokenURI as string);
            console.log('Attempting to fetch metadata from:', metadataUrl);
            const metadataResponse = await fetch(metadataUrl);
            console.log('Metadata response status:', metadataResponse.status);
            
            if (metadataResponse.ok) {
              const metadata = await metadataResponse.json();
              console.log('Metadata from tokenURI:', metadata);
              if (metadata?.image) {
                console.log('Found image in tokenURI metadata:', metadata.image);
                return NextResponse.json({ url: convertIpfsUrl(metadata.image) }, { headers });
              }
            } else {
              console.log('Failed to fetch metadata - HTTP status:', metadataResponse.status);
            }
          } catch (metadataError) {
            console.log('Failed to parse metadata from tokenURI:', metadataError);
          }
        }
      } catch (error) {
        console.log('Failed to fetch tokenURI:', error);
      }

      // 5. For ERC721 tokens, try tokenURI
      if (tokenType === 'erc721' && tokenId && address) {
        try {
          const tokenURI = await publicClient.readContract({
            address: address as `0x${string}`,
            abi: [
              {
                inputs: [{ name: 'tokenId', type: 'uint256' }],
                name: 'tokenURI',
                outputs: [{ type: 'string' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'tokenURI',
            args: [BigInt(tokenId)]
          });
          
          if (tokenURI) {
            try {
              const metadataUrl = convertIpfsUrl(tokenURI as string);
              const metadataResponse = await fetch(metadataUrl);
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                if (metadata?.image) {
                  return NextResponse.json({ url: convertIpfsUrl(metadata.image) }, { headers });
                }
              }
            } catch (metadataError) {
              console.log('Failed to parse ERC721 metadata:', metadataError);
            }
          }
        } catch (error) {
          console.log('Failed to fetch tokenURI for ERC721:', error);
        }
      }

      // 6. For ERC20 tokens, try contractURI (keeping this for backward compatibility)
      if (tokenType === 'erc20' && address) {
        try {
          const contractURI = await publicClient.readContract({
            address: address as `0x${string}`,
            abi: [
              {
                inputs: [],
                name: 'contractURI',
                outputs: [{ type: 'string' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'contractURI'
          });
          
          if (contractURI) {
            try {
              const metadataUrl = convertIpfsUrl(contractURI as string);
              const metadataResponse = await fetch(metadataUrl);
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                if (metadata?.image) {
                  return NextResponse.json({ url: convertIpfsUrl(metadata.image) }, { headers });
                }
              }
            } catch (metadataError) {
              console.log('Failed to parse ERC20 metadata:', metadataError);
            }
          }
        } catch (error) {
          console.log('Failed to fetch contractURI for ERC20:', error);
        }
      }

      // 7. Try Squid chain-specific webp
      const chainId = '8453'; // Base chain ID
      const squidChainUrl = `https://raw.githubusercontent.com/0xsquid/assets/main/images/migration/webp/${chainId}_${address.toLowerCase()}.webp`;
      console.log('Trying Squid chain URL:', squidChainUrl);
      const squidChainResponse = await fetch(squidChainUrl);
      if (squidChainResponse.ok) {
        console.log('Found image via Squid chain');
        return NextResponse.json({ url: squidChainUrl }, { headers });
      }

      // 8. Try TrustWallet
      const trustWalletUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`;
      console.log('Trying TrustWallet URL:', trustWalletUrl);
      const trustWalletResponse = await fetch(trustWalletUrl);
      if (trustWalletResponse.ok) {
        console.log('Found image via TrustWallet');
        return NextResponse.json({ url: trustWalletUrl }, { headers });
      }
    }

    // 9. No image found
    console.log('No image found for address:', address);
    return NextResponse.json({ url: null }, { headers });

  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
} 