'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import Link from 'next/link';

// Local storage utils
function setReferral(address: string) {
  localStorage.setItem('referral', address);
}

function getReferral(): string {
  return localStorage.getItem('referral') || '';
}

function clearReferral() {
  localStorage.removeItem('referral');
}

export function ReferralButton() {
  const { user } = usePrivy();
  const [copying, setCopying] = useState(false);
  const searchParams = useSearchParams();
  const [currentReferral, setCurrentReferral] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams) {
      const ref = searchParams.get('ref');
      if (ref) {
        setReferral(ref);
      }
      setCurrentReferral(getReferral());
    }
  }, [searchParams]);

  const generateReferralLink = () => {
    if (user?.wallet?.address) {
      return `${window.location.origin}?ref=${user.wallet.address}`;
    }
    return null;
  };

  const copyToClipboard = async () => {
    const referralLink = generateReferralLink();
    if (referralLink) {
      setCopying(true);
      try {
        await navigator.clipboard.writeText(referralLink);
        const message = 'Turn angst to action by creating place-based resilience! Get your own account...';
        const encodedMessage = encodeURIComponent(message);
        const encodedLink = encodeURIComponent(referralLink);
        
        toast.success(
          <div>
            Referral link copied to clipboard!
            <div className="mt-2">
              Share on:
              <Link 
                href={`https://x.com/intent/tweet?text=${encodedMessage}&url=${encodedLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 ml-2"
              >
                X
              </Link>
              <button
                onClick={() => {
                  window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodedLink, '_blank', 'width=570,height=570');
                  toast.info('Link copied to clipboard. Paste it into your new LinkedIn post.', {
                    autoClose: 5000,
                    closeOnClick: true
                  });
                }}
                className="text-blue-500 hover:text-blue-700 ml-2"
              >
                LinkedIn
              </button>
            </div>
          </div>,
          {
            autoClose: 60000,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            closeButton: true,
          }
        );
      } catch (err) {
        console.error('Failed to copy: ', err);
        toast.error('Failed to copy referral link');
      } finally {
        setCopying(false);
      }
    } else {
      toast.error('Please connect your wallet to generate a referral link');
    }
  };

  if (!user?.wallet?.address) {
    return null;
  }

  return (
    <div>
      <button
        onClick={copyToClipboard}
        disabled={copying}
        className="text-blue-500 hover:text-blue-700 transition duration-300"
      >
        {copying ? 'Copying...' : 'Rewards'}
      </button>
      {currentReferral && currentReferral !== '0x0000000000000000000000000000000000000000' && (
        <p className="text-xs text-gray-400 mt-1">
          Rewards: {`${currentReferral.slice(0, 6)}...${currentReferral.slice(-4)}`}
        </p>
      )}
    </div>
  );
} 