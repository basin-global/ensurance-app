import { NextResponse } from 'next/server';
import { currencies } from '@/lib/database/config/currencies';
import { generalCertificates } from '@/lib/database/certificates/general';

interface AllowlistItem {
  contract_address: string;
  chain: string;
}

export async function GET() {
  try {
    // Fetch data from both sources in parallel
    const [currenciesData, certificatesData] = await Promise.all([
      currencies.getAll(),
      generalCertificates.getAll()
    ]);

    // Extract contract_address and chain from currencies
    const currencyItems: AllowlistItem[] = currenciesData.map(currency => ({
      contract_address: currency.address, // currencies uses 'address' field
      chain: 'base' // currencies seem to be base-only based on the query
    }));

    // Extract contract_address and chain from certificates
    const certificateItems: AllowlistItem[] = certificatesData.map(cert => ({
      contract_address: cert.contract_address,
      chain: cert.chain
    }));

    // Combine both arrays and remove duplicates
    const combinedItems = [...currencyItems, ...certificateItems];
    
    // Remove duplicates based on contract_address + chain combination
    const uniqueItems = combinedItems.reduce((acc, current) => {
      const identifier = `${current.contract_address.toLowerCase()}-${current.chain}`;
      if (!acc.some(item => `${item.contract_address.toLowerCase()}-${item.chain}` === identifier)) {
        acc.push(current);
      }
      return acc;
    }, [] as AllowlistItem[]);

    // Sort by chain, then by contract_address
    uniqueItems.sort((a, b) => {
      if (a.chain !== b.chain) {
        return a.chain.localeCompare(b.chain);
      }
      return a.contract_address.localeCompare(b.contract_address);
    });

    return NextResponse.json({
      success: true,
      data: uniqueItems,
      count: uniqueItems.length
    });

  } catch (error) {
    console.error('Error fetching allowlist data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch allowlist data' 
      },
      { status: 500 }
    );
  }
} 