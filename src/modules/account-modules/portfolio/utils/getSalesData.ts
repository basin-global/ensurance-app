interface SalesData {
  lastSalePrice: number | null;
  lastSalePriceUsd: number | null;
  averagePrice: number | null;
  averagePriceUsd: number | null;
  lowestPrice: number | null;
  lowestPriceUsd: number | null;
  highestPrice: number | null;
  highestPriceUsd: number | null;
  totalTrades: number;
}

export async function getSalesData(contractAddress: string): Promise<SalesData> {
  try {
    // Get sales data
    const salesResponse = await fetch(`/api/moralis/contract-sales?address=${contractAddress}`);
    if (!salesResponse.ok) {
      console.warn(`No sales data for ${contractAddress}`);
      return {
        lastSalePrice: null,
        lastSalePriceUsd: null,
        averagePrice: null,
        averagePriceUsd: null,
        lowestPrice: null,
        lowestPriceUsd: null,
        highestPrice: null,
        highestPriceUsd: null,
        totalTrades: 0
      };
    }
    
    const salesData = await salesResponse.json();

    // Get current ETH price
    const ethPriceResponse = await fetch('/api/eth-price');
    if (!ethPriceResponse.ok) {
      console.warn('Failed to fetch ETH price');
      return {
        lastSalePrice: null,
        lastSalePriceUsd: null,
        averagePrice: null,
        averagePriceUsd: null,
        lowestPrice: null,
        lowestPriceUsd: null,
        highestPrice: null,
        highestPriceUsd: null,
        totalTrades: 0
      };
    }

    const ethPriceData = await ethPriceResponse.json();
    const ethPrice = ethPriceData.price;

    // Extract prices from response
    const lastSalePrice = salesData.last_sale?.price_formatted ? parseFloat(salesData.last_sale.price_formatted) : null;
    const averagePrice = salesData.average_sale?.price_formatted ? parseFloat(salesData.average_sale.price_formatted) : null;
    const lowestPrice = salesData.lowest_sale?.price_formatted ? parseFloat(salesData.lowest_sale.price_formatted) : null;
    const highestPrice = salesData.highest_sale?.price_formatted ? parseFloat(salesData.highest_sale.price_formatted) : null;

    // Calculate USD values using current ETH price
    const lastSalePriceUsd = lastSalePrice ? lastSalePrice * ethPrice : null;
    const averagePriceUsd = averagePrice ? averagePrice * ethPrice : null;
    const lowestPriceUsd = lowestPrice ? lowestPrice * ethPrice : null;
    const highestPriceUsd = highestPrice ? highestPrice * ethPrice : null;

    return {
      lastSalePrice,
      lastSalePriceUsd,
      averagePrice,
      averagePriceUsd,
      lowestPrice,
      lowestPriceUsd,
      highestPrice,
      highestPriceUsd,
      totalTrades: salesData.total_trades || 0
    };
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return {
      lastSalePrice: null,
      lastSalePriceUsd: null,
      averagePrice: null,
      averagePriceUsd: null,
      lowestPrice: null,
      lowestPriceUsd: null,
      highestPrice: null,
      highestPriceUsd: null,
      totalTrades: 0
    };
  }
} 