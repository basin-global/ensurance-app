'use client';

import Image from 'next/image';

export function SwapModule() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-200">Currency Swap</h3>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Uniswap Interface Preview */}
          <div>
            <Image 
              src="/assets/uni-placeholder.png" 
              alt="Uniswap Interface"
              width={600}
              height={400}
              className="rounded-md w-full"
            />
          </div>

          {/* Coming Soon Message */}
          <div className="text-center py-4">
            <p className="text-xl font-bold text-gray-400">Coming Soon</p>
            <p className="text-gray-500 text-sm">Swap functionality will be available in the next update</p>
          </div>
        </div>

        {/* Swap Button */}
        <a 
          href="https://app.uniswap.org/swap"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-blue-600 text-white p-3 rounded-lg text-lg font-semibold hover:bg-blue-700 text-center transition-colors mt-6"
        >
          Swap on Uniswap ↗
        </a>
      </div>
    </div>
  );
} 