import { ReferralButton } from '@/modules/rewards/RewardsLink';
import { GroupLinks } from '@/modules/groups/GroupLinks';

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 mt-auto relative z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center">
            <ReferralButton />
          </div>
          <GroupLinks />
        </div>
      </div>
    </footer>
  )
} 