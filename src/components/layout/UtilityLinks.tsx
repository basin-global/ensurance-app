export function UtilityLinks() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-center gap-8">
        <a
          href="/docs"
          className="font-space-mono text-base tracking-wider text-gray-500 hover:text-gray-300 transition-colors"
        >
          docs
        </a>
        <a
          href="https://www.coinbase.com/price/base-ensure"
          target="_blank"
          rel="noopener noreferrer"
          className="font-space-mono text-base tracking-wider bg-gradient-to-r from-blue-400/80 to-purple-400/80 bg-clip-text text-transparent hover:from-blue-300 hover:to-purple-300 transition-all"
        >
          $ENSURE
        </a>
        <a
          href="https://binder.basin.global"
          target="_blank"
          rel="noopener noreferrer"
          className="font-space-mono text-base tracking-wider text-gray-500 hover:text-gray-300 transition-colors"
        >
          binder
        </a>
      </div>
    </div>
  )
} 