'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const lastDismissed = localStorage.getItem('announcementBannerDismissed');
    const shownThisSession = sessionStorage.getItem('announcementBannerShownThisSession');
    
    const shouldShow = !lastDismissed || 
      (Date.now() - parseInt(lastDismissed)) > 7 * 24 * 60 * 60 * 1000 ||
      (!shownThisSession && !lastDismissed);
    
    if (shouldShow) {
      setIsVisible(true);
      sessionStorage.setItem('announcementBannerShownThisSession', 'true');
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('announcementBannerDismissed', Date.now().toString());
    sessionStorage.removeItem('announcementBannerShownThisSession');
  };

  if (!isVisible) return null;

  return (
    <div className="relative bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto py-0.5 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center justify-center">
            <p className="text-[11px] text-gray-400 text-center">
              <span className="inline-flex items-center">
                <span className="mr-1">⚡️</span>
                <span>YOU&apos;RE EARLY - please</span>
                <Link
                  href="https://x.com/ensurance_app"
                  className="ml-1 font-medium text-blue-400 hover:text-blue-300 transition-colors underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  report bugs
                </Link>
                <span className="ml-1">⚡️</span>
              </span>
            </p>
          </div>
          <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-3">
            <button
              type="button"
              onClick={handleDismiss}
              className="-mr-1 flex p-0.5 rounded-md hover:bg-gray-800/50 focus:outline-none focus:ring-1 focus:ring-gray-700 transition-colors"
            >
              <span className="sr-only">Dismiss</span>
              <svg 
                className="h-2.5 w-2.5 text-gray-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 