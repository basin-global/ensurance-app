'use client'

import { RiskToResilience } from '@/modules/home-page/risk-to-resilience/RiskToResilience'
import { Solution } from '@/modules/home-page/solution/Solution'
import { Truth } from '@/modules/home-page/truth/Truth'
import { Proof } from '@/modules/home-page/proof/Proof'
import { CTA } from '@/modules/home-page/cta/CTA'
import { Ensure } from '@/modules/home-page/ensure/Ensure'
import { useEffect } from 'react'

export default function HomePage() {
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const windowHeight = window.innerHeight
      const header = document.querySelector('header')
      
      if (header) {
        // Add fixed positioning and high z-index only on home page
        header.style.position = 'fixed'
        header.style.top = '0'
        header.style.zIndex = '100'
        
        // Start fading in when we're closer to the Risk section
        if (scrollPosition > windowHeight * 0.7) {
          header.style.opacity = '1'
          header.style.backgroundColor = 'black'
        } else {
          header.style.opacity = '0'
          header.style.backgroundColor = 'transparent'
        }
      }
    }

    // Set initial state
    const header = document.querySelector('header')
    if (header) {
      header.style.position = 'fixed'
      header.style.top = '0'
      header.style.zIndex = '100'
      header.style.opacity = '0'
      header.style.backgroundColor = 'transparent'
    }
    handleScroll()

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      // Clean up styles when leaving home page
      const header = document.querySelector('header')
      if (header) {
        header.style.position = ''
        header.style.top = ''
        header.style.zIndex = ''
        header.style.opacity = ''
        header.style.backgroundColor = ''
      }
    }
  }, [])

  return (
    <main>
      <Ensure />
      <RiskToResilience />
      <Truth />
      <Solution />
      <Proof />
      <CTA />
    </main>
  )
}
