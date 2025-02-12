import Link from 'next/link';

export function FooterNavigation() {
  return (
    <div className="flex flex-col items-center">
      <span className="font-bold mb-6 text-2xl">ensurance</span>
      
      {/* Primary Product */}
      <div className="flex justify-center mb-4">
        <Link href="/certificates/all" className="text-xl hover:text-gray-300 transition-colors">
          certificates
        </Link>
      </div>

      {/* Product Features */}
      <div className="flex justify-center gap-12 text-lg mb-4">
        <span className="cursor-help hover:text-gray-300 transition-colors" title="Coming Soon">
          syndicates
        </span>
        <Link href="/pools" className="hover:text-gray-300 transition-colors">
          pools
        </Link>
        <Link href="/exchange" className="hover:text-gray-300 transition-colors">
          exchange
        </Link>
      </div>
    </div>
  );
} 