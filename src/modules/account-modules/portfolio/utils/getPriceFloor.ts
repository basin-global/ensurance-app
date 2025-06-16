export async function getPriceFloor(contractAddress: string): Promise<{ floorPrice: number | null; floorPriceUsd: number | null }> {
  try {
    // Get floor price in ETH
    const floorResponse = await fetch(`/api/moralis/price-floor?address=${contractAddress}`);
    if (!floorResponse.ok) {
      console.warn(`No price floor data for ${contractAddress}`);
      return { floorPrice: null, floorPriceUsd: null };
    }
    
    const floorData = await floorResponse.json();
    const floorPrice = parseFloat(floorData.floor_price);

    // Get current ETH price
    const ethPriceResponse = await fetch('/api/eth-price');
    if (!ethPriceResponse.ok) {
      console.warn('Failed to fetch ETH price');
      return { floorPrice, floorPriceUsd: null };
    }

    const ethPriceData = await ethPriceResponse.json();
    const ethPrice = ethPriceData.price;

    // Calculate USD value
    const floorPriceUsd = floorPrice * ethPrice;

    return { 
      floorPrice,
      floorPriceUsd
    };
  } catch (error) {
    console.error('Error fetching price floor:', error);
    return { floorPrice: null, floorPriceUsd: null };
  }
} 