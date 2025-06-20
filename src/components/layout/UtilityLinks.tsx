import Link from "next/link"

export function UtilityLinks() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col items-center gap-4">
        <Link 
          href="http://ensurance.wtf"
          target="_blank"
          rel="noopener noreferrer"
          className="font-space-mono tracking-wider text-blue-400/90 hover:text-blue-300 transition-all duration-300 relative px-3 py-1 rounded-md border border-blue-400/20 hover:border-blue-300/40 animate-pulse-subtle"
        >
          ensurance.wtf
        </Link>
        <Link 
          href="/docs"
          className="font-space-mono tracking-wider text-gray-500 hover:text-gray-300 transition-colors"
        >
          docs
        </Link>
      </div>
    </div>
  )
} 