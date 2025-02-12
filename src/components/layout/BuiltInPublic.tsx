'use client'

import Link from 'next/link'
import { Eye } from 'lucide-react'

// Base link style that all verification links will use
const baseVerifyLinkStyle = "text-gray-400 hover:text-white transition-colors"

export function BuiltInPublic() {
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-1 mb-1.5">
          <Eye className="w-3 h-3 text-white" />
          <span className="text-[11px] font-mono text-white font-medium">built in public</span>
          <Eye className="w-3 h-3 text-white" />
        </div>
        
        <div className="flex flex-col gap-1.5 font-mono text-[11px]">
          {/* BASIN line */}
          <div className="flex justify-center gap-2">
            <span className="text-white font-medium">BASIN</span>
          </div>

          {/* Natural Capital line */}
          <div className="flex justify-center">
            <span className="text-gray-400">natural capital</span>
          </div>
          
          {/* Links line */}
          <div className="flex justify-center gap-2">
            <Link
              href="https://github.com/basin-global"
              target="_blank"
              rel="noopener noreferrer"
              className={baseVerifyLinkStyle}
            >
              github
            </Link>
            <Link
              href="https://docs.basin.global"
              target="_blank"
              rel="noopener noreferrer"
              className={baseVerifyLinkStyle}
            >
              field manual
            </Link>
            <Link
              href="https://dispatches.basin.global"
              target="_blank"
              rel="noopener noreferrer"
              className={baseVerifyLinkStyle}
            >
              dispatches
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export the base style for consistency
export { baseVerifyLinkStyle } 