import { ReferralButton } from '@/modules/rewards/RewardsLink';
import { GroupLinks } from '@/modules/groups/GroupLinks';
import { BasedOnchain } from '@/components/layout/BasedOnchain';
import { BuiltInPublic } from '@/components/layout/BuiltInPublic';
import { FooterNavigation } from '@/components/layout/FooterNavigation';
import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 mt-auto relative z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col">
          <div className="flex items-center justify-center mb-6">
            <ReferralButton />
          </div>
          <div className="flex items-center justify-center mb-4">
            <FooterNavigation />
          </div>
          <div className="mb-6">
            <GroupLinks />
          </div>
          
          {/* Gradient Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-4" />
          
          {/* Bottom Footer */}
          <div className="max-w-3xl mx-auto w-full">
            <div className="grid grid-cols-3 divide-x divide-gray-800 pt-4">
              <div className="flex items-start justify-end pr-12">
                <BuiltInPublic />
              </div>
              <div className="flex items-center justify-center">
                <Link href="/" className="opacity-50 hover:opacity-100 transition-opacity">
                  <Image
                    src="/assets/logos/basin-blue-circle%20300.png"
                    alt="BASIN"
                    width={50}
                    height={50}
                  />
                </Link>
              </div>
              <div className="flex items-start justify-start pl-12">
                <BasedOnchain />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 