'use client'

import { useEffect } from 'react'
import Script from 'next/script'

export default function FarcasterProvider({
  children
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const initFarcaster = async () => {
      try {
        // @ts-ignore - Farcaster SDK will be available globally
        if (window.sdk) {
          // @ts-ignore
          await window.sdk.actions.ready()
          console.log('Farcaster SDK initialized')
        }
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error)
      }
    }

    initFarcaster()
  }, [])

  return (
    <>
      <Script
        src="https://esm.sh/@farcaster/frame-sdk"
        type="module"
        strategy="beforeInteractive"
        onLoad={() => {
          console.log('Farcaster SDK script loaded')
        }}
      />
      {children}
    </>
  )
} 