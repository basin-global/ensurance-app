import { ReferralButton } from '@/modules/rewards/RewardsLink';
import { GroupLinks } from '@/modules/groups/GroupLinks';

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <ReferralButton />
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-4">
            <GroupLinks />
          </div>
        </div>
      </div>
    </footer>
  )
} 