'use client'

import { PageHeader } from '@/components/layout/PageHeader'

// uniswap pools and balancer pools page

export default function PoolsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-4">
          <PageHeader
            title="ensurance pools"
            description="liquidity pools for general certificates & $ENSURE pairs"
            showSearch={false}
          />
          <div className="flex flex-col items-center justify-start text-center">
            <p className="mb-4">Currently, you can track Ensurance pools on</p>
            <a 
              href="https://www.geckoterminal.com/watchlist?name=ensurance&pools=2pzas4;2pzatj;2tjupa;2tjuxe;2txdvn;2txmal;2txmrd;2txszq;2txuby;2txxoi;2tyvj2;2tyzg2;2tyznt;2tz05k;2tz077;2tz091;2u0ego;2u1jji;2u2ito;2u2ix7;2u2j5s;2u2j8u;2u2umz;2u3iob;2u3iqv" 
              className="text-blue-500 hover:text-blue-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GeckoTerminal
            </a>
            <p className="mt-4">Stay tuned for our integrated pools dashboard!</p>
          </div>
        </div>
      </div>
    </div>
  );
}