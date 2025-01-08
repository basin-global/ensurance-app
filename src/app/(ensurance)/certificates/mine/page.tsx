'use client'

import { SubNavigation } from '@/components/layout/SubNavigation'
import Image from 'next/image'

export default function CertificatesMinePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SubNavigation type="certificates" />
      <div className="flex-1">
        <div className="flex items-center justify-center py-24">
          <div className="w-20 h-20 flex-shrink-0 mr-6">
            <Image
              src="/groups/orbs/ensurance-orb.png"
              alt="Ensurance orb"
              width={80}
              height={80}
              className="rounded-full"
            />
          </div>
          <div>
            <p className="text-xl font-mono text-white-400 mb-4">
              View and manage your Certificates of Ensurance...
            </p>
            <p className="text-gray-500 font-mono">
              Certificate management is coming soon.{' '}
              <a 
                href="https://x.com/basin_global" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                follow updates here
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 