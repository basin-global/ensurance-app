import Link from 'next/link';

export function FooterNavigation() {
  return (
    <div className="flex flex-col items-center">
      <span className="font-bold mb-6 text-2xl">ensurance</span>
      <div className="flex justify-center gap-12 text-lg">
        <Link href="/all" className="hover:text-gray-300 transition-colors">
          agents
        </Link>
        <span className="cursor-help hover:text-gray-300 transition-colors" title="Coming Soon">
          syndicates
        </span>
        <Link href="/certificates/all" className="hover:text-gray-300 transition-colors">
          certificates
        </Link>
        <Link href="/pools" className="hover:text-gray-300 transition-colors">
          pools
        </Link>
      </div>
    </div>
  );
} 