'use client'

import Link from 'next/link'
import { Eye } from 'lucide-react'

// Base link style matching BasedOnchain
const baseLinkStyle = "text-gray-400 hover:text-gray-200 transition-colors text-[9px]"

export function BuiltInPublic() {
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-1 mb-1.5">
          <Eye className="w-2.5 h-2.5 text-gray-200" />
          <span className="text-[9px] font-mono text-gray-200">built in public</span>
          <Eye className="w-2.5 h-2.5 text-gray-200" />
        </div>
        
        <div className="flex flex-col gap-1.5 font-mono text-[9px]">
          {/* BASIN line */}
          <div className="flex justify-center gap-2">
            <span className="text-gray-200">BASIN</span>
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
              className={baseLinkStyle}
            >
              github
            </Link>
            <Link
              href="https://docs.basin.global"
              target="_blank"
              rel="noopener noreferrer"
              className={baseLinkStyle}
            >
              field manual
            </Link>
            <Link
              href="https://dispatches.basin.global"
              target="_blank"
              rel="noopener noreferrer"
              className={baseLinkStyle}
            >
              dispatches
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 