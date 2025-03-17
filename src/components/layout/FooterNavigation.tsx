import Link from 'next/link';

export function FooterNavigation() {
  return (
    <div className="flex flex-col items-center w-full max-w-5xl">
      {/* Header */}
      <span className="font-bold mb-12 text-5xl text-gray-100">ensurance</span>
      
      {/* Two Columns */}
      <div className="grid grid-cols-2 gap-48 mb-12">
        {/* Left Column - Natural Capital */}
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-400 mb-4">ensuring the</span>
          <div className="flex flex-col items-center text-2xl text-gray-300">
            <div className="flex items-center gap-2">
              <Link href="/natural-capital/stocks" className="hover:text-gray-100 transition-colors">
                stocks
              </Link>
              <span className="text-gray-400">&</span>
              <Link href="/natural-capital/flows" className="hover:text-gray-100 transition-colors">
                flows
              </Link>
            </div>
            <span className="text-gray-400 text-xl my-1">of</span>
            <Link href="/natural-capital" className="hover:text-gray-100 transition-colors">
              natural capital
            </Link>
          </div>
        </div>

        {/* Right Column - Operations */}
        <div className="flex flex-col items-center justify-center text-base text-gray-300 mt-4">
          <Link href="/proceeds" className="hover:text-gray-100 transition-colors mb-2">
            proceeds
          </Link>
          <Link href="/market" className="hover:text-gray-100 transition-colors mb-2">
            market
          </Link>
          <Link href="/syndicates" className="hover:text-gray-100 transition-colors mb-2">
            syndicates
          </Link>
          <Link href="/pools" className="hover:text-gray-100 transition-colors">
            pools
          </Link>
        </div>
      </div>
    </div>
  );
} 