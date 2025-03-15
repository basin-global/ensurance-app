import { ReferralButton } from '@/modules/rewards/RewardsLink';
import { GroupLinks } from '@/modules/groups/GroupLinks';
import { FooterNavigation } from '@/components/layout/FooterNavigation';
import { UtilityLinks } from '@/components/layout/UtilityLinks';
import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 mt-auto relative z-10">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col">
          <div className="flex items-center justify-center mb-6">
            <ReferralButton />
          </div>
          <div className="flex items-center justify-center">
            <FooterNavigation />
          </div>
          <div className="mb-6">
            <GroupLinks />
          </div>

          {/* Upper Gradient Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-8" />
          
          <div className="mb-8">
            <UtilityLinks />
          </div>
          
          {/* Lower Gradient Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-8" />
          
          {/* Bottom Footer */}
          <div className="max-w-3xl mx-auto w-full">
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column - BASIN */}
              <div className="flex flex-col items-center justify-center">
                <div className="text-center h-[120px] flex items-center justify-center w-72">
                  <Link href="/" className="opacity-60 hover:opacity-100 transition-opacity">
                    <Image
                      src="/assets/logos/basin-blue-circle%20300.png"
                      alt="BASIN"
                      width={65}
                      height={65}
                    />
                  </Link>
                </div>
                <div className="flex flex-col items-center gap-1.5 w-72">
                  {/* Gradient Divider */}
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-1.5" />
                  <div className="flex flex-col items-center gap-1.5">
                    <Link
                      href="https://github.com/basin-global"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      github
                    </Link>
                    <Link
                      href="https://docs.basin.global"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      field manual
                    </Link>
                    <Link
                      href="https://dispatches.basin.global"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      dispatches
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right Column - Legal Links and Logos */}
              <div className="flex flex-col items-center justify-center">
                <div className="text-center h-[120px] flex items-center justify-center w-72">
                  <div className="flex flex-col items-center">
                    {/* Built on Ethereum Logo */}
                    <div className="opacity-60 hover:opacity-100 transition-opacity mb-6">
                      <Image
                        src="/assets/logos/builtOnEthereum.png"
                        alt="Built on Ethereum - Jack Butcher"
                        width={50}
                        height={23}
                        className="w-auto h-auto"
                      />
                    </div>

                    {/* ELIZA OS Logo */}
                    <Link
                      href="https://elizaos.github.io/eliza/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <Image
                        src="/assets/logos/eliza-os_logo-mark_light.png"
                        alt="ELIZA OS"
                        width={42}
                        height={42}
                        className="w-auto h-auto"
                      />
                    </Link>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1.5 w-72">
                  {/* Gradient Divider */}
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-1.5" />
                  {/* Links line */}
                  <div className="flex flex-col items-center gap-1.5">
                    <Link
                      href="https://github.com/basin-global/ensurance-app/blob/main/LICENSE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      license
                    </Link>
                    <Link
                      href="https://docs.basin.global/dossier/formalities/disclaimer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      terms
                    </Link>
                    <Link
                      href="https://docs.basin.global/dossier/formalities/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      privacy
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Padding */}
          <div className="h-8" />
        </div>
      </div>
    </footer>
  )
} 