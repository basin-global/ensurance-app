import Link from 'next/link';

export function FooterNavigation() {
  return (
    <div className="flex flex-col items-center">
      <span className="font-bold mb-4 text-xl">ensurance</span>
      <div className="flex justify-center gap-8 text-lg">
        <Link href="/all" className="hover:text-gray-300 transition-colors">
          agents
        </Link>
        <Link href="/pools" className="hover:text-gray-300 transition-colors">
          pools
        </Link>
        <span className="cursor-help hover:text-gray-300 transition-colors" title="Coming Soon">
          syndicates
        </span>
        <Link href="/certificates/all" className="hover:text-gray-300 transition-colors">
          certificates
        </Link>
      </div>
    </div>
  );
} 